import type { ApiApproval, ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
  approvals: ApiApproval[];
}

export function MainThreadView({ runtime, approvals }: Props) {
  return (
    <div className="panel">
      <h3>Main Thread</h3>
      {!runtime ? <div className="muted">No task selected</div> : null}
      <div className="list thread-sections">
        <section className="panel">
          <h3>Conversation</h3>
          <div className="list">
            {runtime?.history.slice(-8).map((message) => (
              <div key={message.id} className={`message-row message-${message.role}`}>
                <div className="muted">{message.role}</div>
                <div>{message.content.slice(0, 500)}</div>
              </div>
            )) ?? <div className="muted">No messages</div>}
          </div>
        </section>

        <section className="panel">
          <h3>Tool Events</h3>
          <div className="list">
            {runtime?.toolEvents.slice(-10).map((event, idx) => (
              <div key={`${event}-${idx}`} className="muted">
                {event}
              </div>
            )) ?? <div className="muted">No tool events</div>}
          </div>
        </section>

        <section className="panel">
          <h3>Approvals</h3>
          <div className="list">
            {approvals.length === 0 ? <div className="muted">No pending approvals</div> : null}
            {approvals.map((approval) => (
              <div key={approval.id} className="muted">
                {approval.kind}: {approval.title}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Diff / Patch Preview</h3>
          <div className="muted">
            Phase 2 placeholder: wire preview_diff snapshots from execution results.
          </div>
        </section>
      </div>
    </div>
  );
}

