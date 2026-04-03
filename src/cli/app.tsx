import 'dotenv/config';
import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { envSchema } from '../config/env.js';
import { createProvider } from '../providers/factory.js';
import type { ChatMessage } from '../types/message.js';
import type { ToolApprovalRequest } from '../types/tool.js';
import type { LoopTelemetry, FeatureDevPhase } from '../types/agent.js';
import type { FeatureDevState } from '../types/workflow.js';
import type { TaskRecord, WorkbenchPage, WorkbenchUiState } from '../types/workbench.js';
import { ChatView } from '../ui/ChatView.js';
import { InputBox } from '../ui/InputBox.js';
import { StatusBar } from '../ui/StatusBar.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { ToolEventView } from '../ui/ToolEventView.js';
import { ReviewPanel } from '../ui/ReviewPanel.js';
import { PhaseTracker } from '../ui/PhaseTracker.js';
import { SubagentPanel } from '../ui/SubagentPanel.js';
import { CurrentActionView } from '../ui/CurrentActionView.js';
import { DecisionBucketsView } from '../ui/DecisionBucketsView.js';
import { TaskSidebar } from '../ui/TaskSidebar.js';
import { ImplementationStepsPanel } from '../ui/ImplementationStepsPanel.js';
import { AuditTimelineView } from '../ui/AuditTimelineView.js';
import { ReviewReworkWorkspace } from '../ui/ReviewReworkWorkspace.js';
import { HomeComposer } from '../ui/HomeComposer.js';
import { runAgentLoop } from '../agent/loop.js';
import { saveSession } from '../session/store.js';
import { appendHistory } from '../session/history.js';
import { ApprovalService } from '../agent/approval.js';
import { runCommand } from './commands.js';

const env = envSchema.parse(process.env);
const cwd = resolve(env.WORKSPACE_ROOT);

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

interface PendingApproval {
  request: ToolApprovalRequest;
  resolve: (value: boolean) => void;
}

export function App(): React.JSX.Element {
  const { exit } = useApp();
  const provider = useMemo(() => createProvider(env), []);
  const sessionId = useMemo(() => randomUUID(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolEvents, setToolEvents] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [pendingAssistant, setPendingAssistant] = useState('');
  const [telemetry, setTelemetry] = useState<LoopTelemetry>({
    activeMode: 'normal',
    round: 0,
    maxIterations: 0
  });
  const [workflowState, setWorkflowState] = useState<FeatureDevState | undefined>(undefined);
  const [phaseStatus, setPhaseStatus] = useState<
    Partial<Record<FeatureDevPhase, 'pending' | 'active' | 'done' | 'blocked'>>
  >({});
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  const approval = useMemo(
    () =>
      new ApprovalService((request) =>
        new Promise<boolean>((resolveApproval) => {
          setPendingApproval({ request, resolve: resolveApproval });
        })
      ),
    []
  );

  const toolContext = useMemo(
    () => ({
      approval,
      workspaceRoot: cwd,
      readMaxBytes: env.READ_MAX_BYTES,
      shellEnabled: env.SHELL_ENABLED,
      writeEnabled: env.WRITE_ENABLED
    }),
    [approval]
  );

  async function persist(nextMessages: ChatMessage[]): Promise<void> {
    await saveSession(env.SESSION_DIR, {
      id: sessionId,
      cwd,
      providerName: provider.name,
      modelName: env.MODEL_NAME,
      messages: nextMessages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  useInput((inputKey, key) => {
    void (async () => {
      if (key.ctrl && inputKey.toLowerCase() === 'c') {
        exit();
        return;
      }

      if (pendingApproval) {
        if (inputKey.toLowerCase() === 'y') {
          pendingApproval.resolve(true);
          setPendingApproval(null);
        }
        if (inputKey.toLowerCase() === 'n') {
          pendingApproval.resolve(false);
          setPendingApproval(null);
        }
        return;
      }

      if (key.return) {
        const text = input.trim();
        setInput('');
        if (!text) {
          return;
        }

        const userMsg = makeMessage('user', text);
        const taskId = randomUUID();
        const task: TaskRecord = {
          id: taskId,
          title: text,
          mode: text.startsWith('/feature') ? 'feature-dev' : 'normal',
          status: 'running',
          updatedAt: new Date().toISOString()
        };
        setTasks((prev) => [task, ...prev].slice(0, 20));
        const nextHistory = appendHistory(messages, userMsg);
        setMessages(nextHistory);
        setStreaming(true);
        setPendingAssistant('');
        setToolEvents([]);
        setWorkflowState(undefined);
        setPhaseStatus({});

        try {
          const commandOut = await runCommand(text, toolContext);
          if (commandOut !== null) {
            const assistant = makeMessage('assistant', commandOut);
            const withAssistant = appendHistory(nextHistory, assistant);
            setMessages(withAssistant);
            setTasks((prev) =>
              prev.map((row) =>
                row.id === taskId
                  ? { ...row, status: 'completed', updatedAt: new Date().toISOString() }
                  : row
              )
            );
            await persist(withAssistant);
            return;
          }

          const result = await runAgentLoop({
            userText: text,
            history: nextHistory,
            provider,
            model: env.MODEL_NAME,
            toolContext,
            cwd,
            maxIterations: 8,
            onTextChunk: (chunk) => setPendingAssistant((prev) => prev + chunk),
            onToolEvent: (event) => setToolEvents((prev) => [...prev, event]),
            onTelemetry: (nextTelemetry) => setTelemetry(nextTelemetry)
          });

          const assistant = makeMessage('assistant', result.text);
          const withAssistant = appendHistory(nextHistory, assistant);
          setMessages(withAssistant);
          setToolEvents((prev) => [...prev, ...result.toolEvents]);
          setWorkflowState(result.workflowState);
          if (result.phaseStatus) {
            setPhaseStatus(result.phaseStatus);
          }
          if (result.telemetry) {
            setTelemetry(result.telemetry);
          }
          setTasks((prev) =>
            prev.map((row) => {
              if (row.id !== taskId) {
                return row;
              }
              const status: TaskRecord['status'] =
                result.telemetry?.blockedReason
                  ? 'blocked'
                  : result.workflowState?.findingLifecycle.some((f) => f.status === 'in_rework')
                    ? 'reviewing'
                    : 'completed';
              return { ...row, status, mode: result.telemetry?.activeMode ?? row.mode, updatedAt: new Date().toISOString() };
            })
          );
          await persist(withAssistant);
        } catch (error) {
          const errText = error instanceof Error ? error.message : String(error);
          const assistant = makeMessage('assistant', `Execution failed: ${errText}`);
          const withAssistant = appendHistory(nextHistory, assistant);
          setMessages(withAssistant);
          setTasks((prev) =>
            prev.map((row) =>
              row.id === taskId
                ? { ...row, status: 'failed', updatedAt: new Date().toISOString() }
                : row
            )
          );
          setTelemetry((prev) => ({ ...prev, lastError: errText }));
          await persist(withAssistant);
        } finally {
          setPendingAssistant('');
          setStreaming(false);
        }

        return;
      }

      if (key.backspace || key.delete) {
        setInput((v) => v.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && inputKey.length > 0) {
        setInput((v) => v + inputKey);
      }
    })();
  });

  const displayMessages =
    streaming && pendingAssistant
      ? [
          ...messages,
          {
            id: 'pending',
            role: 'assistant' as const,
            content: pendingAssistant,
            createdAt: new Date().toISOString()
          }
        ]
      : messages;

  const uiState: WorkbenchUiState =
    !streaming && messages.length === 0 && !workflowState
      ? 'idle'
      : workflowState?.findingLifecycle.some(
            (item) => item.status === 'in_rework' || item.status === 'resolved' || item.status === 'open'
          ) || telemetry.activeMode === 'review' || telemetry.activeMode === 'rework'
        ? 'review-rework'
        : 'execution';
  const page: WorkbenchPage =
    uiState === 'idle' ? 'Home' : uiState === 'review-rework' ? 'Reviews' : 'Tasks';
  const inRework = Boolean(workflowState?.currentStepId?.startsWith('rework-'));

  if (uiState === 'idle') {
    return (
      <Box flexDirection='column'>
        <Text color='cyan'>Terminal Coding Client</Text>
        <StatusBar
          provider={provider.name}
          model={env.MODEL_NAME}
          cwd={cwd}
          sessionId={sessionId}
          streaming={streaming}
        />
        <Text dimColor>Pages: Home | Projects | Tasks | Sessions | Reviews | Automations | Settings</Text>
        <HomeComposer
          currentProject={cwd}
          recentTasks={tasks.slice(0, 3).map((task) => task.title.slice(0, 20))}
          recentSessions={[sessionId.slice(0, 8)]}
          input={input}
        />
        <InputBox value={input} disabled={pendingApproval !== null} />
      </Box>
    );
  }

  if (uiState === 'review-rework') {
    return (
      <Box flexDirection='column'>
        <Text color='cyan'>Terminal Coding Client</Text>
        <StatusBar
          provider={provider.name}
          model={env.MODEL_NAME}
          cwd={cwd}
          sessionId={sessionId}
          streaming={streaming}
        />
        <Text dimColor>
          Page: {page} | state={uiState}
        </Text>
        <ReviewReworkWorkspace workflowState={workflowState} />
        <ToolEventView events={toolEvents} />
        {pendingApproval ? <ConfirmDialog request={pendingApproval.request} /> : null}
        <InputBox value={input} disabled={streaming || pendingApproval !== null} />
      </Box>
    );
  }

  return (
    <Box flexDirection='column'>
      <Text color='cyan'>Terminal Coding Client</Text>
      <StatusBar
        provider={provider.name}
        model={env.MODEL_NAME}
        cwd={cwd}
        sessionId={sessionId}
        streaming={streaming}
      />
      <Text dimColor>
        Page: {page} | state={uiState}
      </Text>
      <Box>
        <TaskSidebar projectName={cwd} sessionId={sessionId} tasks={tasks} />
        <Box flexDirection='column' marginLeft={1} width={70}>
          <ChatView messages={displayMessages} />
          <ToolEventView events={toolEvents} />
          <AuditTimelineView workflowState={workflowState} />
        </Box>
        <Box flexDirection='column' marginLeft={1} width={58}>
          <CurrentActionView
            activeMode={telemetry.activeMode}
            round={telemetry.round}
            maxIterations={telemetry.maxIterations}
            activePhase={telemetry.activePhase}
            activeTool={telemetry.activeTool}
            activeSubagent={telemetry.activeSubagent}
            activeImplementationStep={telemetry.activeImplementationStep}
            activeStepExecutionSummary={telemetry.activeStepExecutionSummary}
            lastWriteResult={telemetry.lastWriteResult}
            lastReviewDecision={telemetry.lastReviewDecision}
            blockedReason={telemetry.blockedReason}
          />
          <PhaseTracker
            currentPhase={telemetry.activePhase}
            phaseStatus={phaseStatus}
            blockedReason={telemetry.blockedReason}
            inRework={inRework}
          />
          <ImplementationStepsPanel workflowState={workflowState} />
          <SubagentPanel activeSubagent={telemetry.activeSubagent} workflowState={workflowState} />
          <DecisionBucketsView workflowState={workflowState} />
        </Box>
      </Box>
      {pendingApproval ? <ConfirmDialog request={pendingApproval.request} /> : null}
      <ReviewPanel lines={['Prioritize high-signal findings.', 'Prefer minimal, reviewable diffs.']} />
      <InputBox value={input} disabled={streaming || pendingApproval !== null} />
      <Text dimColor>
        Commands: /read &lt;path&gt; | /search &lt;query&gt; | /write &lt;path&gt;::&lt;content&gt; | /shell &lt;cmd&gt; | /feature &lt;task&gt;
      </Text>
    </Box>
  );
}
