import assert from 'node:assert/strict';
import test from 'node:test';
import {
  selectBlockerSummary,
  selectExecutionSummary,
  selectRealtimeSummary,
  selectReviewSummary
} from '../desktop/app/src/store/runtimeSelectors.ts';
import type { ApiTaskRuntime } from '../desktop/app/src/types/workbench.ts';

function createRuntime(): ApiTaskRuntime {
  return {
    task: {
      id: 'task-1',
      title: 'demo',
      status: 'running',
      mode: 'feature-dev',
      projectId: 'default',
      sessionId: 's1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    toolEvents: [],
    telemetry: {
      round: 1,
      activeMode: 'feature-dev',
      activePhase: 'implementation',
      activeImplementationStep: 'step_patch',
      maxIterations: 8
    },
    workflowState: {
      currentStepId: 'step_patch',
      decisionBuckets: {
        fixNow: [{ id: 'f1', title: 'A', category: 'bug', confidence: 0.9, whyItMatters: '', evidence: '', relatedPaths: [] }],
        fixLater: [{ id: 'f2', title: 'B', category: 'style', confidence: 0.6, whyItMatters: '', evidence: '', relatedPaths: [] }],
        ignore: []
      },
      findingLifecycle: [
        { findingId: 'f1', title: 'A', status: 'open', relatedFiles: [], linkedStepIds: [] },
        { findingId: 'f2', title: 'B', status: 'in_rework', relatedFiles: [], linkedStepIds: [] }
      ],
      stepExecutionResults: [],
      subagentStatus: []
    },
    audit: [],
    history: []
  };
}

test('selectExecutionSummary returns approval-blocked headline when approvals pending', () => {
  const runtime = createRuntime();
  const summary = selectExecutionSummary(runtime, 2);
  assert.equal(summary.tone, 'critical');
  assert.equal(summary.requiresAttention, true);
  assert.match(summary.headline, /waiting for approval/i);
});

test('selectExecutionSummary returns normal running headline without blockers', () => {
  const runtime = createRuntime();
  const summary = selectExecutionSummary(runtime, 0);
  assert.equal(summary.tone, 'normal');
  assert.equal(summary.requiresAttention, false);
  assert.match(summary.headline, /no intervention needed/i);
});

test('selectBlockerSummary marks blocked on telemetry reason', () => {
  const runtime = createRuntime();
  runtime.telemetry.blockedReason = 'Need decision';
  const blocker = selectBlockerSummary(runtime, 0);
  assert.equal(blocker.blocked, true);
  assert.equal(blocker.reason, 'Need decision');
});

test('selectReviewSummary aggregates bucket and lifecycle counts', () => {
  const summary = selectReviewSummary(createRuntime());
  assert.equal(summary.fixNow, 1);
  assert.equal(summary.fixLater, 1);
  assert.equal(summary.ignore, 0);
  assert.equal(summary.open, 1);
  assert.equal(summary.inRework, 1);
});

test('selectRealtimeSummary reports degraded when fallback polling enabled', () => {
  const realtime = selectRealtimeSummary(
    { task: 'connected', approvals: 'connected', audit: 'connected' },
    true
  );
  assert.equal(realtime.healthy, false);
  assert.equal(realtime.degraded, true);
});
