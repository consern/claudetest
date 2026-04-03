export type AgentMode = 'chat' | 'feature-dev';

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

