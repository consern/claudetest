import type { AgentMode } from '../types/workbench';

interface Props {
  taskText: string;
  mode: AgentMode;
  projectId?: string;
  projects: Array<{ id: string; name: string }>;
  onTaskText: (value: string) => void;
  onMode: (value: AgentMode) => void;
  onProject: (value: string) => void;
  onQuickAction: (preset: string, mode: AgentMode) => void;
  onStart: () => void;
}

export function HomeComposer(props: Props) {
  return (
    <div className="panel home-focus">
      <h3>What should the workbench do next?</h3>
      <p className="muted">
        Start from one concrete task. You can refine implementation and review decisions after execution begins.
      </p>
      <div className="list">
        <div className="row">
          <div style={{ flex: 1 }}>
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
          <div style={{ width: 220 }}>
            <div className="muted">Mode</div>
            <select value={props.mode} onChange={(e) => props.onMode(e.target.value as AgentMode)}>
              <option value="normal">normal</option>
              <option value="feature-dev">feature-dev</option>
              <option value="review">review</option>
              <option value="patch">patch</option>
              <option value="rework">rework</option>
            </select>
          </div>
        </div>
        <div>
          <div className="muted">Task</div>
          <textarea
            rows={5}
            value={props.taskText}
            onChange={(e) => props.onTaskText(e.target.value)}
            placeholder="Describe the task outcome, target files, and constraints."
          />
        </div>
        <div className="row">
          <div>
            <button
              className="secondary chip-btn"
              onClick={() => props.onQuickAction('Start Feature Workflow for this project', 'feature-dev')}
            >
              Start Feature Workflow
            </button>
            <button
              className="secondary chip-btn"
              onClick={() => props.onQuickAction('Review latest code changes and propose fixes', 'review')}
            >
              Review Latest Changes
            </button>
            <button
              className="secondary chip-btn"
              onClick={() => props.onQuickAction('Continue last blocked task', 'rework')}
            >
              Resume Blocked Task
            </button>
          </div>
          <button onClick={props.onStart}>Start Task</button>
        </div>
      </div>
    </div>
  );
}

