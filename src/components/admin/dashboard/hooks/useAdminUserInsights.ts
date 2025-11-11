import { useCallback, useRef, useState } from 'react';
import {
  fetchAdminUserSummary,
  fetchAdminUserSessions,
  revokeAdminUserSessions,
  type AdminUserSummaryResponse,
  type AdminUserSessionsResponse,
} from '@/lib/admin/api-client';

interface UserInsightsState {
  summary?: AdminUserSummaryResponse;
  sessions: AdminUserSessionsResponse['items'];
  loading: boolean;
  sessionsLoading: boolean;
  actionLoading: boolean;
  error?: string;
  sessionsError?: string;
}

export function useAdminUserInsights() {
  const [state, setState] = useState<UserInsightsState>({
    sessions: [],
    loading: false,
    sessionsLoading: false,
    actionLoading: false,
  });

  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (identifier: string) => {
    const query = identifier.trim();
    if (!query) {
      setState((prev) => ({ ...prev, error: 'Bitte E-Mail oder Benutzer-ID eingeben.' }));
      return undefined;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const params = query.includes('@') ? { email: query.toLowerCase() } : { id: query };
      const data = await fetchAdminUserSummary(params, controller.signal);
      setState((prev) => ({
        ...prev,
        summary: data,
        loading: false,
        error: undefined,
      }));
      return data;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        return undefined;
      }
      const message = error instanceof Error ? error.message : 'Lookup fehlgeschlagen.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const loadSessions = useCallback(async (userId: string) => {
    if (!userId) return;
    setState((prev) => ({ ...prev, sessionsLoading: true, sessionsError: undefined }));
    try {
      const data = await fetchAdminUserSessions({ userId });
      setState((prev) => ({
        ...prev,
        sessions: data.items ?? [],
        sessionsLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sitzungen konnten nicht geladen werden.';
      setState((prev) => ({ ...prev, sessionsLoading: false, sessionsError: message }));
    }
  }, []);

  const revokeSessions = useCallback(
    async (userId: string) => {
      if (!userId) return;
      setState((prev) => ({ ...prev, actionLoading: true, sessionsError: undefined }));
      try {
        await revokeAdminUserSessions({ userId });
        await loadSessions(userId);
        setState((prev) => ({ ...prev, actionLoading: false }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Sitzungen konnten nicht widerrufen werden.';
        setState((prev) => ({ ...prev, actionLoading: false, sessionsError: message }));
      }
    },
    [loadSessions]
  );

  return {
    summary: state.summary,
    sessions: state.sessions,
    loading: state.loading,
    sessionsLoading: state.sessionsLoading,
    actionLoading: state.actionLoading,
    error: state.error,
    sessionsError: state.sessionsError,
    search,
    loadSessions,
    revokeSessions,
  };
}
