import type { StreamEnvelope, StreamHealth } from '../api/events';
import type { ApiApproval, ApiTaskRuntime } from '../types/workbench';

export function shouldUseFallbackPolling(streamHealth: {
  task: StreamHealth;
  approvals: StreamHealth;
  audit: StreamHealth;
}): boolean {
  return (
    streamHealth.task === 'error' ||
    streamHealth.approvals === 'error' ||
    streamHealth.audit === 'error'
  );
}

export function applyRuntimeStreamEvent(
  runtime: ApiTaskRuntime | undefined,
  event: StreamEnvelope
): ApiTaskRuntime | undefined {
  if (!runtime || runtime.task.id !== event.taskId) {
    return runtime;
  }

  if (event.type === 'tool_event' && typeof event.payload?.event === 'string') {
    return {
      ...runtime,
      toolEvents: [...runtime.toolEvents, String(event.payload.event)].slice(-200)
    };
  }

  if (event.type === 'telemetry') {
    return {
      ...runtime,
      telemetry: {
        ...runtime.telemetry,
        ...(event.payload as Partial<ApiTaskRuntime['telemetry']>)
      }
    };
  }

  if (event.type === 'task_state') {
    const payload = event.payload ?? {};
    const nextStatus = typeof payload.status === 'string' ? payload.status : runtime.task.status;
    const nextMode = typeof payload.mode === 'string' ? payload.mode : runtime.task.mode;
    return {
      ...runtime,
      task: {
        ...runtime.task,
        status: nextStatus as ApiTaskRuntime['task']['status'],
        mode: nextMode as ApiTaskRuntime['task']['mode'],
        updatedAt: event.timestamp
      }
    };
  }

  if (event.type === 'audit_event') {
    const eventType =
      typeof event.payload?.eventType === 'string' ? event.payload.eventType : 'tool_result';
    const summary =
      typeof event.payload?.summary === 'string'
        ? event.payload.summary
        : typeof event.payload?.event === 'string'
          ? event.payload.event
          : 'stream audit event';
    return {
      ...runtime,
      audit: [
        ...runtime.audit,
        {
          timestamp: event.timestamp,
          eventType: eventType as ApiTaskRuntime['audit'][number]['eventType'],
          summary
        }
      ].slice(-300)
    };
  }

  return runtime;
}

export function applyApprovalStreamEvent(
  approvals: ApiApproval[],
  event: StreamEnvelope
): ApiApproval[] {
  if (event.type === 'approval_added' && typeof event.payload?.approvalId === 'string') {
    const approvalId = String(event.payload.approvalId);
    const exists = approvals.some((row) => row.id === approvalId);
    if (exists) {
      return approvals;
    }
    return [
      {
        id: approvalId,
        taskId: event.taskId,
        kind:
          typeof event.payload.kind === 'string'
            ? (event.payload.kind as ApiApproval['kind'])
            : 'write',
        title:
          typeof event.payload.title === 'string'
            ? event.payload.title
            : 'Pending approval from stream',
        detail: 'Approval requested by runtime',
        createdAt: event.timestamp
      },
      ...approvals
    ];
  }

  if (event.type === 'approval_resolved' && typeof event.payload?.approvalId === 'string') {
    const approvalId = String(event.payload.approvalId);
    return approvals.filter((row) => row.id !== approvalId);
  }

  return approvals;
}
