import { selectBlockerSummary, selectExecutionSummary } from '../store/runtimeSelectors';
import type { ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
  approvalsCount?: number;
}

export function CurrentActionPanel({ runtime, approvalsCount = 0 }: Props) {
  const executionSummary = selectExecutionSummary(runtime, approvalsCount);
  const blockerSummary = selectBlockerSummary(runtime, approvalsCount);

  return (
    <div className={`panel ${blockerSummary.blocked ? 'panel-blocked' : ''}`}>
      <h3>Current Action</h3>
      <div className="list">
        <div className={executionSummary.tone === 'critical' ? 'blocked-banner' : 'muted'}>
          {executionSummary.headline}
        </div>
        <div className="row">
          <strong>Mode</strong>
          <span>{runtime?.telemetry.activeMode ?? 'none'}</span>
        </div>
        <div className="row">
          <strong>Phase</strong>
          <span>{runtime?.telemetry.activePhase ?? 'none'}</span>
        </div>
        <div>
          Round: {runtime?.telemetry.round ?? 0}/{runtime?.telemetry.maxIterations ?? 0}
        </div>
        <div>Current Step: {runtime?.telemetry.activeImplementationStep ?? 'none'}</div>
        <div>Active Tool: {runtime?.telemetry.activeTool ?? 'none'}</div>
        <div>Active Subagent: {runtime?.telemetry.activeSubagent ?? 'none'}</div>
        <div className={blockerSummary.approvalPending ? 'blocked-banner' : 'muted'}>
          Approval Required: {blockerSummary.approvalPending ? `${approvalsCount} pending` : 'none'}
        </div>
        <div>
          Last Action: {runtime?.telemetry.lastReviewDecision ?? runtime?.telemetry.lastWriteResult ?? 'none'}
        </div>
        <div className={blockerSummary.reason ? 'blocked-banner' : 'muted'}>
          Blocked Reason: {blockerSummary.reason ?? 'none'}
        </div>
        <div className={executionSummary.requiresAttention ? 'blocked-banner' : 'muted'}>
          Requires Attention: {executionSummary.requiresAttention ? 'yes' : 'no'}
        </div>
      </div>
    </div>
  );
}
