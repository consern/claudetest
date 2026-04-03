import type { ModelProvider } from '../providers/base.js';
import type { ToolContext } from '../tools/types.js';
import { executeToolByName } from '../tools/toolRegistry.js';
import type { FeatureDevPhase } from '../types/agent.js';
import type {
  FeatureDevState,
  FeatureDevWorkflowResult,
  ReviewFinding,
  WorkflowDisplayNote
} from '../types/workflow.js';
import { featureDevPrompt } from './prompts/featureDev.js';
import { codeExplorerTask } from './subagents/codeExplorer.js';
import { codeArchitectTask } from './subagents/codeArchitect.js';
import { codeReviewerTask } from './subagents/codeReviewer.js';
import { toArchitecturePlan } from './subagents/shared.js';

function uniqueNonEmpty(items: string[]): string[] {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function summarizeFindings(findings: ReviewFinding[]): string {
  if (findings.length === 0) {
    return 'none';
  }
  return findings.map((f) => `${f.title}(${f.category},${Math.round(f.confidence * 100)}%)`).join('; ');
}

function bucketReviewFindings(findings: ReviewFinding[]): FeatureDevState['decisionBuckets'] {
  const fixNow: ReviewFinding[] = [];
  const fixLater: ReviewFinding[] = [];
  const ignore: ReviewFinding[] = [];

  for (const finding of findings) {
    if (
      (finding.category === 'security' && finding.confidence >= 0.75) ||
      ((finding.category === 'bug' || finding.category === 'performance') &&
        finding.confidence >= 0.8)
    ) {
      fixNow.push(finding);
      continue;
    }
    if (finding.confidence >= 0.65) {
      fixLater.push(finding);
      continue;
    }
    ignore.push(finding);
  }
  return { fixNow, fixLater, ignore };
}

function createPhaseStatus(active: FeatureDevPhase): FeatureDevWorkflowResult['phaseStatus'] {
  const status: FeatureDevWorkflowResult['phaseStatus'] = {
    discovery: 'pending',
    exploration: 'pending',
    clarification: 'pending',
    architecture: 'pending',
    approval: 'pending',
    implementation: 'pending',
    review: 'pending',
    summary: 'pending'
  };
  status[active] = 'active';
  return status;
}

export async function runFeatureDevWorkflow(input: {
  task: string;
  provider: ModelProvider;
  model: string;
  toolContext: ToolContext;
  onToolEvent?: (event: string) => void;
  onPhase?: (phase: FeatureDevPhase) => void;
  onActiveSubagent?: (name: string) => void;
  onImplementationStep?: (stepId: string, status: 'pending' | 'running' | 'done' | 'blocked') => void;
  onBlocked?: (reason: string) => void;
}): Promise<FeatureDevWorkflowResult> {
  const notes: WorkflowDisplayNote[] = [];
  const phaseHistory: FeatureDevPhase[] = [];
  const activeSubagentHistory: string[] = [];
  const phaseStatus = createPhaseStatus('discovery');
  const actionableNextSteps: string[] = [];

  const state: FeatureDevState = {
    task: input.task,
    todo: [
      'Discover constraints and acceptance criteria',
      'Explore entry points and concrete files',
      'Select one architecture plan',
      'Request approval gate before implementation',
      'Execute implementation steps',
      'Run precision review and bucket findings'
    ],
    exploredFiles: [],
    clarifyingQuestions: [],
    approvalGranted: false,
    implementationTargets: [],
    currentStepId: undefined,
    reviewFindings: [],
    decisionBuckets: { fixNow: [], fixLater: [], ignore: [] },
    blockedReason: undefined,
    subagentStatus: []
  };

  const enterPhase = (phase: FeatureDevPhase): void => {
    phaseHistory.push(phase);
    Object.keys(phaseStatus).forEach((key) => {
      const p = key as FeatureDevPhase;
      if (phaseStatus[p] === 'active') {
        phaseStatus[p] = 'done';
      }
    });
    phaseStatus[phase] = 'active';
    input.onPhase?.(phase);
  };

  const trackSubagent = (name: string): void => {
    activeSubagentHistory.push(name);
    input.onActiveSubagent?.(name);
  };

  enterPhase('discovery');
  notes.push({
    phase: 'discovery',
    note:
      `feature-dev prompt loaded\n${featureDevPrompt}\n` +
      `todo:\n${state.todo.map((t) => `- ${t}`).join('\n')}`
  });

  enterPhase('exploration');
  trackSubagent('code-explorer');
  const [explorerA, explorerB] = await Promise.all([
    codeExplorerTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [explore A]`
    }),
    codeExplorerTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [explore B]`
    })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-explorer',
      status: explorerA.degraded ? 'degraded' : 'done',
      confidence: explorerA.confidence,
      summary: explorerA.summary,
      error: explorerA.error
    },
    {
      role: 'code-explorer',
      status: explorerB.degraded ? 'degraded' : 'done',
      confidence: explorerB.confidence,
      summary: explorerB.summary,
      error: explorerB.error
    }
  );

  state.exploredFiles = uniqueNonEmpty([
    ...explorerA.suggestedFiles,
    ...explorerB.suggestedFiles,
    ...explorerA.relevantPaths,
    ...explorerB.relevantPaths
  ]).slice(0, 10);

  notes.push({
    phase: 'exploration',
    note:
      `explorer summaries:\n- ${explorerA.summary}\n- ${explorerB.summary}\n` +
      `entry points:\n- ${[...explorerA.entryPoints, ...explorerB.entryPoints].join('\n- ') || 'none'}\n` +
      `suggested files: ${state.exploredFiles.join(', ') || 'none'}`
  });

  for (const file of state.exploredFiles.slice(0, 4)) {
    input.onToolEvent?.(`feature-dev read_file: ${file}`);
    const read = await executeToolByName('read_file', { path: file }, input.toolContext);
    input.onToolEvent?.(`feature-dev read_file result: ${read.summary}`);
  }

  enterPhase('clarification');
  if (state.exploredFiles.length === 0) {
    state.clarifyingQuestions.push(
      'No files discovered during exploration. Should we expand glob patterns?'
    );
    state.blockedReason = state.clarifyingQuestions[0];
  }
  notes.push({
    phase: 'clarification',
    note:
      state.clarifyingQuestions.length === 0
        ? 'No blocking ambiguity. Proceed with architecture.'
        : state.clarifyingQuestions.map((q) => `- ${q}`).join('\n')
  });

  enterPhase('architecture');
  trackSubagent('code-architect');
  const [architectA, architectB] = await Promise.all([
    codeArchitectTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [architecture A]`
    }),
    codeArchitectTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [architecture B]`
    })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-architect',
      status: architectA.degraded ? 'degraded' : 'done',
      confidence: architectA.confidence,
      summary: architectA.summary,
      error: architectA.error
    },
    {
      role: 'code-architect',
      status: architectB.degraded ? 'degraded' : 'done',
      confidence: architectB.confidence,
      summary: architectB.summary,
      error: architectB.error
    }
  );

  const selected = architectA.confidence >= architectB.confidence ? architectA : architectB;
  state.selectedPlan = toArchitecturePlan(selected);
  state.implementationTargets = uniqueNonEmpty([
    ...state.selectedPlan.filesToModify,
    ...state.selectedPlan.filesToCreate
  ]);

  notes.push({
    phase: 'architecture',
    note:
      `selected plan: ${state.selectedPlan.recommendedApproach}\n` +
      `targets: ${state.implementationTargets.join(', ') || 'none'}\n` +
      `steps: ${state.selectedPlan.implementationSteps.map((s) => `${s.id}:${s.description}`).join(' | ') || 'none'}`
  });

  enterPhase('approval');
  const approvalDetail = [
    `Task: ${state.task}`,
    `Approach: ${state.selectedPlan.recommendedApproach}`,
    `Targets: ${state.implementationTargets.join(', ') || 'none'}`,
    `Steps: ${state.selectedPlan.implementationSteps.length}`
  ].join('\n');

  state.approvalGranted = await input.toolContext.approval.requestApproval({
    kind: 'write',
    title: 'Feature-dev approval gate',
    detail: approvalDetail
  });

  if (!state.approvalGranted) {
    state.blockedReason = 'Approval denied before implementation.';
    phaseStatus.implementation = 'blocked';
    input.onBlocked?.(state.blockedReason);
    notes.push({
      phase: 'approval',
      note: 'Approval denied. Implementation blocked.'
    });
  } else {
    notes.push({
      phase: 'approval',
      note: 'Approval granted. Enter implementation.'
    });
  }

  if (state.approvalGranted) {
    enterPhase('implementation');

    for (const step of state.selectedPlan.implementationSteps) {
      state.currentStepId = step.id;
      step.status = 'running';
      input.onImplementationStep?.(step.id, step.status);

      const stepTarget = step.targetFiles[0] ?? state.implementationTargets[0];
      if (stepTarget) {
        input.onToolEvent?.(`implementation step ${step.id} read_file: ${stepTarget}`);
        await executeToolByName('read_file', { path: stepTarget }, input.toolContext);
      }

      step.status = 'done';
      input.onImplementationStep?.(step.id, step.status);
    }

    notes.push({
      phase: 'implementation',
      note:
        `implementation progress: ${state.selectedPlan.implementationSteps
          .map((s) => `${s.id}=${s.status}`)
          .join(', ')}`
    });
  }

  enterPhase('review');
  trackSubagent('code-reviewer');
  const [reviewA, reviewB] = await Promise.all([
    codeReviewerTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [review A]`
    }),
    codeReviewerTask({
      provider: input.provider,
      model: input.model,
      task: `${input.task} [review B]`
    })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-reviewer',
      status: reviewA.degraded ? 'degraded' : 'done',
      confidence: reviewA.confidence,
      summary: reviewA.summary,
      error: reviewA.error
    },
    {
      role: 'code-reviewer',
      status: reviewB.degraded ? 'degraded' : 'done',
      confidence: reviewB.confidence,
      summary: reviewB.summary,
      error: reviewB.error
    }
  );

  state.reviewFindings = [...reviewA.findings, ...reviewB.findings];
  state.decisionBuckets = bucketReviewFindings(state.reviewFindings);

  // Flow back to implementation when fix-now findings exist.
  if (state.decisionBuckets.fixNow.length > 0 && state.selectedPlan) {
    const reworkId = `rework-${state.selectedPlan.implementationSteps.length + 1}`;
    state.selectedPlan.implementationSteps.push({
      id: reworkId,
      description: `Address fix-now findings (${state.decisionBuckets.fixNow.length})`,
      targetFiles: uniqueNonEmpty(state.decisionBuckets.fixNow.map((f) => f.evidence).slice(0, 3)),
      status: 'pending'
    });
    actionableNextSteps.push('Re-enter implementation to resolve fix-now findings.');
  } else {
    actionableNextSteps.push('Proceed with fix-later backlog and summary.');
  }

  notes.push({
    phase: 'review',
    note:
      `review summary A: ${reviewA.summary}\n` +
      `review summary B: ${reviewB.summary}\n` +
      `fixNow: ${summarizeFindings(state.decisionBuckets.fixNow)}\n` +
      `fixLater: ${summarizeFindings(state.decisionBuckets.fixLater)}\n` +
      `ignore: ${summarizeFindings(state.decisionBuckets.ignore)}`
  });

  enterPhase('summary');
  notes.push({
    phase: 'summary',
    note:
      `summary:\n` +
      `- exploredFiles=${state.exploredFiles.length}\n` +
      `- approvalGranted=${state.approvalGranted}\n` +
      `- currentStepId=${state.currentStepId ?? 'none'}\n` +
      `- actionableNextSteps=${actionableNextSteps.join(' | ')}`
  });
  phaseStatus.summary = 'done';

  return {
    notes,
    state,
    phaseHistory,
    phaseStatus,
    activeSubagentHistory,
    actionableNextSteps
  };
}
