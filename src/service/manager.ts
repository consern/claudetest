import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ApprovalService } from '../agent/approval.js';
import { runAgentLoop } from '../agent/loop.js';
import { runCommand } from '../cli/commands.js';
import { envSchema, type AppEnv } from '../config/env.js';
import { createProvider } from '../providers/factory.js';
import { appendHistory } from '../session/history.js';
import { loadSession, saveSession } from '../session/store.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolApprovalRequest } from '../types/tool.js';
import type {
  ServiceApproval,
  ServiceProject,
  ServiceStreamEvent,
  ServiceTask,
  ServiceTaskRuntime
} from './types.js';

interface PendingApprovalResolver {
  approval: ServiceApproval;
  resolve: (decision: boolean) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toEventType(event: string): ServiceTaskRuntime['audit'][number]['eventType'] {
  if (event.startsWith('tool_call')) {
    return 'tool_call';
  }
  if (event.startsWith('tool_result')) {
    return 'tool_result';
  }
  if (event.includes('blocked')) {
    return 'blocked';
  }
  return 'tool_result';
}

function message(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: nowIso()
  };
}

export class WorkbenchServiceManager {
  private readonly env: AppEnv;

  private readonly provider;

  private readonly workspaceRoot: string;

  private readonly projects = new Map<string, ServiceProject>();

  private readonly tasks = new Map<string, ServiceTaskRuntime>();

  private readonly pendingApprovals = new Map<string, PendingApprovalResolver>();

  private readonly streamListeners = new Set<(event: ServiceStreamEvent) => void>();

  constructor(envInput: NodeJS.ProcessEnv = process.env) {
    this.env = envSchema.parse(envInput);
    this.provider = createProvider(this.env);
    this.workspaceRoot = resolve(this.env.WORKSPACE_ROOT);
    const project: ServiceProject = {
      id: 'default',
      name: 'Default Workspace',
      rootPath: this.workspaceRoot
    };
    this.projects.set(project.id, project);
  }

  listProjects(): ServiceProject[] {
    return [...this.projects.values()];
  }

  subscribeStream(listener: (event: ServiceStreamEvent) => void): () => void {
    this.streamListeners.add(listener);
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  private emitStream(event: ServiceStreamEvent): void {
    for (const listener of this.streamListeners) {
      try {
        listener(event);
      } catch {
        // ignore a broken subscriber and keep broadcasting
      }
    }
  }

  openProject(input: { name?: string; rootPath: string }): ServiceProject {
    const project: ServiceProject = {
      id: randomUUID(),
      name: input.name?.trim() || `Project ${this.projects.size + 1}`,
      rootPath: resolve(input.rootPath)
    };
    this.projects.set(project.id, project);
    return project;
  }

  listTasks(): ServiceTask[] {
    return [...this.tasks.values()]
      .map((row) => row.task)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getTask(id: string): ServiceTaskRuntime | null {
    return this.tasks.get(id) ?? null;
  }

  async startTask(input: {
    title: string;
    mode?: ServiceTask['mode'];
    projectId?: string;
    sessionId?: string;
  }): Promise<ServiceTask> {
    const projectId = input.projectId && this.projects.has(input.projectId) ? input.projectId : 'default';
    const task: ServiceTask = {
      id: randomUUID(),
      title: input.title,
      status: 'queued',
      mode: input.mode ?? (input.title.startsWith('/feature') ? 'feature-dev' : 'normal'),
      projectId,
      sessionId: input.sessionId ?? randomUUID(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    const runtime: ServiceTaskRuntime = {
      task,
      history: [],
      toolEvents: [],
      telemetry: {
        round: 0,
        activeMode: task.mode,
        maxIterations: 8
      },
      workflowState: undefined,
      audit: []
    };
    this.tasks.set(task.id, runtime);
    this.emitStream({
      type: 'task_state',
      taskId: task.id,
      timestamp: nowIso(),
      payload: { status: task.status, mode: task.mode }
    });
    void this.runTask(runtime);
    return task;
  }

  async cancelTask(id: string): Promise<ServiceTask | null> {
    const runtime = this.tasks.get(id);
    if (!runtime) {
      return null;
    }
    runtime.task.status = 'failed';
    runtime.task.updatedAt = nowIso();
    runtime.audit.push({
      timestamp: nowIso(),
      eventType: 'blocked',
      summary: 'Task cancelled by user'
    });
    this.emitStream({
      type: 'audit_event',
      taskId: runtime.task.id,
      timestamp: nowIso(),
      payload: { summary: 'Task cancelled by user' }
    });
    this.emitStream({
      type: 'task_state',
      taskId: runtime.task.id,
      timestamp: nowIso(),
      payload: { status: runtime.task.status, mode: runtime.task.mode }
    });
    return runtime.task;
  }

  async resumeTask(id: string): Promise<ServiceTask | null> {
    const runtime = this.tasks.get(id);
    if (!runtime || runtime.task.status === 'running') {
      return runtime?.task ?? null;
    }
    runtime.task.status = 'queued';
    runtime.task.updatedAt = nowIso();
    this.emitStream({
      type: 'task_state',
      taskId: runtime.task.id,
      timestamp: nowIso(),
      payload: { status: runtime.task.status, mode: runtime.task.mode }
    });
    void this.runTask(runtime);
    return runtime.task;
  }

  listApprovals(): ServiceApproval[] {
    return [...this.pendingApprovals.values()]
      .map((row) => row.approval)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  approve(id: string): boolean {
    const pending = this.pendingApprovals.get(id);
    if (!pending) {
      return false;
    }
    this.pendingApprovals.delete(id);
    pending.resolve(true);
    this.emitStream({
      type: 'approval_resolved',
      taskId: pending.approval.taskId,
      timestamp: nowIso(),
      payload: { approvalId: id, decision: 'approve' }
    });
    return true;
  }

  reject(id: string): boolean {
    const pending = this.pendingApprovals.get(id);
    if (!pending) {
      return false;
    }
    this.pendingApprovals.delete(id);
    pending.resolve(false);
    this.emitStream({
      type: 'approval_resolved',
      taskId: pending.approval.taskId,
      timestamp: nowIso(),
      payload: { approvalId: id, decision: 'reject' }
    });
    return true;
  }

  async listSessions(): Promise<Array<{ id: string; path: string }>> {
    try {
      const rows = await readdir(this.env.SESSION_DIR, { withFileTypes: true });
      return rows
        .filter((item) => item.isFile() && item.name.endsWith('.json'))
        .map((item) => ({
          id: item.name.slice(0, -5),
          path: resolve(this.env.SESSION_DIR, item.name)
        }));
    } catch {
      return [];
    }
  }

  async getSession(id: string): Promise<unknown | null> {
    return loadSession(this.env.SESSION_DIR, id);
  }

  listReviews(): Array<{
    taskId: string;
    fixNow: number;
    fixLater: number;
    ignore: number;
    lifecycle: number;
  }> {
    return [...this.tasks.values()]
      .filter((row) => row.workflowState)
      .map((row) => ({
        taskId: row.task.id,
        fixNow: row.workflowState?.decisionBuckets.fixNow.length ?? 0,
        fixLater: row.workflowState?.decisionBuckets.fixLater.length ?? 0,
        ignore: row.workflowState?.decisionBuckets.ignore.length ?? 0,
        lifecycle: row.workflowState?.findingLifecycle.length ?? 0
      }));
  }

  getReview(taskId: string): ServiceTaskRuntime | null {
    const row = this.tasks.get(taskId);
    return row?.workflowState ? row : null;
  }

  markReviewRework(taskId: string): boolean {
    const row = this.tasks.get(taskId);
    if (!row?.workflowState) {
      return false;
    }
    row.task.mode = 'rework';
    row.task.status = 'reviewing';
    row.task.updatedAt = nowIso();
    this.emitStream({
      type: 'review_rework',
      taskId: row.task.id,
      timestamp: nowIso(),
      payload: { mode: row.task.mode, status: row.task.status }
    });
    this.emitStream({
      type: 'task_state',
      taskId: row.task.id,
      timestamp: nowIso(),
      payload: { status: row.task.status, mode: row.task.mode }
    });
    return true;
  }

  getTaskState(id: string): unknown | null {
    const row = this.tasks.get(id);
    if (!row) {
      return null;
    }
    return {
      id: row.task.id,
      title: row.task.title,
      status: row.task.status,
      mode: row.task.mode,
      projectId: row.task.projectId,
      sessionId: row.task.sessionId,
      workflowState: row.workflowState
        ? {
            activePhase: row.telemetry.activePhase,
            implementationSteps: row.workflowState.selectedPlan?.implementationSteps ?? [],
            currentStepId: row.workflowState.currentStepId,
            blockedReason: row.workflowState.blockedReason,
            decisionBuckets: row.workflowState.decisionBuckets,
            findingLifecycle: row.workflowState.findingLifecycle
          }
        : undefined
    };
  }

  getTelemetry(id: string): unknown | null {
    return this.tasks.get(id)?.telemetry ?? null;
  }

  getAudit(id: string): unknown | null {
    const row = this.tasks.get(id);
    if (!row) {
      return null;
    }
    return {
      taskId: id,
      events: [...row.audit, ...(row.workflowState?.auditEvents ?? [])]
    };
  }

  private async runTask(runtime: ServiceTaskRuntime): Promise<void> {
    runtime.task.status = 'running';
    runtime.task.updatedAt = nowIso();
    this.emitStream({
      type: 'task_state',
      taskId: runtime.task.id,
      timestamp: nowIso(),
      payload: { status: runtime.task.status, mode: runtime.task.mode }
    });
    const approval = new ApprovalService((request: ToolApprovalRequest) =>
      new Promise<boolean>((resolveApproval) => {
        const approvalRow: ServiceApproval = {
          id: randomUUID(),
          taskId: runtime.task.id,
          kind: request.kind,
          title: request.title,
          detail: request.detail,
          createdAt: nowIso()
        };
        this.pendingApprovals.set(approvalRow.id, {
          approval: approvalRow,
          resolve: (decision) => {
            resolveApproval(decision);
          }
        });
        this.emitStream({
          type: 'approval_added',
          taskId: runtime.task.id,
          timestamp: nowIso(),
          payload: {
            approvalId: approvalRow.id,
            kind: approvalRow.kind,
            title: approvalRow.title
          }
        });
      })
    );

    try {
      const userMsg = message('user', runtime.task.title);
      runtime.history = appendHistory(runtime.history, userMsg);
      this.emitStream({
        type: 'task_state',
        taskId: runtime.task.id,
        timestamp: nowIso(),
        payload: { historySize: runtime.history.length }
      });
      const toolContext = {
        approval,
        workspaceRoot: this.workspaceRoot,
        readMaxBytes: this.env.READ_MAX_BYTES,
        shellEnabled: this.env.SHELL_ENABLED,
        writeEnabled: this.env.WRITE_ENABLED
      };
      const commandOut = await runCommand(runtime.task.title, toolContext);
      if (commandOut !== null) {
        runtime.history = appendHistory(runtime.history, message('assistant', commandOut));
        runtime.task.status = 'completed';
        runtime.task.updatedAt = nowIso();
        this.emitStream({
          type: 'task_state',
          taskId: runtime.task.id,
          timestamp: nowIso(),
          payload: { status: runtime.task.status, mode: runtime.task.mode }
        });
      } else {
        const result = await runAgentLoop({
          userText: runtime.task.title,
          history: runtime.history,
          provider: this.provider,
          model: this.env.MODEL_NAME,
          toolContext,
          cwd: this.workspaceRoot,
          maxIterations: 8,
          onToolEvent: (event) => {
            runtime.toolEvents.push(event);
            runtime.audit.push({
              timestamp: nowIso(),
              eventType: toEventType(event),
              summary: event
            });
            this.emitStream({
              type: 'tool_event',
              taskId: runtime.task.id,
              timestamp: nowIso(),
              payload: { event }
            });
            this.emitStream({
              type: 'audit_event',
              taskId: runtime.task.id,
              timestamp: nowIso(),
              payload: { eventType: toEventType(event), summary: event }
            });
          },
          onTelemetry: (telemetry) => {
            runtime.telemetry = telemetry;
            this.emitStream({
              type: 'telemetry',
              taskId: runtime.task.id,
              timestamp: nowIso(),
              payload: {
                activePhase: telemetry.activePhase,
                activeTool: telemetry.activeTool,
                activeSubagent: telemetry.activeSubagent,
                activeImplementationStep: telemetry.activeImplementationStep,
                blockedReason: telemetry.blockedReason,
                round: telemetry.round
              }
            });
          }
        });
        runtime.history = appendHistory(runtime.history, message('assistant', result.text));
        runtime.workflowState = result.workflowState;
        if (result.telemetry) {
          runtime.telemetry = result.telemetry;
        }
        runtime.task.mode = runtime.telemetry.activeMode;
        runtime.task.status =
          runtime.telemetry.blockedReason || runtime.workflowState?.blockedReason
            ? 'blocked'
            : runtime.task.mode === 'rework' ||
                runtime.workflowState?.findingLifecycle.some((row) => row.status === 'in_rework')
              ? 'reviewing'
              : 'completed';
        runtime.task.updatedAt = nowIso();
        this.emitStream({
          type: 'task_state',
          taskId: runtime.task.id,
          timestamp: nowIso(),
          payload: { status: runtime.task.status, mode: runtime.task.mode }
        });
      }

      await saveSession(this.env.SESSION_DIR, {
        id: runtime.task.sessionId,
        cwd: this.workspaceRoot,
        providerName: this.provider.name,
        modelName: this.env.MODEL_NAME,
        messages: runtime.history,
        createdAt: runtime.task.createdAt,
        updatedAt: nowIso()
      });
    } catch (error) {
      runtime.task.status = 'failed';
      runtime.task.updatedAt = nowIso();
      runtime.audit.push({
        timestamp: nowIso(),
        eventType: 'blocked',
        summary: `Task failed: ${error instanceof Error ? error.message : String(error)}`
      });
      this.emitStream({
        type: 'audit_event',
        taskId: runtime.task.id,
        timestamp: nowIso(),
        payload: {
          eventType: 'blocked',
          summary: `Task failed: ${error instanceof Error ? error.message : String(error)}`
        }
      });
      this.emitStream({
        type: 'task_state',
        taskId: runtime.task.id,
        timestamp: nowIso(),
        payload: { status: runtime.task.status, mode: runtime.task.mode }
      });
    }
  }
}
