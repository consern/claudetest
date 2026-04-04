export type AgentMode = 'normal' | 'feature-dev' | 'review' | 'patch' | 'rework';

export interface ApiProject {
  id: string;
  name: string;
  rootPath: string;
}

export interface ApiTask {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'blocked' | 'reviewing' | 'completed' | 'failed';
  mode: AgentMode;
  projectId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTaskRuntime {
  task: ApiTask;
  toolEvents: string[];
  telemetry: {
    round: number;
    activeMode: AgentMode;
    activePhase?: string;
    activeSubagent?: string;
    activeTool?: string;
    activeImplementationStep?: string;
    blockedReason?: string;
    maxIterations: number;
    lastWriteResult?: string;
    lastReviewDecision?: string;
  };
  workflowState?: {
    currentStepId?: string;
    decisionBuckets: {
      fixNow: Array<{ id: string; title: string; category: string; confidence: number; whyItMatters: string; evidence: string; relatedPaths: string[] }>;
      fixLater: Array<{ id: string; title: string; category: string; confidence: number; whyItMatters: string; evidence: string; relatedPaths: string[] }>;
      ignore: Array<{ id: string; title: string; category: string; confidence: number; whyItMatters: string; evidence: string; relatedPaths: string[] }>;
    };
    findingLifecycle: Array<{
      findingId: string;
      title: string;
      status: 'open' | 'in_rework' | 'resolved' | 'dropped';
      relatedFiles: string[];
      linkedStepIds: string[];
      resolutionNote?: string;
    }>;
    stepExecutionResults: Array<{
      stepId: string;
      summary: string;
      writesApplied: number;
      patchesProposed: number;
    }>;
    subagentStatus: Array<{
      role: string;
      status: string;
      confidence?: number;
      summary: string;
      retryCount?: number;
    }>;
  };
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
  history: Array<{ id: string; role: string; content: string; createdAt: string }>;
}

export interface ApiApproval {
  id: string;
  taskId: string;
  kind: 'write' | 'shell' | 'risk-edit';
  title: string;
  detail: string;
  createdAt: string;
}
