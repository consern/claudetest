import type { ApiTaskRuntime } from '../types/workbench';

interface Props {
  runtime?: ApiTaskRuntime;
}

export function MainThreadView({ runtime }: Props) {
  return (
    <div className="panel">
      <h3>Main Thread</h3>
      {!runtime ? <div className="muted">No task selected</div> : null}
      <div className="list">
        {runtime?.history.slice(-12).map((message) => (
          <div key={message.id} className="panel">
            <div className="muted">{message.role}</div>
            <div>{message.content.slice(0, 500)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

