import { useCallback, useState } from 'react';
import {
  adminDeductCredits,
  adminGrantCredits,
  fetchAdminCreditsHistory,
  fetchAdminCreditsUsage,
  type AdminCreditsHistoryResponse,
  type AdminCreditsUsageResponse,
} from '@/lib/admin/api-client';
import { getAdminStrings } from '@/lib/i18n-admin';

interface CreditsState {
  usage?: AdminCreditsUsageResponse;
  history: AdminCreditsHistoryResponse['items'];
  loading: boolean;
  historyLoading: boolean;
  error?: string;
  historyError?: string;
   actionLoading: boolean;
   actionError?: string;
}

export function useAdminCredits() {
  const strings = getAdminStrings();
  const [state, setState] = useState<CreditsState>({
    history: [],
    loading: false,
    historyLoading: false,
    actionLoading: false,
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
        error instanceof Error ? error.message : strings.errors.creditsUsage;
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [strings.errors.creditsUsage]);

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
        error instanceof Error ? error.message : strings.errors.creditsHistory;
      setState((prev) => ({ ...prev, historyLoading: false, historyError: message }));
    }
  }, [strings.errors.creditsHistory]);

  const grantCredits = useCallback(
    async (email: string, amountRaw: string | undefined) => {
      const emailTrimmed = email.trim();
      if (!emailTrimmed) {
        setState((prev) => ({ ...prev, actionError: strings.errors.creditsGrant }));
        return;
      }

      setState((prev) => ({ ...prev, actionLoading: true, actionError: undefined }));
      try {
        const amount = amountRaw && amountRaw.trim().length > 0 ? amountRaw.trim() : undefined;
        await adminGrantCredits({ email: emailTrimmed, amount });
        setState((prev) => ({ ...prev, actionLoading: false }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : strings.errors.creditsGrant;
        setState((prev) => ({ ...prev, actionLoading: false, actionError: message }));
        throw error;
      }
    },
    [strings.errors.creditsGrant]
  );

  const deductCredits = useCallback(
    async (email: string, amountRaw: string | undefined) => {
      const emailTrimmed = email.trim();
      if (!emailTrimmed) {
        setState((prev) => ({ ...prev, actionError: strings.errors.creditsDeduct }));
        return;
      }

      setState((prev) => ({ ...prev, actionLoading: true, actionError: undefined }));
      try {
        const amount = amountRaw && amountRaw.trim().length > 0 ? amountRaw.trim() : undefined;
        await adminDeductCredits({ email: emailTrimmed, amount });
        setState((prev) => ({ ...prev, actionLoading: false }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : strings.errors.creditsDeduct;
        setState((prev) => ({ ...prev, actionLoading: false, actionError: message }));
        throw error;
      }
    },
    [strings.errors.creditsDeduct]
  );

  return {
    usage: state.usage,
    history: state.history,
    loading: state.loading,
    historyLoading: state.historyLoading,
    error: state.error,
    historyError: state.historyError,
    actionLoading: state.actionLoading,
    actionError: state.actionError,
    loadUsage,
    loadHistory,
    grantCredits,
    deductCredits,
  };
}
