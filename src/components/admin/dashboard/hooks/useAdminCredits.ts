import { useCallback, useState } from 'react';
import {
  fetchAdminCreditsHistory,
  fetchAdminCreditsUsage,
  type AdminCreditsHistoryResponse,
  type AdminCreditsUsageResponse,
} from '@/lib/admin/api-client';

interface CreditsState {
  usage?: AdminCreditsUsageResponse;
  history: AdminCreditsHistoryResponse['items'];
  loading: boolean;
  historyLoading: boolean;
  error?: string;
  historyError?: string;
}

export function useAdminCredits() {
  const [state, setState] = useState<CreditsState>({
    history: [],
    loading: false,
    historyLoading: false,
  });

  const loadUsage = useCallback(async (userId: string) => {
    if (!userId) {
      setState((prev) => ({ ...prev, error: 'Benutzer-ID erforderlich.' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const usage = await fetchAdminCreditsUsage({ userId });
      setState((prev) => ({ ...prev, usage, loading: false }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Credits konnten nicht geladen werden.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const loadHistory = useCallback(async (userId: string) => {
    if (!userId) {
      setState((prev) => ({ ...prev, historyError: 'Benutzer-ID erforderlich.' }));
      return;
    }

    setState((prev) => ({ ...prev, historyLoading: true, historyError: undefined }));
    try {
      const history = await fetchAdminCreditsHistory({ userId });
      setState((prev) => ({ ...prev, history: history.items ?? [], historyLoading: false }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Historie konnte nicht geladen werden.';
      setState((prev) => ({ ...prev, historyLoading: false, historyError: message }));
    }
  }, []);

  return {
    usage: state.usage,
    history: state.history,
    loading: state.loading,
    historyLoading: state.historyLoading,
    error: state.error,
    historyError: state.historyError,
    loadUsage,
    loadHistory,
  };
}
