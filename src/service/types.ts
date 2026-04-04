import type { AgentMode, LoopTelemetry } from '../types/agent.js';
import type { ChatMessage } from '../types/message.js';
import type { FeatureDevState } from '../types/workflow.js';

export interface ServiceProject {
  id: string;
  name: string;
  rootPath: string;
}

export interface ServiceTask {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'blocked' | 'reviewing' | 'completed' | 'failed';
  mode: AgentMode;
  projectId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceApproval {
  id: string;
  taskId: string;
  kind: 'write' | 'shell' | 'risk-edit';
  title: string;
  detail: string;
  createdAt: string;
}

export interface ServiceTaskRuntime {
  task: ServiceTask;
  history: ChatMessage[];
  toolEvents: string[];
  telemetry: LoopTelemetry;
  workflowState?: FeatureDevState;
  audit: Array<{
    timestamp: string;
    eventType:
      | 'tool_call'
      | 'tool_result'
      | 'review_finding'
      | 'rework_created'
      | 'finding_resolved'
      | 'blocked';
    summary: string;
  }>;
}

export type ServiceStreamEventType =
  | 'task_state'
  | 'telemetry'
  | 'tool_event'
  | 'audit_event'
  | 'approval_added'
  | 'approval_resolved'
  | 'review_rework';

export interface ServiceStreamEvent {
  type: ServiceStreamEventType;
  taskId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
