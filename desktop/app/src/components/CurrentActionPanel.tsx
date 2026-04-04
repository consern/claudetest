import type { ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
}

export function CurrentActionPanel({ runtime }: Props) {
  return (
    <div className="panel">
      <h3>Current Action</h3>
      <div className="list">
        <div>Mode: {runtime?.telemetry.activeMode ?? 'none'}</div>
        <div>Phase: {runtime?.telemetry.activePhase ?? 'none'}</div>
        <div>
          Round: {runtime?.telemetry.round ?? 0}/{runtime?.telemetry.maxIterations ?? 0}
        </div>
        <div>Step: {runtime?.telemetry.activeImplementationStep ?? 'none'}</div>
        <div>Tool: {runtime?.telemetry.activeTool ?? 'none'}</div>
        <div>Subagent: {runtime?.telemetry.activeSubagent ?? 'none'}</div>
        <div>Blocked: {runtime?.telemetry.blockedReason ?? 'none'}</div>
      </div>
    </div>
  );
}

