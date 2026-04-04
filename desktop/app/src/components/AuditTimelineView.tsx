import type { ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
  focusText?: string;
}

export function AuditTimelineView({ runtime, focusText }: Props) {
  const streamAudit = runtime?.audit ?? [];

  return (
    <div className="panel">
      <h3>Audit Timeline</h3>
      <div className="list">
        {streamAudit.length === 0 ? <div className="muted">No audit data</div> : null}
        {streamAudit.slice(-12).reverse().map((item, idx) => (
          <div
            key={`${item.timestamp}-${idx}`}
            className={focusText && item.summary.includes(focusText) ? 'audit-focus' : 'muted'}
          >
            [{item.eventType}] {item.summary}
          </div>
        ))}
      </div>
    </div>
  );
}
