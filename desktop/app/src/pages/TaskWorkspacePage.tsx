import { useEffect } from 'react';
import { openTaskApprovalsStream, openTaskEventsStream } from '../api/events';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { CurrentActionPanel } from '../components/CurrentActionPanel';
import { ImplementationStepsPanel } from '../components/ImplementationStepsPanel';
import { MainThreadView } from '../components/MainThreadView';
import { PhaseTracker } from '../components/PhaseTracker';
import { SubagentPanel } from '../components/SubagentPanel';
import { TaskSidebar } from '../components/TaskSidebar';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';

export function TaskWorkspacePage() {
  const { currentTaskId, setTaskId } = useAppStore();
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
    const closeTaskStream = openTaskEventsStream(currentTaskId, (event) => {
      applyStreamEvent(event);
      if (event.type === 'task_state' || event.type === 'review_rework') {
        void refreshTaskRuntime(currentTaskId);
      }
      if (event.type === 'approval_added' || event.type === 'approval_resolved') {
        void refreshAll();
      }
    });
    const closeApprovalStream = openTaskApprovalsStream(currentTaskId, () => {
      void refreshAll();
    });
    const timer = window.setInterval(() => {
      void refreshTaskRuntime(currentTaskId);
      void refreshAll();
    }, 6000);
    return () => {
      closeTaskStream();
      closeApprovalStream();
      window.clearInterval(timer);
    };
  }, [currentTaskId, refreshTaskRuntime, refreshAll, applyStreamEvent]);

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
        <ApprovalQueue approvals={approvals} onChanged={() => void refreshAll()} />
      </div>
      <div className="list">
        <CurrentActionPanel runtime={currentRuntime} />
        <PhaseTracker runtime={currentRuntime} />
        <ImplementationStepsPanel runtime={currentRuntime} />
        <SubagentPanel runtime={currentRuntime} />
      </div>
    </div>
  );
}

