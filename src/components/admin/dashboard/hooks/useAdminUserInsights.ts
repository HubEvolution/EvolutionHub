import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminUserSummary,
  fetchAdminUserSessions,
  revokeAdminUserSessions,
  type AdminUserSummaryResponse,
  type AdminUserSessionsResponse,
} from '@/lib/admin/api-client';
import { AdminApiError } from '@/lib/admin/api-client';

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
  const retryTimeoutRef = useRef<number | null>(null);

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
      if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
        const timeoutId = window.setTimeout(() => {
          const next = new AbortController();
          controllerRef.current = next;
          const params2 = query.includes('@') ? { email: query.toLowerCase() } : { id: query };
          fetchAdminUserSummary(params2, next.signal)
            .then((data) => {
              setState((prev) => ({
                ...prev,
                summary: data,
                loading: false,
                error: undefined,
              }));
            })
            .catch((e) => {
              if ((e as DOMException)?.name === 'AbortError') return;
              const message = e instanceof Error ? e.message : 'Lookup fehlgeschlagen.';
              setState((prev) => ({ ...prev, loading: false, error: message }));
            });
        }, ms);
        retryTimeoutRef.current = timeoutId as unknown as number;
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      const data = await fetchAdminUserSessions({ userId });
      setState((prev) => ({
        ...prev,
        sessions: data.items ?? [],
        sessionsLoading: false,
      }));
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
        const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
        const timeoutId = window.setTimeout(() => {
          fetchAdminUserSessions({ userId })
            .then((data) => {
              setState((prev) => ({ ...prev, sessions: data.items ?? [], sessionsLoading: false }));
            })
            .catch((e) => {
              const msg =
                e instanceof Error ? e.message : 'Sitzungen konnten nicht geladen werden.';
              setState((prev) => ({ ...prev, sessionsLoading: false, sessionsError: msg }));
            });
        }, ms);
        retryTimeoutRef.current = timeoutId as unknown as number;
        return;
      }
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

  useEffect(() => {
    return () => {
      try {
        controllerRef.current?.abort();
      } catch {}
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

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
