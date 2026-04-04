import { useEffect, useMemo } from 'react';
import { triggerRework } from '../api/reviews';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { AuditTimelineView } from '../components/AuditTimelineView';
import { DecisionBucketsView } from '../components/DecisionBucketsView';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';

export function ReviewWorkspacePage() {
  const { currentTaskId, setTaskId } = useAppStore();
  const { reviews, approvals, currentRuntime, refreshAll, refreshTaskRuntime } = useTaskStore();

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!currentTaskId) {
      return;
    }
    void refreshTaskRuntime(currentTaskId);
  }, [currentTaskId, refreshTaskRuntime]);

  const selected = useMemo(() => {
    if (!currentRuntime?.workflowState) {
      return undefined;
    }
    return currentRuntime.workflowState.findingLifecycle.find(
      (item) => item.status === 'in_rework' || item.status === 'open'
    );
  }, [currentRuntime]);

  return (
    <div className="layout grid-3">
      <div className="panel list">
        <h3>Reviews</h3>
        {reviews.map((row) => (
          <button
            className="secondary"
            key={row.taskId}
            onClick={() => setTaskId(row.taskId)}
            style={{ textAlign: 'left' }}
          >
            <div>task: {row.taskId.slice(0, 8)}</div>
            <div className="muted">
              fixNow={row.fixNow} fixLater={row.fixLater} ignore={row.ignore}
            </div>
          </button>
        ))}
      </div>
      <div className="list">
        <DecisionBucketsView runtime={currentRuntime} />
        <div className="panel">
          <h3>Finding Detail</h3>
          {!selected ? <div className="muted">No finding selected</div> : null}
          {selected ? (
            <div className="list">
              <div>{selected.title}</div>
              <div className="muted">status: {selected.status}</div>
              <div className="muted">files: {selected.relatedFiles.join(', ') || 'none'}</div>
              <div className="muted">steps: {selected.linkedStepIds.join(', ') || 'none'}</div>
              <div className="muted">note: {selected.resolutionNote ?? 'none'}</div>
            </div>
          ) : null}
          {currentTaskId ? (
            <button
              onClick={async () => {
                await triggerRework(currentTaskId);
                await refreshAll();
                await refreshTaskRuntime(currentTaskId);
              }}
            >
              Trigger Rework
            </button>
          ) : null}
        </div>
      </div>
      <div className="list">
        <ApprovalQueue approvals={approvals} onChanged={() => void refreshAll()} />
        <AuditTimelineView runtime={currentRuntime} />
      </div>
    </div>
  );
}

