import { create } from 'zustand';
import type { ActivityItem } from '../types/dashboard';

interface ActivityState {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  fetchActivities: () => Promise<void>;
  addActivity: (activity: ActivityItem) => void;
  setActivities: (activities: ActivityItem[]) => void;
}

const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  loading: false,
  error: null,

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),

  fetchActivities: async () => {
    set({ loading: true, error: null });

    try {
      // In a real application, this would fetch from an API
      // For now, we'll just set a mock state
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  },
}));

export default useActivityStore;
