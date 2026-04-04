import type { StreamHealth } from '../api/events';
import type { ApiTaskRuntime } from '../types/workbench';

export type ExecutionSummary = {
  headline: string;
  tone: 'normal' | 'warning' | 'critical';
  status: string;
  phase?: string;
  step?: string;
  requiresAttention: boolean;
};

export type BlockerSummary = {
  blocked: boolean;
  reason?: string;
  approvalPending: boolean;
  approvalsCount: number;
};

export type ReviewSummary = {
  fixNow: number;
  fixLater: number;
  ignore: number;
  open: number;
  inRework: number;
};

export type RealtimeSummary = {
  healthy: boolean;
  task: string;
  approvals: string;
  audit: string;
  degraded: boolean;
};

export function selectExecutionSummary(
  runtime: ApiTaskRuntime | undefined,
  approvalsCount = 0
): ExecutionSummary {
  if (!runtime) {
    return {
      headline: 'No active task selected',
      tone: 'warning',
      status: 'idle',
      requiresAttention: false
    };
  }

  const phase = runtime.telemetry.activePhase;
  const step = runtime.telemetry.activeImplementationStep ?? runtime.workflowState?.currentStepId;
  const blockedReason = runtime.telemetry.blockedReason;

  if (approvalsCount > 0) {
    return {
      headline: `Blocked · waiting for approval · ${approvalsCount} pending`,
      tone: 'critical',
      status: runtime.task.status,
      phase,
      step,
      requiresAttention: true
    };
  }

  if (blockedReason || runtime.task.status === 'blocked') {
    return {
      headline: `Blocked · ${blockedReason ?? 'action required'}`,
      tone: 'critical',
      status: runtime.task.status,
      phase,
      step,
      requiresAttention: true
    };
  }

  if (runtime.task.status === 'reviewing') {
    return {
      headline: 'Reviewing · findings available · review recommended',
      tone: 'warning',
      status: runtime.task.status,
      phase,
      step,
      requiresAttention: true
    };
  }

  return {
    headline: `Running · ${phase ?? 'execution'} · ${step ?? 'step pending'} · no intervention needed`,
    tone: 'normal',
    status: runtime.task.status,
    phase,
    step,
    requiresAttention: false
  };
}

export function selectBlockerSummary(
  runtime: ApiTaskRuntime | undefined,
  approvalsCount = 0
): BlockerSummary {
  const reason = runtime?.telemetry.blockedReason;
  const approvalPending = approvalsCount > 0;
  return {
    blocked: approvalPending || Boolean(reason) || runtime?.task.status === 'blocked',
    reason,
    approvalPending,
    approvalsCount
  };
}

export function selectReviewSummary(runtime: ApiTaskRuntime | undefined): ReviewSummary {
  const buckets = runtime?.workflowState?.decisionBuckets;
  const lifecycle = runtime?.workflowState?.findingLifecycle ?? [];
  return {
    fixNow: buckets?.fixNow.length ?? 0,
    fixLater: buckets?.fixLater.length ?? 0,
    ignore: buckets?.ignore.length ?? 0,
    open: lifecycle.filter((item) => item.status === 'open').length,
    inRework: lifecycle.filter((item) => item.status === 'in_rework').length
  };
}

export function selectRealtimeSummary(
  streamHealth: Record<'task' | 'approvals' | 'audit', StreamHealth>,
  fallbackPolling: boolean
): RealtimeSummary {
  const degraded = fallbackPolling || Object.values(streamHealth).some((health) => health === 'error');
  return {
    healthy: !degraded,
    task: streamHealth.task,
    approvals: streamHealth.approvals,
    audit: streamHealth.audit,
    degraded
  };
}
