import { create } from 'zustand';
import {
  openTaskApprovalsStream,
  openTaskAuditStream,
  openTaskEventsStream,
  type StreamEnvelope,
  type StreamHealth
} from '../api/events';

type StreamKind = 'task' | 'approvals' | 'audit';

interface EventStore {
  streamHealth: Record<StreamKind, StreamHealth>;
  fallbackPolling: boolean;
  activeTaskId?: string;
  startTaskStreams: (
    taskId: string,
    handlers: {
      onEvent: (event: StreamEnvelope) => void;
      onImportantRefresh: () => void;
    }
  ) => () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  streamHealth: {
    task: 'closed',
    approvals: 'closed',
    audit: 'closed'
  },
  fallbackPolling: false,
  activeTaskId: undefined,
  startTaskStreams: (taskId, handlers) => {
    set({
      activeTaskId: taskId,
      fallbackPolling: false,
      streamHealth: { task: 'connecting', approvals: 'connecting', audit: 'connecting' }
    });

    const updateHealth = (kind: StreamKind, health: StreamHealth): void => {
      set((state) => {
        const next = {
          ...state.streamHealth,
          [kind]: health
        };
        const fallbackPolling =
          next.task === 'error' || next.approvals === 'error' || next.audit === 'error';
        return { streamHealth: next, fallbackPolling };
      });
    };

    const closeTask = openTaskEventsStream(
      taskId,
      (event) => {
        handlers.onEvent(event);
        if (event.type === 'task_state' || event.type === 'review_rework') {
          handlers.onImportantRefresh();
        }
      },
      (health) => updateHealth('task', health)
    );

    const closeApprovals = openTaskApprovalsStream(
      taskId,
      (event) => {
        handlers.onEvent(event);
        handlers.onImportantRefresh();
      },
      (health) => updateHealth('approvals', health)
    );

    const closeAudit = openTaskAuditStream(
      taskId,
      (event) => {
        handlers.onEvent(event);
      },
      (health) => updateHealth('audit', health)
    );

    return () => {
      closeTask();
      closeApprovals();
      closeAudit();
      set({
        activeTaskId: undefined,
        fallbackPolling: false,
        streamHealth: {
          task: 'closed',
          approvals: 'closed',
          audit: 'closed'
        }
      });
    };
  }
}));

