import { useEffect, useState } from 'react';
import { startTask } from '../api/tasks';
import { HomeComposer } from '../components/HomeComposer';
import { useAppStore } from '../store/appStore';
import { useTaskStore } from '../store/taskStore';

export function HomePage() {
  const { projects, tasks, sessions, refreshAll } = useTaskStore();
  const { currentProjectId, setProjectId, selectedMode, setMode, setTaskId } = useAppStore();
  const [taskText, setTaskText] = useState('');

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

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
        <h3>Recent Tasks</h3>
        <div className="list">
          {tasks.slice(0, 6).map((task) => (
            <div key={task.id}>
              {task.title}
              <div className="muted">
                {task.mode} | {task.status}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3>Recent Sessions</h3>
        <div className="list">
          {sessions.slice(0, 6).map((session) => (
            <div key={session.id} className="muted">
              {session.id}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

