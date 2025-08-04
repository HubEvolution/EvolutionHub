import { create } from 'zustand';
import type { QuickAction } from '../types/dashboard';

interface QuickActionState {
  actions: QuickAction[];
  loading: boolean;
  error: string | null;
  setActions: (actions: QuickAction[]) => void;
  updateActionStatus: (id: string, status: 'idle' | 'loading' | 'success' | 'error') => void;
  executeAction: (actionName: string) => Promise<void>;
}

const useQuickActionStore = create<QuickActionState>((set, get) => ({
  actions: [],
  loading: false,
  error: null,
  
  setActions: (actions) => set({ actions }),
  
  updateActionStatus: (id, status) => set((state) => ({
    actions: state.actions.map(action => 
      action.id === id ? { ...action, status } : action
    )
  })),
  
  executeAction: async (actionName) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch('/api/dashboard/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: actionName }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Handle action-specific results
      if (result.redirect) {
        window.location.href = result.redirect;
      }
      
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  }
}));

export default useQuickActionStore;