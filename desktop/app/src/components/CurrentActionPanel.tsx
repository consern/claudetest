import type { ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
  approvalsCount?: number;
}

export function CurrentActionPanel({ runtime, approvalsCount = 0 }: Props) {
  const blocked = runtime?.telemetry.blockedReason;
  const approvalRequired = approvalsCount > 0;
  return (
    <div className={`panel ${blocked ? 'panel-blocked' : ''}`}>
      <h3>Current Action</h3>
      <div className="list">
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
        <div className={approvalRequired ? 'blocked-banner' : 'muted'}>
          Approval Required: {approvalRequired ? `${approvalsCount} pending` : 'none'}
        </div>
        <div>Last Action: {runtime?.telemetry.lastReviewDecision ?? runtime?.telemetry.lastWriteResult ?? 'none'}</div>
        <div className={blocked ? 'blocked-banner' : 'muted'}>
          Blocked Reason: {blocked ?? 'none'}
        </div>
      </div>
    </div>
  );
}

