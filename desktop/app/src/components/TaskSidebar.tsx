import type { ApiTask } from '../types/workbench';

interface Props {
  projectName?: string;
  tasks: ApiTask[];
  selectedTaskId?: string;
  onSelectTask: (id: string) => void;
}

export function TaskSidebar(props: Props) {
  const badge = (status: ApiTask['status']): string => {
    if (status === 'blocked') {
      return 'blocked';
    }
    if (status === 'reviewing') {
      return 'reviewing';
    }
    if (status === 'running') {
      return 'running';
    }
    return status;
  };
  return (
    <div className="panel">
      <h3>Tasks</h3>
      <div className="muted">Project: {props.projectName ?? 'none'}</div>
      <div className="list" style={{ marginTop: 10 }}>
        {props.tasks.map((task) => (
          <button
            className="secondary"
            style={{
              textAlign: 'left',
              borderColor: props.selectedTaskId === task.id ? '#8aa2ff' : undefined
            }}
            key={task.id}
            onClick={() => props.onSelectTask(task.id)}
          >
            <div>{task.title.slice(0, 28)}</div>
            <div className="muted">
              {task.mode} | {task.status}
            </div>
            <div className={`task-badge status-${task.status}`}>{badge(task.status)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

