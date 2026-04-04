import type { ApiTaskRuntime } from '../types/workbench';

function renderRows(
  title: string,
  rows:
    | Array<{ id: string; title: string; category: string; confidence: number; whyItMatters: string; evidence: string; relatedPaths: string[] }>
    | undefined
) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="list">
        {rows?.length ? (
          rows.map((finding) => (
            <div key={finding.id}>
              <div>
                {finding.title} [{finding.category}] {Math.round(finding.confidence * 100)}%
              </div>
              <div className="muted">why: {finding.whyItMatters}</div>
              <div className="muted">evidence: {finding.evidence}</div>
              <div className="muted">paths: {finding.relatedPaths.join(', ') || 'none'}</div>
            </div>
          ))
        ) : (
          <div className="muted">none</div>
        )}
      </div>
    </div>
  );
}

export function DecisionBucketsView({ runtime }: { runtime?: ApiTaskRuntime }) {
  return (
    <div className="list">
      {renderRows('Fix Now', runtime?.workflowState?.decisionBuckets.fixNow)}
      {renderRows('Fix Later', runtime?.workflowState?.decisionBuckets.fixLater)}
      {renderRows('Ignore', runtime?.workflowState?.decisionBuckets.ignore)}
    </div>
  );
}

