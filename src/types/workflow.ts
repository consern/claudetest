import type { FeatureDevPhase } from './agent.js';

export type ReviewCategory = 'bug' | 'security' | 'guideline' | 'performance';

export interface ReviewFinding {
  title: string;
  whyItMatters: string;
  evidence: string;
  confidence: number;
  category: ReviewCategory;
}

export interface ArchitecturePlan {
  recommendedApproach: string;
  filesToModify: string[];
  filesToCreate: string[];
  implementationSteps: string[];
  tradeoffs: string[];
  confidence: number;
}

export interface FeatureDevState {
  task: string;
  todo: string[];
  exploredFiles: string[];
  clarifyingQuestions: string[];
  selectedPlan?: ArchitecturePlan;
  approvalGranted: boolean;
  implementationTargets: string[];
  reviewFindings: ReviewFinding[];
  decisionBuckets: {
    fixNow: ReviewFinding[];
    fixLater: ReviewFinding[];
    ignore: ReviewFinding[];
  };
}

export interface WorkflowDisplayNote {
  phase: FeatureDevPhase;
  note: string;
}

export interface FeatureDevWorkflowResult {
  notes: WorkflowDisplayNote[];
  state: FeatureDevState;
  phaseHistory: FeatureDevPhase[];
  activeSubagentHistory: string[];
}

