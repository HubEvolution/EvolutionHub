import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminStatusResponse } from '@/lib/admin/api-client';
import { AdminApiError, fetchAdminStatus } from '@/lib/admin/api-client';
import { getAdminStrings } from '@/lib/i18n-admin';

interface StatusState {
  data?: AdminStatusResponse;
  loading: boolean;
  error?: string;
}

export function useAdminStatus() {
  const strings = getAdminStrings();
  const [state, setState] = useState<StatusState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);

  const resolveErrorMessage = useCallback(
    (error: unknown, defaultMessage: string): string => {
      if (error instanceof AdminApiError && error.status === 429) {
        const sec = error.retryAfterSec;
        if (typeof sec === 'number' && Number.isFinite(sec) && sec > 0) {
          const minutes = Math.max(1, Math.ceil(sec / 60));
          return strings.errors.rateLimitWithRetryAfter.replace('{minutes}', String(minutes));
        }
        return strings.errors.rateLimit;
      }
      return error instanceof Error ? error.message : defaultMessage;
    },
    [strings.errors.rateLimit, strings.errors.rateLimitWithRetryAfter]
  );

  const runFetch = useCallback(
    (controller: AbortController) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      fetchAdminStatus(controller.signal)
        .then((data) => {
          setState({ data, loading: false });
        })
        .catch((error) => {
          if ((error as DOMException)?.name === 'AbortError') return;
          const message = resolveErrorMessage(error, strings.errors.userListLoad);
          setState({ loading: false, error: message });
        });
    },
    [resolveErrorMessage, strings.errors.userListLoad]
  );

  const load = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    runFetch(controller);
  }, [runFetch]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  return {
    status: state.data,
    loading: state.loading,
    error: state.error,
    reload: load,
  };
}
