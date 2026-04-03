import type { FeatureDevPhase } from './agent.js';

export type ReviewCategory = 'bug' | 'security' | 'guideline' | 'performance';
export type FindingStatus = 'open' | 'in_rework' | 'resolved' | 'dropped';

export interface ReviewFinding {
  id: string;
  title: string;
  whyItMatters: string;
  evidence: string;
  relatedPaths: string[];
  confidence: number;
  category: ReviewCategory;
}

export interface ImplementationStep {
  id: string;
  description: string;
  targetFiles: string[];
  repairGoal?: string;
  status: 'pending' | 'running' | 'done' | 'blocked';
}

export interface StepExecutionResult {
  stepId: string;
  attemptedFiles: string[];
  patchesProposed: number;
  writesApplied: number;
  blockedReason?: string;
  summary: string;
}

export interface ReworkStepContext {
  sourceFindings: ReviewFinding[];
  relatedFiles: string[];
  repairGoal: string;
}

export interface FindingLifecycle {
  findingId: string;
  title: string;
  status: FindingStatus;
  sourcePhase: 'review' | 'rework-review';
  relatedFiles: string[];
  linkedStepIds: string[];
  resolutionNote?: string;
  lastReviewedAt?: string;
}

export interface AuditEvent {
  timestamp: string;
  mode: string;
  phase?: string;
  stepId?: string;
  eventType:
    | 'tool_call'
    | 'tool_result'
    | 'review_finding'
    | 'rework_created'
    | 'finding_resolved'
    | 'blocked';
  summary: string;
}

export interface ArchitecturePlan {
  summary: string;
  recommendedApproach: string;
  filesToModify: string[];
  filesToCreate: string[];
  implementationSteps: ImplementationStep[];
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
  currentStepId?: string;
  stepExecutionResults: StepExecutionResult[];
  reviewFindings: ReviewFinding[];
  decisionBuckets: {
    fixNow: ReviewFinding[];
    fixLater: ReviewFinding[];
    ignore: ReviewFinding[];
  };
  blockedReason?: string;
  findingLifecycle: FindingLifecycle[];
  auditEvents: AuditEvent[];
  subagentStatus: Array<{
    role: 'code-explorer' | 'code-architect' | 'code-reviewer';
    status: 'done' | 'degraded' | 'failed';
    confidence?: number;
    summary: string;
    error?: string;
    retryCount?: number;
    failureStage?: string;
  }>;
}

export interface WorkflowDisplayNote {
  phase: FeatureDevPhase;
  note: string;
}

export interface FeatureDevWorkflowResult {
  notes: WorkflowDisplayNote[];
  state: FeatureDevState;
  phaseHistory: FeatureDevPhase[];
  phaseStatus: Record<FeatureDevPhase, 'pending' | 'active' | 'done' | 'blocked'>;
  activeSubagentHistory: string[];
  actionableNextSteps: string[];
}
