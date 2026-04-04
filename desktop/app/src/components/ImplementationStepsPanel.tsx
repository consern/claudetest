import type { ApiTaskRuntime } from '../types/workbench';

export function ImplementationStepsPanel({ runtime }: { runtime?: ApiTaskRuntime }) {
  return (
    <div className="panel">
      <h3>Implementation Steps</h3>
      <div className="list">
        {runtime?.workflowState?.stepExecutionResults?.map((step) => (
          <div key={step.stepId}>
            {step.stepId} | writes {step.writesApplied}/{step.patchesProposed}
            <div className="muted">{step.summary}</div>
          </div>
        )) ?? <div className="muted">No steps</div>}
      </div>
    </div>
  );
}

