'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.selectQuickActionLoadingState =
  exports.selectQuickActionById =
  exports.selectQuickActions =
    void 0;
const zustand_1 = require('zustand');
const parsePerformActionResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {};
  }
  return await response.json();
};
const useQuickActionStore = (0, zustand_1.create)((set, get) => ({
  actions: [],
  loading: false,
  error: null,
  setActions: (actions) =>
    set({
      actions: actions.map((action) => ({ ...action, status: 'idle' })),
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
exports.default = useQuickActionStore;
const selectQuickActions = (state) => state.actions;
exports.selectQuickActions = selectQuickActions;
const selectQuickActionById = (id) => (state) =>
  state.actions.find((action) => action.id === id) ?? null;
exports.selectQuickActionById = selectQuickActionById;
const selectQuickActionLoadingState = (state) => ({
  loading: state.loading,
  error: state.error,
});
exports.selectQuickActionLoadingState = selectQuickActionLoadingState;
