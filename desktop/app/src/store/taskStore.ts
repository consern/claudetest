import { create } from 'zustand';
import { getApprovals } from '../api/approvals';
import type { StreamEnvelope } from '../api/events';
import { getProjects } from '../api/projects';
import { getReviews } from '../api/reviews';
import { getSessions } from '../api/sessions';
import { getTask, getTasks } from '../api/tasks';
import type { ApiApproval, ApiProject, ApiTask, ApiTaskRuntime } from '../types/workbench';
import { applyApprovalStreamEvent, applyRuntimeStreamEvent } from './eventReducers';

interface TaskStore {
  projects: ApiProject[];
  tasks: ApiTask[];
  sessions: Array<{ id: string; path: string }>;
  reviews: Array<{ taskId: string; fixNow: number; fixLater: number; ignore: number; lifecycle: number }>;
  approvals: ApiApproval[];
  currentRuntime?: ApiTaskRuntime;
  lastEventTs?: string;
  refreshAll: () => Promise<void>;
  refreshApprovals: () => Promise<void>;
  refreshTaskRuntime: (taskId: string) => Promise<void>;
  applyStreamEvent: (event: StreamEnvelope) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  projects: [],
  tasks: [],
  sessions: [],
  reviews: [],
  approvals: [],
  lastEventTs: undefined,
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
  refreshApprovals: async () => {
    const approvals = await getApprovals();
    set({ approvals });
  },
  refreshTaskRuntime: async (taskId: string) => {
    const runtime = await getTask(taskId);
    set({ currentRuntime: runtime });
  },
  applyStreamEvent: (event) => {
    set((state) => {
      const nextRuntime = applyRuntimeStreamEvent(state.currentRuntime, event);
      const nextApprovals = applyApprovalStreamEvent(state.approvals, event);
      return {
        ...state,
        lastEventTs: event.timestamp,
        currentRuntime: nextRuntime,
        approvals: nextApprovals
      };
    });
  }
}));
