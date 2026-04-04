import { useEffect } from 'react';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { CurrentActionPanel } from '../components/CurrentActionPanel';
import { ImplementationStepsPanel } from '../components/ImplementationStepsPanel';
import { MainThreadView } from '../components/MainThreadView';
import { PhaseTracker } from '../components/PhaseTracker';
import { SubagentPanel } from '../components/SubagentPanel';
import { TaskSidebar } from '../components/TaskSidebar';
import { useAppStore } from '../store/appStore';
import { useEventStore } from '../store/eventStore';
import { useTaskStore } from '../store/taskStore';

export function TaskWorkspacePage() {
  const { currentTaskId, setTaskId } = useAppStore();
  const { fallbackPolling, streamHealth, startTaskStreams } = useEventStore();
  const {
    tasks,
    projects,
    approvals,
    currentRuntime,
    refreshAll,
    refreshTaskRuntime,
    applyStreamEvent
  } = useTaskStore();

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
        void refreshAll();
      }
    });
    const timer = window.setInterval(() => {
      if (!fallbackPolling) {
        return;
      }
      void refreshTaskRuntime(currentTaskId);
      void refreshAll();
    }, 6000);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [currentTaskId, refreshTaskRuntime, refreshAll, applyStreamEvent, fallbackPolling, startTaskStreams]);

  const currentProject = projects.find((project) => project.id === currentRuntime?.task.projectId);

  return (
    <div className="layout grid-3">
      <TaskSidebar
        projectName={currentProject?.name}
        tasks={tasks}
        selectedTaskId={currentTaskId}
        onSelectTask={setTaskId}
      />
      <div className="list">
        <MainThreadView runtime={currentRuntime} approvals={approvals} />
        <div className="panel">
          <h3>Realtime</h3>
          <div className="muted">task stream: {streamHealth.task}</div>
          <div className="muted">approval stream: {streamHealth.approvals}</div>
          <div className="muted">fallback polling: {fallbackPolling ? 'on' : 'off'}</div>
        </div>
        <ApprovalQueue approvals={approvals} onChanged={() => void refreshAll()} />
      </div>
      <div className="list">
        <CurrentActionPanel runtime={currentRuntime} approvalsCount={approvals.length} />
        <PhaseTracker runtime={currentRuntime} />
        <ImplementationStepsPanel runtime={currentRuntime} />
        <SubagentPanel runtime={currentRuntime} />
      </div>
    </div>
  );
}
