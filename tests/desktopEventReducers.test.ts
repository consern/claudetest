import assert from 'node:assert/strict';
import test from 'node:test';
import type { StreamEnvelope } from '../desktop/app/src/api/events.ts';
import {
  applyApprovalStreamEvent,
  applyRuntimeStreamEvent,
  shouldUseFallbackPolling
} from '../desktop/app/src/store/eventReducers.ts';
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
      maxIterations: 8
    },
    workflowState: undefined,
    audit: [],
    history: []
  };
}

test('shouldUseFallbackPolling only when stream health has errors', () => {
  assert.equal(
    shouldUseFallbackPolling({ task: 'connected', approvals: 'connected', audit: 'connected' }),
    false
  );
  assert.equal(
    shouldUseFallbackPolling({ task: 'error', approvals: 'connected', audit: 'connected' }),
    true
  );
});

test('applyRuntimeStreamEvent merges telemetry, task state, and audit', () => {
  const runtime = createRuntime();
  const telemetryEvent: StreamEnvelope = {
    type: 'telemetry',
    taskId: 'task-1',
    timestamp: '2026-01-01T00:01:00.000Z',
    payload: { activeTool: 'read_file', round: 2 }
  };
  const taskStateEvent: StreamEnvelope = {
    type: 'task_state',
    taskId: 'task-1',
    timestamp: '2026-01-01T00:02:00.000Z',
    payload: { status: 'blocked', mode: 'rework' }
  };
  const auditEvent: StreamEnvelope = {
    type: 'audit_event',
    taskId: 'task-1',
    timestamp: '2026-01-01T00:03:00.000Z',
    payload: { eventType: 'blocked', summary: 'Waiting for approval' }
  };

  const afterTelemetry = applyRuntimeStreamEvent(runtime, telemetryEvent);
  const afterTaskState = applyRuntimeStreamEvent(afterTelemetry, taskStateEvent);
  const afterAudit = applyRuntimeStreamEvent(afterTaskState, auditEvent);

  assert.equal(afterTelemetry?.telemetry.activeTool, 'read_file');
  assert.equal(afterTelemetry?.telemetry.round, 2);
  assert.equal(afterTaskState?.task.status, 'blocked');
  assert.equal(afterTaskState?.task.mode, 'rework');
  assert.equal(afterAudit?.audit.length, 1);
  assert.equal(afterAudit?.audit[0].summary, 'Waiting for approval');
});

test('applyApprovalStreamEvent handles add and resolve', () => {
  const added = applyApprovalStreamEvent([], {
    type: 'approval_added',
    taskId: 'task-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    payload: { approvalId: 'a1', kind: 'shell', title: 'Run command' }
  });
  assert.equal(added.length, 1);
  assert.equal(added[0].id, 'a1');
  assert.equal(added[0].kind, 'shell');

  const resolved = applyApprovalStreamEvent(added, {
    type: 'approval_resolved',
    taskId: 'task-1',
    timestamp: '2026-01-01T00:01:00.000Z',
    payload: { approvalId: 'a1', decision: 'approve' }
  });
  assert.equal(resolved.length, 0);
});
