import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminMetrics,
  type AdminMetricsResponse,
  AdminApiError,
} from '@/lib/admin/api-client';
import { getAdminStrings } from '@/lib/i18n-admin';

interface MetricsState {
  metrics?: AdminMetricsResponse;
  loading: boolean;
  error?: string;
}

export function useAdminMetrics() {
  const strings = getAdminStrings();
  const [state, setState] = useState<MetricsState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  const resolveRateLimitMessage = useCallback(
    (error: AdminApiError): string => {
      if (error.retryAfterSec && Number.isFinite(error.retryAfterSec)) {
        const minutes = Math.max(1, Math.ceil(error.retryAfterSec / 60));
        return strings.errors.rateLimitWithRetryAfter.replace('{minutes}', String(minutes));
      }
      return strings.errors.rateLimit;
    },
    [strings.errors.rateLimit, strings.errors.rateLimitWithRetryAfter]
  );

  const runFetch = useCallback(
    (controller: AbortController) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      fetchAdminMetrics(controller.signal)
        .then((metrics) => {
          setState({ metrics, loading: false });
        })
        .catch((error) => {
          if ((error as DOMException)?.name === 'AbortError') return;
          if (error instanceof AdminApiError && error.status === 429) {
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            const ms = Math.max(0, Math.floor((error.retryAfterSec ?? 0) * 1000));
            const timeoutId = window.setTimeout(() => {
              const next = new AbortController();
              controllerRef.current = next;
              runFetch(next);
            }, ms);
            retryTimeoutRef.current = timeoutId as unknown as number;
            setState((prev) => ({
              ...prev,
              loading: true,
              error: resolveRateLimitMessage(error),
            }));
            return;
          }
          const message = error instanceof Error ? error.message : strings.errors.rateLimit;
          setState({ loading: false, error: message });
        });
    },
    [resolveRateLimitMessage, strings.errors.rateLimit]
  );

  const load = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    runFetch(controller);
  }, [runFetch]);

  useEffect(() => {
    load();
    return () => {
      controllerRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [load]);

  return {
    metrics: state.metrics,
    loading: state.loading,
    error: state.error,
    reload: load,
  };
}
