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
      <h2>What should we build next?</h2>
      <p className="hero-sub">Describe one clear objective. Keep it concrete and actionable.</p>

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
            rows={6}
            value={props.taskText}
            onChange={(e) => props.onTaskText(e.target.value)}
            placeholder="Describe the target outcome, key constraints, and where changes should land."
          />
        </div>

        <div className="row">
          <div className="home-actions">
            <button
              className="secondary"
              onClick={() => props.onQuickAction('Start feature implementation for this project', 'feature-dev')}
            >
              Feature
            </button>
            <button
              className="secondary"
              onClick={() => props.onQuickAction('Review latest changes and propose fixes', 'review')}
            >
              Review
            </button>
            <button
              className="secondary"
              onClick={() => props.onQuickAction('Continue the blocked task and resolve blockers', 'rework')}
            >
              Resume
            </button>
          </div>
          <button onClick={props.onStart}>Start Work</button>
        </div>
      </div>
    </div>
  );
}
