import type { ApiTaskRuntime } from '../types/workbench';

const phases = [
  'discovery',
  'exploration',
  'clarification',
  'architecture',
  'approval',
  'implementation',
  'review',
  'rework',
  'summary'
];

export function PhaseTracker({ runtime }: { runtime?: ApiTaskRuntime }) {
  const blocked = runtime?.telemetry.blockedReason;
  return (
    <div className={`panel ${blocked ? 'panel-blocked' : ''}`}>
      <h3>Phase Tracker</h3>
      <div className="list">
        {phases.map((phase) => (
          <div
            key={phase}
            className={runtime?.telemetry.activePhase === phase ? 'phase-active' : 'phase-inactive'}
          >
            {phase} {runtime?.telemetry.activePhase === phase ? '-> active' : ''}
          </div>
        ))}
      </div>
      {blocked ? <div className="blocked-banner">blocked: {blocked}</div> : null}
    </div>
  );
}

