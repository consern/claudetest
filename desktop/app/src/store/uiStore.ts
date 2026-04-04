import { create } from 'zustand';

interface UiStore {
  lastStartupNote: string;
  setLastStartupNote: (note: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  lastStartupNote: 'Service and desktop app are connected.',
  setLastStartupNote: (note) => set({ lastStartupNote: note })
}));

