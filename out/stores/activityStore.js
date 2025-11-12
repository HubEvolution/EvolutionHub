'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const zustand_1 = require('zustand');
const useActivityStore = (0, zustand_1.create)((set) => ({
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
exports.default = useActivityStore;
