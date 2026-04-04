import { create } from 'zustand';
import { getApprovals } from '../api/approvals';
import type { StreamEnvelope } from '../api/events';
import { getProjects } from '../api/projects';
import { getReviews } from '../api/reviews';
import { getSessions } from '../api/sessions';
import { getTask, getTasks } from '../api/tasks';
import type { ApiApproval, ApiProject, ApiTask, ApiTaskRuntime } from '../types/workbench';

interface TaskStore {
  projects: ApiProject[];
  tasks: ApiTask[];
  sessions: Array<{ id: string; path: string }>;
  reviews: Array<{ taskId: string; fixNow: number; fixLater: number; ignore: number; lifecycle: number }>;
  approvals: ApiApproval[];
  currentRuntime?: ApiTaskRuntime;
  refreshAll: () => Promise<void>;
  refreshTaskRuntime: (taskId: string) => Promise<void>;
  applyStreamEvent: (event: StreamEnvelope) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  projects: [],
  tasks: [],
  sessions: [],
  reviews: [],
  approvals: [],
  refreshAll: async () => {
    const [projects, tasks, sessions, reviews, approvals] = await Promise.all([
      getProjects(),
      getTasks(),
      getSessions(),
      getReviews(),
      getApprovals()
    ]);
    set({ projects, tasks, sessions, reviews, approvals });
  },
  refreshTaskRuntime: async (taskId: string) => {
    const runtime = await getTask(taskId);
    set({ currentRuntime: runtime });
  },
  applyStreamEvent: (event) => {
    set((state) => {
      if (!state.currentRuntime || state.currentRuntime.task.id !== event.taskId) {
        return state;
      }
      if (event.type === 'tool_event' && typeof event.payload?.event === 'string') {
        return {
          ...state,
          currentRuntime: {
            ...state.currentRuntime,
            toolEvents: [...state.currentRuntime.toolEvents, String(event.payload.event)].slice(-200)
          }
        };
      }
      if (event.type === 'telemetry') {
        return {
          ...state,
          currentRuntime: {
            ...state.currentRuntime,
            telemetry: {
              ...state.currentRuntime.telemetry,
              ...(event.payload as Partial<ApiTaskRuntime['telemetry']>)
            }
          }
        };
      }
      return state;
    });
  }
}));
