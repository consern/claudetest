const API_BASE = 'http://127.0.0.1:4317';

export interface StreamEnvelope {
  type: string;
  taskId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type StreamHealth = 'connecting' | 'connected' | 'error' | 'closed';

function openStream(
  path: string,
  onEvent: (event: StreamEnvelope) => void,
  onHealth?: (health: StreamHealth) => void
): () => void {
  const source = new EventSource(`${API_BASE}${path}`);
  onHealth?.('connecting');
  source.onopen = () => {
    onHealth?.('connected');
  };
  source.onerror = () => {
    onHealth?.('error');
  };
  const handler = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as StreamEnvelope;
      onEvent(payload);
    } catch {
      // ignore malformed payload
    }
  };

  source.onmessage = handler;
  source.addEventListener('task_state', handler as unknown as EventListener);
  source.addEventListener('telemetry', handler as unknown as EventListener);
  source.addEventListener('tool_event', handler as unknown as EventListener);
  source.addEventListener('audit_event', handler as unknown as EventListener);
  source.addEventListener('approval_added', handler as unknown as EventListener);
  source.addEventListener('approval_resolved', handler as unknown as EventListener);
  source.addEventListener('review_rework', handler as unknown as EventListener);

  return () => {
    onHealth?.('closed');
    source.close();
  };
}

export function openTaskEventsStream(
  taskId: string,
  onEvent: (event: StreamEnvelope) => void,
  onHealth?: (health: StreamHealth) => void
): () => void {
  return openStream(`/api/tasks/${taskId}/events`, onEvent, onHealth);
}

export function openTaskApprovalsStream(
  taskId: string,
  onEvent: (event: StreamEnvelope) => void,
  onHealth?: (health: StreamHealth) => void
): () => void {
  return openStream(`/api/tasks/${taskId}/approvals/stream`, onEvent, onHealth);
}

export function openTaskAuditStream(
  taskId: string,
  onEvent: (event: StreamEnvelope) => void,
  onHealth?: (health: StreamHealth) => void
): () => void {
  return openStream(`/api/tasks/${taskId}/audit/stream`, onEvent, onHealth);
}
