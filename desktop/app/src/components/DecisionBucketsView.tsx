import type { ApiTaskRuntime } from '../types/workbench';

type FindingRow = {
  id: string;
  title: string;
  category: string;
  confidence: number;
  whyItMatters: string;
  evidence: string;
  relatedPaths: string[];
};

function renderRows(input: {
  title: string;
  rows: FindingRow[] | undefined;
  selectedFindingId?: string;
  statusByFindingId: Record<string, string>;
  onSelectFinding: (id: string) => void;
}) {
  return (
    <div className="panel">
      <h3>{input.title}</h3>
      <div className="list">
        {input.rows?.length ? (
          input.rows.map((finding) => (
            <button
              key={finding.id}
              className="secondary finding-card"
              style={{
                textAlign: 'left',
                borderColor: input.selectedFindingId === finding.id ? '#2c4ecf' : '#d4ddf6'
              }}
              onClick={() => input.onSelectFinding(finding.id)}
            >
              <div>
                {finding.title} [{finding.category}] {Math.round(finding.confidence * 100)}%
              </div>
              <div className="muted">status: {input.statusByFindingId[finding.id] ?? 'open'}</div>
              <div className="muted">why: {finding.whyItMatters}</div>
              <div className="muted">evidence: {finding.evidence}</div>
              <div className="muted">paths: {finding.relatedPaths.join(', ') || 'none'}</div>
            </button>
          ))
        ) : (
          <div className="muted">none</div>
        )}
      </div>
    </div>
  );
}

export function DecisionBucketsView(input: {
  runtime?: ApiTaskRuntime;
  selectedFindingId?: string;
  onSelectFinding?: (id: string) => void;
}) {
  const lifecycle = input.runtime?.workflowState?.findingLifecycle ?? [];
  const statusByFindingId = lifecycle.reduce<Record<string, string>>((acc, item) => {
    acc[item.findingId] = item.status;
    return acc;
  }, {});
  const onSelect = input.onSelectFinding ?? (() => {});
  return (
    <div className="list">
      {renderRows({
        title: 'Fix Now',
        rows: input.runtime?.workflowState?.decisionBuckets.fixNow,
        selectedFindingId: input.selectedFindingId,
        statusByFindingId,
        onSelectFinding: onSelect
      })}
      {renderRows({
        title: 'Fix Later',
        rows: input.runtime?.workflowState?.decisionBuckets.fixLater,
        selectedFindingId: input.selectedFindingId,
        statusByFindingId,
        onSelectFinding: onSelect
      })}
      {renderRows({
        title: 'Ignore',
        rows: input.runtime?.workflowState?.decisionBuckets.ignore,
        selectedFindingId: input.selectedFindingId,
        statusByFindingId,
        onSelectFinding: onSelect
      })}
    </div>
  );
}

