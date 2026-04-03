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

function formatFindings(findings: string[]): string {
  if (findings.length === 0) {
    return 'none';
  }
  return findings.join('; ');
}

function uniqueNonEmpty(items: string[]): string[] {
  return [...new Set(items.map((x) => x.trim()).filter(Boolean))];
}

function bucketReviewFindings(findings: ReviewFinding[]): FeatureDevState['decisionBuckets'] {
  const fixNow: ReviewFinding[] = [];
  const fixLater: ReviewFinding[] = [];
  const ignore: ReviewFinding[] = [];

  for (const finding of findings) {
    if (
      finding.confidence >= 0.8 &&
      (finding.category === 'bug' || finding.category === 'security')
    ) {
      fixNow.push(finding);
      continue;
    }
    if (finding.confidence >= 0.6) {
      fixLater.push(finding);
      continue;
    }
    ignore.push(finding);
  }

  return { fixNow, fixLater, ignore };
}

function summarizeBuckets(state: FeatureDevState): string {
  return [
    `fixNow=${state.decisionBuckets.fixNow.length}`,
    `fixLater=${state.decisionBuckets.fixLater.length}`,
    `ignore=${state.decisionBuckets.ignore.length}`
  ].join(', ');
}

export async function runFeatureDevWorkflow(input: {
  task: string;
  provider: ModelProvider;
  model: string;
  toolContext: ToolContext;
  onToolEvent?: (event: string) => void;
  onPhase?: (phase: FeatureDevPhase) => void;
  onActiveSubagent?: (name: string) => void;
}): Promise<FeatureDevWorkflowResult> {
  const notes: WorkflowDisplayNote[] = [];
  const phaseHistory: FeatureDevPhase[] = [];
  const activeSubagentHistory: string[] = [];

  const state: FeatureDevState = {
    task: input.task,
    todo: [
      'Clarify task scope and constraints',
      'Explore entry points and relevant files',
      'Pick one architecture direction',
      'Request approval before implementation',
      'Implement minimal diff',
      'Review and bucket findings'
    ],
    exploredFiles: [],
    clarifyingQuestions: [],
    approvalGranted: false,
    implementationTargets: [],
    reviewFindings: [],
    decisionBuckets: { fixNow: [], fixLater: [], ignore: [] }
  };

  const enterPhase = (phase: FeatureDevPhase): void => {
    phaseHistory.push(phase);
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

  const suggested = uniqueNonEmpty([
    ...explorerA.suggestedFiles,
    ...explorerB.suggestedFiles,
    ...explorerA.relevantPaths,
    ...explorerB.relevantPaths
  ]);
  state.exploredFiles = suggested.slice(0, 8);

  notes.push({
    phase: 'exploration',
    note:
      `explorerA summary: ${explorerA.summary}\n` +
      `explorerA findings: ${formatFindings(explorerA.findings)}\n` +
      `explorerB summary: ${explorerB.summary}\n` +
      `explorerB findings: ${formatFindings(explorerB.findings)}\n` +
      `suggested files: ${state.exploredFiles.join(', ') || 'none'}`
  });

  // Read files identified by explorers before architecture decision.
  for (const file of state.exploredFiles.slice(0, 3)) {
    const event = `feature-dev read_file: ${file}`;
    input.onToolEvent?.(event);
    const readResult = await executeToolByName('read_file', { path: file }, input.toolContext);
    input.onToolEvent?.(`feature-dev read_file result: ${readResult.summary}`);
  }

  enterPhase('clarification');
  if (state.exploredFiles.length === 0) {
    state.clarifyingQuestions.push(
      'No concrete files found from exploration. Should we proceed with a broader scan?'
    );
  }
  notes.push({
    phase: 'clarification',
    note:
      state.clarifyingQuestions.length === 0
        ? 'No blocking ambiguity detected. Continue with minimal assumptions.'
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

  const selected = architectA.confidence >= architectB.confidence ? architectA : architectB;
  state.selectedPlan = toArchitecturePlan(selected);
  state.implementationTargets = uniqueNonEmpty([
    ...state.selectedPlan.filesToModify,
    ...state.selectedPlan.filesToCreate
  ]);

  notes.push({
    phase: 'architecture',
    note:
      `selected approach: ${state.selectedPlan.recommendedApproach}\n` +
      `targets: ${state.implementationTargets.join(', ') || 'none'}\n` +
      `steps: ${state.selectedPlan.implementationSteps.join(' | ') || 'none'}`
  });

  enterPhase('approval');
  const approvalDetail = [
    `Task: ${state.task}`,
    `Approach: ${state.selectedPlan.recommendedApproach}`,
    `Targets: ${state.implementationTargets.join(', ') || 'none'}`
  ].join('\n');

  state.approvalGranted = await input.toolContext.approval.requestApproval({
    kind: 'write',
    title: 'Feature-dev approval gate',
    detail: approvalDetail
  });

  notes.push({
    phase: 'approval',
    note: state.approvalGranted
      ? 'Approval granted. Proceed to implementation.'
      : 'Approval denied. Implementation is blocked.'
  });

  if (state.approvalGranted) {
    enterPhase('implementation');
    notes.push({
      phase: 'implementation',
      note: `Implementation targets: ${state.implementationTargets.join(', ') || 'none'}`
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

  state.reviewFindings = [...reviewA.findings, ...reviewB.findings];
  state.decisionBuckets = bucketReviewFindings(state.reviewFindings);

  notes.push({
    phase: 'review',
    note:
      `reviewA: ${reviewA.summary}\nreviewB: ${reviewB.summary}\n` +
      `buckets: ${summarizeBuckets(state)}`
  });

  enterPhase('summary');
  notes.push({
    phase: 'summary',
    note:
      `summary:\n` +
      `- exploredFiles=${state.exploredFiles.length}\n` +
      `- approvalGranted=${state.approvalGranted}\n` +
      `- implementationTargets=${state.implementationTargets.length}\n` +
      `- reviewBuckets=${summarizeBuckets(state)}`
  });

  return {
    notes,
    state,
    phaseHistory,
    activeSubagentHistory
  };
}

