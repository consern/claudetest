import type { AgentMode } from '../types/workbench';

interface Props {
  taskText: string;
  mode: AgentMode;
  projectId?: string;
  projects: Array<{ id: string; name: string }>;
  onTaskText: (value: string) => void;
  onMode: (value: AgentMode) => void;
  onProject: (value: string) => void;
  onStart: () => void;
}

export function HomeComposer(props: Props) {
  return (
    <div className="panel">
      <h3>Start Work</h3>
      <div className="list">
        <div>
          <div className="muted">Project</div>
          <select value={props.projectId ?? ''} onChange={(e) => props.onProject(e.target.value)}>
            <option value="">Select Project</option>
            {props.projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted">Mode</div>
          <select value={props.mode} onChange={(e) => props.onMode(e.target.value as AgentMode)}>
            <option value="normal">normal</option>
            <option value="feature-dev">feature-dev</option>
            <option value="review">review</option>
            <option value="patch">patch</option>
            <option value="rework">rework</option>
          </select>
        </div>
        <div>
          <div className="muted">Task</div>
          <textarea
            rows={4}
            value={props.taskText}
            onChange={(e) => props.onTaskText(e.target.value)}
            placeholder="Describe a coding task"
          />
        </div>
        <div className="row">
          <div>
            <span className="chip">Start Task</span>
            <span className="chip">Start Feature Workflow</span>
            <span className="chip">Review Latest Changes</span>
          </div>
          <button onClick={props.onStart}>Run</button>
        </div>
      </div>
    </div>
  );
}

