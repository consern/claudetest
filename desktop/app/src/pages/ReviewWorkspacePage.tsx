import { useEffect, useMemo } from 'react';
import { triggerRework } from '../api/reviews';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { AuditTimelineView } from '../components/AuditTimelineView';
import { DecisionBucketsView } from '../components/DecisionBucketsView';
import { useAppStore } from '../store/appStore';
import { useEventStore } from '../store/eventStore';
import { useReviewStore } from '../store/reviewStore';
import { useTaskStore } from '../store/taskStore';

export function ReviewWorkspacePage() {
  const { currentTaskId, setTaskId } = useAppStore();
  const { selectedFindingId, setSelectedFindingId } = useReviewStore();
  const { fallbackPolling, streamHealth, startTaskStreams } = useEventStore();
  const {
    reviews,
    approvals,
    currentRuntime,
    refreshAll,
    refreshApprovals,
    refreshTaskRuntime,
    applyStreamEvent
  } =
    useTaskStore();

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!currentTaskId) {
      return;
    }
    void refreshTaskRuntime(currentTaskId);
    const stop = startTaskStreams(currentTaskId, {
      onEvent: (event) => {
        applyStreamEvent(event);
      },
      onImportantRefresh: () => {
        void refreshTaskRuntime(currentTaskId);
      }
    });
    const timer = window.setInterval(() => {
      if (!fallbackPolling) {
        return;
      }
      void refreshTaskRuntime(currentTaskId);
      void refreshAll();
    }, 8000);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [
    currentTaskId,
    refreshTaskRuntime,
    refreshAll,
    applyStreamEvent,
    fallbackPolling,
    startTaskStreams
  ]);

  const selected = useMemo(() => {
    if (!currentRuntime?.workflowState) {
      return undefined;
    }
    if (selectedFindingId) {
      const byId = currentRuntime.workflowState.findingLifecycle.find(
        (item) => item.findingId === selectedFindingId
      );
      if (byId) {
        return byId;
      }
    }
    return currentRuntime.workflowState.findingLifecycle.find(
      (item) => item.status === 'in_rework' || item.status === 'open'
    );
  }, [currentRuntime, selectedFindingId]);

  const lifecycleGroups = useMemo(() => {
    const rows = currentRuntime?.workflowState?.findingLifecycle ?? [];
    return {
      open: rows.filter((row) => row.status === 'open'),
      in_rework: rows.filter((row) => row.status === 'in_rework'),
      resolved: rows.filter((row) => row.status === 'resolved'),
      dropped: rows.filter((row) => row.status === 'dropped')
    };
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
        <div className="panel">
          <h3>Lifecycle</h3>
          <div className="muted">open: {lifecycleGroups.open.length}</div>
          <div className="muted">in_rework: {lifecycleGroups.in_rework.length}</div>
          <div className="muted">resolved: {lifecycleGroups.resolved.length}</div>
          <div className="muted">dropped: {lifecycleGroups.dropped.length}</div>
        </div>
      </div>
      <div className="list">
        <DecisionBucketsView
          runtime={currentRuntime}
          selectedFindingId={selected?.findingId}
          onSelectFinding={setSelectedFindingId}
        />
        <div className="panel selected-finding">
          <h3>Selected Finding</h3>
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
        <ApprovalQueue approvals={approvals} onChanged={() => void refreshApprovals()} />
        <div className="panel">
          <h3>Realtime</h3>
          <div className="muted">task stream: {streamHealth.task}</div>
          <div className="muted">audit stream: {streamHealth.audit}</div>
          <div className="muted">fallback polling: {fallbackPolling ? 'on' : 'off'}</div>
        </div>
        <AuditTimelineView runtime={currentRuntime} focusText={selected?.title} />
      </div>
    </div>
  );
}
