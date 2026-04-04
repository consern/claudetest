import { create } from 'zustand';
import type { AgentMode } from '../types/workbench';

interface AppStore {
  currentProjectId?: string;
  currentTaskId?: string;
  selectedMode: AgentMode;
  setProjectId: (id: string | undefined) => void;
  setTaskId: (id: string | undefined) => void;
  setMode: (mode: AgentMode) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedMode: 'normal',
  setProjectId: (id) => set({ currentProjectId: id }),
  setTaskId: (id) => set({ currentTaskId: id }),
  setMode: (mode) => set({ selectedMode: mode })
}));

