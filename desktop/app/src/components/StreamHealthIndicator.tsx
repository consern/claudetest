import type { StreamHealth } from '../api/events';
import { selectRealtimeSummary } from '../store/runtimeSelectors';

interface Props {
  streamHealth: Record<'task' | 'approvals' | 'audit', StreamHealth>;
  fallbackPolling: boolean;
}

export function StreamHealthIndicator({ streamHealth, fallbackPolling }: Props) {
  const summary = selectRealtimeSummary(streamHealth, fallbackPolling);

  return (
    <div className={`panel ${summary.degraded ? 'panel-blocked' : ''}`}>
      <h3>Realtime</h3>
      <div className={summary.degraded ? 'blocked-banner' : 'muted'}>
        {summary.degraded ? 'Realtime degraded · fallback polling active' : 'Realtime healthy'}
      </div>
      <div className="muted">task stream: {summary.task}</div>
      <div className="muted">approval stream: {summary.approvals}</div>
      <div className="muted">audit stream: {summary.audit}</div>
      <div className="muted">fallback polling: {fallbackPolling ? 'on' : 'off'}</div>
    </div>
  );
}
