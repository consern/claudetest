export type AgentMode = 'normal' | 'feature-dev' | 'review' | 'patch' | 'rework';

export type FeatureDevPhase =
  | 'discovery'
  | 'exploration'
  | 'clarification'
  | 'architecture'
  | 'approval'
  | 'implementation'
  | 'review'
  | 'summary';

export interface AgentPlan {
  mode: AgentMode;
  phases: FeatureDevPhase[];
}

export interface LoopTelemetry {
  round: number;
  activeMode: AgentMode;
  activePhase?: FeatureDevPhase;
  activeSubagent?: string;
  activeTool?: string;
  activeImplementationStep?: string;
  activeStepExecutionSummary?: string;
  lastWriteResult?: string;
  lastReviewDecision?: string;
  lastError?: string;
  blockedReason?: string;
  maxIterations: number;
}
