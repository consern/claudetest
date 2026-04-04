import { create } from 'zustand';
import { getApprovals } from '../api/approvals';
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
  }
}));

