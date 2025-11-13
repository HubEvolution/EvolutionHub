import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminMetrics,
  type AdminMetricsResponse,
  AdminApiError,
} from '@/lib/admin/api-client';

interface MetricsState {
  metrics?: AdminMetricsResponse;
  loading: boolean;
  error?: string;
}

export function useAdminMetrics() {
  const [state, setState] = useState<MetricsState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  const runFetch = useCallback((controller: AbortController) => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    fetchAdminMetrics(controller.signal)
      .then((metrics) => {
        setState({ metrics, loading: false });
      })
      .catch((error) => {
        if ((error as DOMException)?.name === 'AbortError') return;
        if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
          const timeoutId = window.setTimeout(() => {
            const next = new AbortController();
            controllerRef.current = next;
            runFetch(next);
          }, ms);
          retryTimeoutRef.current = timeoutId as unknown as number;
          setState((prev) => ({ ...prev, loading: true }));
          return;
        }
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setState({ loading: false, error: message });
      });
  }, []);

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
