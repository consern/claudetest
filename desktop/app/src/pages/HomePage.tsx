import { useEffect, useMemo, useState } from 'react';
import { startTask } from '../api/tasks';
import { HomeComposer } from '../components/HomeComposer';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';

export function HomePage() {
  const { projects, tasks, sessions, reviews, approvals, refreshAll } = useTaskStore();
  const { currentProjectId, setProjectId, selectedMode, setMode, setTaskId } = useAppStore();
  const { lastStartupNote } = useUiStore();
  const [taskText, setTaskText] = useState('');

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const attention = useMemo(
    () => ({
      pendingApprovals: approvals.length,
      blockedTasks: tasks.filter((task) => task.status === 'blocked').length,
      reviewingTasks: tasks.filter((task) => task.status === 'reviewing').length,
      reviews: reviews.length
    }),
    [approvals.length, tasks, reviews.length]
  );

  return (
    <div className="layout list">
      <HomeComposer
        taskText={taskText}
        mode={selectedMode}
        projectId={currentProjectId}
        projects={projects}
        onTaskText={setTaskText}
        onMode={setMode}
        onProject={(id) => setProjectId(id || undefined)}
        onQuickAction={(preset, mode) => {
          setTaskText(preset);
          setMode(mode);
        }}
        onStart={async () => {
          if (!taskText.trim()) {
            return;
          }
          const task = await startTask({
            title: taskText,
            mode: selectedMode,
            projectId: currentProjectId
          });
          setTaskId(task.id);
          setTaskText('');
          await refreshAll();
        }}
      />

      <div className="panel">
        <h3>System Status</h3>
        <div className="muted">{lastStartupNote}</div>
      </div>

      <div className="panel">
        <h3>Needs Attention</h3>
        <div className="home-recent-grid">
          <div className="recent-item">
            <div className="muted">Pending Approvals</div>
            <div>{attention.pendingApprovals}</div>
          </div>
          <div className="recent-item">
            <div className="muted">Blocked Tasks</div>
            <div>{attention.blockedTasks}</div>
          </div>
          <div className="recent-item">
            <div className="muted">Reviewing Tasks</div>
            <div>{attention.reviewingTasks}</div>
          </div>
        </div>
      </div>

      <div className="home-recent-grid">
        <div className="panel">
          <h3>Recent Tasks</h3>
          <div className="list">
            {tasks.slice(0, 6).map((task) => (
              <button key={task.id} className="secondary" onClick={() => setTaskId(task.id)}>
                <div style={{ textAlign: 'left' }}>{task.title}</div>
                <div className="muted" style={{ textAlign: 'left' }}>
                  {task.mode} | {task.status}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Recent Sessions</h3>
          <div className="list">
            {sessions.slice(0, 6).map((session) => (
              <div key={session.id} className="recent-item">
                <div className="muted">{session.id}</div>
                <div className="muted">{session.path}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Recent Reviews</h3>
          <div className="list">
            {reviews.slice(0, 6).map((review) => (
              <div key={review.taskId} className="recent-item">
                <div className="muted">task: {review.taskId.slice(0, 8)}</div>
                <div className="muted">
                  fixNow {review.fixNow} · fixLater {review.fixLater} · ignore {review.ignore}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
