import type { ApiTaskRuntime } from '../types/workbench';

export function SubagentPanel({ runtime }: { runtime?: ApiTaskRuntime }) {
  return (
    <div className="panel">
      <h3>Subagents</h3>
      <div className="list">
        {runtime?.workflowState?.subagentStatus?.map((row, idx) => (
          <div key={`${row.role}-${idx}`}>
            {row.role} | {row.status} | conf={Math.round((row.confidence ?? 0) * 100)}%
            <div className="muted">{row.summary}</div>
          </div>
        )) ?? <div className="muted">No subagent reports</div>}
      </div>
    </div>
  );
}

