import type { ModelProvider } from '../providers/base.js';
import type { ToolContext } from '../tools/types.js';
import { executeToolByName } from '../tools/toolRegistry.js';
import type { FeatureDevPhase } from '../types/agent.js';
import type {
  FeatureDevState,
  FeatureDevWorkflowResult,
  ImplementationStep,
  ReworkStepContext,
  ReviewFinding,
  StepExecutionResult,
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

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeReviewFinding(input: {
  id?: string;
  title: string;
  whyItMatters: string;
  evidence: string;
  relatedPaths?: string[];
  confidence: number;
  category: ReviewFinding['category'];
}): ReviewFinding {
  const stableId =
    input.id ||
    `f_${Buffer.from(`${input.title}|${input.evidence}`.toLowerCase(), 'utf8')
      .toString('hex')
      .slice(0, 12)}`;
  return {
    id: stableId,
    title: input.title,
    whyItMatters: input.whyItMatters,
    evidence: input.evidence,
    relatedPaths: uniqueNonEmpty([...(input.relatedPaths ?? []), extractPathFromEvidence(input.evidence) ?? '']),
    confidence: input.confidence,
    category: input.category
  };
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

function extractPathFromEvidence(evidence: string): string | null {
  const match = evidence.match(/[A-Za-z]:[\\/][^\s]+|(?:src|tests|docs)[\\/][^\s]+/);
  return match ? match[0] : null;
}

function parseJsonFromText(raw: string): unknown | null {
  const trimmed = raw.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last <= first) {
    return null;
  }
  try {
    return JSON.parse(trimmed.slice(first, last + 1));
  } catch {
    return null;
  }
}

async function buildStepPatchPlan(input: {
  provider: ModelProvider;
  model: string;
  task: string;
  stepDescription: string;
  targetFiles: string[];
  fileSnapshots: Array<{ path: string; content: string }>;
}): Promise<Array<{ filePath: string; newContent: string; reason: string }>> {
  const response = await input.provider.createResponse({
    model: input.model,
    systemPrompt:
      'You are an implementation-step executor. Output strict JSON only. Choose minimal safe edits.',
    messages: [
      {
        role: 'user',
        content:
          `Task: ${input.task}\n` +
          `Step: ${input.stepDescription}\n` +
          `Target files: ${input.targetFiles.join(', ')}\n\n` +
          `File snapshots:\n${JSON.stringify(input.fileSnapshots)}\n\n` +
          `Return JSON:\n{"patches":[{"filePath":"string","newContent":"string","reason":"string"}]}`
      }
    ]
  });
  const parsed = parseJsonFromText(response.text ?? '');
  if (!parsed || typeof parsed !== 'object') {
    return [];
  }
  const patches = (parsed as Record<string, unknown>).patches;
  if (!Array.isArray(patches)) {
    return [];
  }
  return patches
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }
      const rec = row as Record<string, unknown>;
      if (
        typeof rec.filePath !== 'string' ||
        typeof rec.newContent !== 'string' ||
        typeof rec.reason !== 'string'
      ) {
        return null;
      }
      return {
        filePath: rec.filePath,
        newContent: rec.newContent,
        reason: rec.reason
      };
    })
    .filter((x): x is { filePath: string; newContent: string; reason: string } => Boolean(x));
}

async function executeImplementationStep(input: {
  task: string;
  step: ImplementationStep;
  provider: ModelProvider;
  model: string;
  toolContext: ToolContext;
  onToolEvent?: (event: string) => void;
  onWriteResult?: (summary: string) => void;
}): Promise<StepExecutionResult> {
  const attemptedFiles: string[] = [];
  const snapshots: Array<{ path: string; content: string }> = [];

  for (const target of input.step.targetFiles.slice(0, 4)) {
    attemptedFiles.push(target);
    input.onToolEvent?.(`implementation read_file: ${target}`);
    const read = await executeToolByName('read_file', { path: target }, input.toolContext);
    if (read.ok && read.data && typeof read.data === 'object') {
      const rec = read.data as Record<string, unknown>;
      snapshots.push({
        path: String(rec.path ?? target),
        content: String(rec.content ?? '')
      });
    }
  }

  const patches = await buildStepPatchPlan({
    provider: input.provider,
    model: input.model,
    task: input.task,
    stepDescription: input.step.description,
    targetFiles: input.step.targetFiles,
    fileSnapshots: snapshots
  });

  if (patches.length === 0) {
    return {
      stepId: input.step.id,
      attemptedFiles,
      patchesProposed: 0,
      writesApplied: 0,
      blockedReason: 'No concrete patch proposals generated.',
      summary: `Step ${input.step.id} blocked: no patches proposed`
    };
  }

  let writesApplied = 0;
  for (const patch of patches.slice(0, 3)) {
    input.onToolEvent?.(`implementation write_file: ${patch.filePath} (${patch.reason})`);
    const write = await executeToolByName(
      'write_file',
      { filePath: patch.filePath, newContent: patch.newContent },
      input.toolContext
    );
    input.onWriteResult?.(write.summary);
    if (write.ok) {
      writesApplied += 1;
    }
  }

  return {
    stepId: input.step.id,
    attemptedFiles,
    patchesProposed: patches.length,
    writesApplied,
    blockedReason: writesApplied === 0 ? 'All writes were denied or failed.' : undefined,
    summary:
      writesApplied > 0
        ? `Step ${input.step.id} completed: ${writesApplied}/${patches.length} writes applied`
        : `Step ${input.step.id} blocked: no writes applied`
  };
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
  onWriteResult?: (summary: string) => void;
  onReviewDecision?: (summary: string) => void;
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
    stepExecutionResults: [],
    reviewFindings: [],
    decisionBuckets: { fixNow: [], fixLater: [], ignore: [] },
    blockedReason: undefined,
    findingLifecycle: [],
    auditEvents: [],
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
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: phase === 'implementation' && state.currentStepId?.startsWith('rework-') ? 'rework' : 'feature-dev',
      phase,
      stepId: state.currentStepId,
      eventType: 'tool_result',
      summary: `Enter phase: ${phase}`
    });
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
    codeExplorerTask({ provider: input.provider, model: input.model, task: `${input.task} [explore A]` }),
    codeExplorerTask({ provider: input.provider, model: input.model, task: `${input.task} [explore B]` })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-explorer',
      status: explorerA.degraded ? 'degraded' : 'done',
      confidence: explorerA.confidence,
      summary: explorerA.summary,
      error: explorerA.error,
      retryCount: explorerA.retryCount,
      failureStage: explorerA.failureStage
    },
    {
      role: 'code-explorer',
      status: explorerB.degraded ? 'degraded' : 'done',
      confidence: explorerB.confidence,
      summary: explorerB.summary,
      error: explorerB.error,
      retryCount: explorerB.retryCount,
      failureStage: explorerB.failureStage
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
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'feature-dev',
      phase: 'exploration',
      eventType: 'tool_call',
      summary: `read_file ${file}`
    });
    const read = await executeToolByName('read_file', { path: file }, input.toolContext);
    input.onToolEvent?.(`feature-dev read_file result: ${read.summary}`);
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'feature-dev',
      phase: 'exploration',
      eventType: 'tool_result',
      summary: `read_file result: ${read.summary}`
    });
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
    codeArchitectTask({ provider: input.provider, model: input.model, task: `${input.task} [architecture A]` }),
    codeArchitectTask({ provider: input.provider, model: input.model, task: `${input.task} [architecture B]` })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-architect',
      status: architectA.degraded ? 'degraded' : 'done',
      confidence: architectA.confidence,
      summary: architectA.summary,
      error: architectA.error,
      retryCount: architectA.retryCount,
      failureStage: architectA.failureStage
    },
    {
      role: 'code-architect',
      status: architectB.degraded ? 'degraded' : 'done',
      confidence: architectB.confidence,
      summary: architectB.summary,
      error: architectB.error,
      retryCount: architectB.retryCount,
      failureStage: architectB.failureStage
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
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'feature-dev',
      phase: 'approval',
      eventType: 'blocked',
      summary: state.blockedReason
    });
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
      const execution = await executeImplementationStep({
        task: state.task,
        step,
        provider: input.provider,
        model: input.model,
        toolContext: input.toolContext,
        onToolEvent: input.onToolEvent,
        onWriteResult: input.onWriteResult
      });
      state.stepExecutionResults.push(execution);
      state.auditEvents.push({
        timestamp: nowIso(),
        mode: step.id.startsWith('rework-') ? 'rework' : 'feature-dev',
        phase: 'implementation',
        stepId: step.id,
        eventType: 'tool_result',
        summary: execution.summary
      });
      if (execution.writesApplied > 0) {
        step.status = 'done';
      } else {
        step.status = 'blocked';
        if (!state.blockedReason) {
          state.blockedReason = execution.blockedReason;
          input.onBlocked?.(state.blockedReason ?? 'Implementation blocked');
          state.auditEvents.push({
            timestamp: nowIso(),
            mode: step.id.startsWith('rework-') ? 'rework' : 'feature-dev',
            phase: 'implementation',
            stepId: step.id,
            eventType: 'blocked',
            summary: state.blockedReason ?? 'Implementation blocked'
          });
        }
      }
      input.onImplementationStep?.(step.id, step.status);
    }

    notes.push({
      phase: 'implementation',
      note:
        `implementation results:\n` +
        state.stepExecutionResults
          .map(
            (r) =>
              `- ${r.stepId}: writes=${r.writesApplied}/${r.patchesProposed}, blocked=${r.blockedReason ?? 'no'}`
          )
          .join('\n')
    });
  }

  enterPhase('review');
  trackSubagent('code-reviewer');
  const [reviewA, reviewB] = await Promise.all([
    codeReviewerTask({ provider: input.provider, model: input.model, task: `${input.task} [review A]` }),
    codeReviewerTask({ provider: input.provider, model: input.model, task: `${input.task} [review B]` })
  ]);
  state.subagentStatus.push(
    {
      role: 'code-reviewer',
      status: reviewA.degraded ? 'degraded' : 'done',
      confidence: reviewA.confidence,
      summary: reviewA.summary,
      error: reviewA.error,
      retryCount: reviewA.retryCount,
      failureStage: reviewA.failureStage
    },
    {
      role: 'code-reviewer',
      status: reviewB.degraded ? 'degraded' : 'done',
      confidence: reviewB.confidence,
      summary: reviewB.summary,
      error: reviewB.error,
      retryCount: reviewB.retryCount,
      failureStage: reviewB.failureStage
    }
  );

  state.reviewFindings = [...reviewA.findings, ...reviewB.findings].map((finding) =>
    normalizeReviewFinding(finding)
  );
  state.decisionBuckets = bucketReviewFindings(state.reviewFindings);
  state.findingLifecycle = state.reviewFindings.map((finding) => ({
    findingId: finding.id,
    title: finding.title,
    status: state.decisionBuckets.fixNow.some((row) => row.id === finding.id) ? 'in_rework' : 'open',
    sourcePhase: 'review',
    relatedFiles: finding.relatedPaths,
    linkedStepIds: []
  }));
  for (const finding of state.reviewFindings) {
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'feature-dev',
      phase: 'review',
      eventType: 'review_finding',
      summary: `${finding.id} ${finding.title} [${finding.category}]`
    });
  }
  input.onReviewDecision?.(
    `fixNow=${state.decisionBuckets.fixNow.length}, fixLater=${state.decisionBuckets.fixLater.length}, ignore=${state.decisionBuckets.ignore.length}`
  );

  if (state.approvalGranted && state.decisionBuckets.fixNow.length > 0 && state.selectedPlan) {
    const reworkContext: ReworkStepContext = {
      sourceFindings: state.decisionBuckets.fixNow,
      relatedFiles: uniqueNonEmpty(
        state.decisionBuckets.fixNow
          .map((f) => extractPathFromEvidence(f.evidence))
          .filter((x): x is string => Boolean(x))
      ),
      repairGoal: `Resolve ${state.decisionBuckets.fixNow.length} high-priority findings`
    };
    const reworkId = `rework-${state.selectedPlan.implementationSteps.length + 1}`;
    state.selectedPlan.implementationSteps.push({
      id: reworkId,
      description: reworkContext.repairGoal,
      targetFiles: reworkContext.relatedFiles.slice(0, 4),
      repairGoal: reworkContext.repairGoal,
      status: 'pending'
    });
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'rework',
      phase: 'implementation',
      stepId: reworkId,
      eventType: 'rework_created',
      summary: reworkContext.repairGoal
    });

    // Re-enter implementation for rework step.
    enterPhase('implementation');
    const reworkStep = state.selectedPlan.implementationSteps[state.selectedPlan.implementationSteps.length - 1];
    state.currentStepId = reworkStep.id;
    reworkStep.status = 'running';
    input.onImplementationStep?.(reworkStep.id, reworkStep.status);
    const reworkResult = await executeImplementationStep({
      task: `${state.task} [rework]`,
      step: reworkStep,
      provider: input.provider,
      model: input.model,
      toolContext: input.toolContext,
      onToolEvent: input.onToolEvent,
      onWriteResult: input.onWriteResult
    });
    state.stepExecutionResults.push(reworkResult);
    reworkStep.status = reworkResult.writesApplied > 0 ? 'done' : 'blocked';
    for (const lifecycle of state.findingLifecycle) {
      if (lifecycle.status === 'in_rework') {
        lifecycle.linkedStepIds = uniqueNonEmpty([...lifecycle.linkedStepIds, reworkStep.id]);
        lifecycle.lastReviewedAt = nowIso();
        if (reworkResult.writesApplied > 0) {
          lifecycle.status = 'resolved';
          lifecycle.resolutionNote = `Resolved by ${reworkStep.id}`;
          state.auditEvents.push({
            timestamp: nowIso(),
            mode: 'rework',
            phase: 'implementation',
            stepId: reworkStep.id,
            eventType: 'finding_resolved',
            summary: `${lifecycle.findingId} resolved`
          });
        }
      }
    }
    state.auditEvents.push({
      timestamp: nowIso(),
      mode: 'rework',
      phase: 'implementation',
      stepId: reworkStep.id,
      eventType: reworkResult.writesApplied > 0 ? 'tool_result' : 'blocked',
      summary: reworkResult.summary
    });
    input.onImplementationStep?.(reworkStep.id, reworkStep.status);
    actionableNextSteps.push(
      reworkResult.writesApplied > 0
        ? 'Rework step completed for fix-now findings.'
        : 'Rework step blocked; user intervention required.'
    );
  } else {
    actionableNextSteps.push('No fix-now findings. Continue with summary.');
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
      `- stepResults=${state.stepExecutionResults.length}\n` +
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
