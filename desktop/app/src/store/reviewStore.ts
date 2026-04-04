import { create } from 'zustand';

interface ReviewStore {
  selectedFindingId?: string;
  setSelectedFindingId: (id: string | undefined) => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  selectedFindingId: undefined,
  setSelectedFindingId: (id) => set({ selectedFindingId: id })
}));

