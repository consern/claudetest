import { approve, reject } from '../api/approvals';
import type { ApiApproval } from '../types/workbench';

interface Props {
  approvals: ApiApproval[];
  onChanged: () => void;
}

export function ApprovalQueue({ approvals, onChanged }: Props) {
  return (
    <div className="panel">
      <h3>Approval Queue</h3>
      <div className="list">
        {approvals.length === 0 ? <div className="muted">No pending approvals</div> : null}
        {approvals.map((row) => (
          <div key={row.id} className="panel">
            <div>{row.title}</div>
            <div className="muted">{row.kind}</div>
            <div className="muted">{row.detail}</div>
            <div className="row">
              <button
                className="secondary"
                onClick={async () => {
                  await reject(row.id);
                  onChanged();
                }}
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  await approve(row.id);
                  onChanged();
                }}
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

