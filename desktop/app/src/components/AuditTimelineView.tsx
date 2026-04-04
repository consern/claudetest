import type { ApiTaskRuntime } from '../types/workbench';

export function AuditTimelineView({ runtime }: { runtime?: ApiTaskRuntime }) {
  const localAudit = runtime?.workflowState?.findingLifecycle?.map((item) => ({
    ts: item.findingId,
    summary: `${item.status} ${item.title}`
  }));
  return (
    <div className="panel">
      <h3>Audit Timeline</h3>
      <div className="list">
        {runtime?.toolEvents.slice(-8).map((event, idx) => (
          <div key={`${event}-${idx}`} className="muted">
            tool: {event}
          </div>
        ))}
        {localAudit?.slice(0, 6).map((item) => (
          <div key={item.ts} className="muted">
            review: {item.summary}
          </div>
        ))}
        {!runtime ? <div className="muted">No audit data</div> : null}
      </div>
    </div>
  );
}

