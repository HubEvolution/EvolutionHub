import { create } from 'zustand';
import type { QuickAction } from '../types/dashboard';

type QuickActionStatus = 'idle' | 'loading' | 'success' | 'error';

type QuickActionEntry = QuickAction & {
  status: QuickActionStatus;
  lastExecutedAt?: string;
};

interface QuickActionState {
  actions: QuickActionEntry[];
  loading: boolean;
  error: string | null;
  setActions: (actions: QuickAction[]) => void;
  updateActionStatus: (id: string, status: QuickActionStatus) => void;
  executeAction: (actionName: string) => Promise<void>;
}

type PerformActionResponse = {
  redirect?: string;
  message?: string;
};

const parsePerformActionResponse = async (response: Response): Promise<PerformActionResponse> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {};
  }
  return (await response.json()) as PerformActionResponse;
};

const useQuickActionStore = create<QuickActionState>((set, get) => ({
  actions: [],
  loading: false,
  error: null,

  setActions: (actions) =>
    set({
      actions: actions.map<QuickActionEntry>((action) => ({ ...action, status: 'idle' })),
    }),

  updateActionStatus: (id, status) =>
    set((state) => ({
      actions: state.actions.map((action) =>
        action.id === id
          ? {
              ...action,
              status,
              lastExecutedAt: ['success', 'error'].includes(status)
                ? new Date().toISOString()
                : action.lastExecutedAt,
            }
          : action
      ),
    })),

  executeAction: async (actionName) => {
    const action = get().actions.find(
      (item) => item.action === actionName || item.id === actionName
    );
    const targetActionId = action?.id ?? actionName;

    set({ loading: true, error: null });
    if (action) {
      get().updateActionStatus(targetActionId, 'loading');
    }

    try {
      const response = await fetch('/api/dashboard/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ action: actionName }),
      });

      const result = await parsePerformActionResponse(response);

      if (result.redirect) {
        window.location.href = result.redirect;
        return;
      }

      get().updateActionStatus(targetActionId, 'success');
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (action) {
        get().updateActionStatus(targetActionId, 'error');
      }
      set({ error: errorMessage, loading: false });
    }
  },
}));

export default useQuickActionStore;
export const selectQuickActions = (state: QuickActionState) => state.actions;
export const selectQuickActionById = (id: string) => (state: QuickActionState) =>
  state.actions.find((action) => action.id === id) ?? null;
export const selectQuickActionLoadingState = (state: QuickActionState) => ({
  loading: state.loading,
  error: state.error,
});
