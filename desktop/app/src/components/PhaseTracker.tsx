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
  return (
    <div className="panel">
      <h3>Phase Tracker</h3>
      <div className="list">
        {phases.map((phase) => (
          <div key={phase}>
            {phase} {runtime?.telemetry.activePhase === phase ? '-> active' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

