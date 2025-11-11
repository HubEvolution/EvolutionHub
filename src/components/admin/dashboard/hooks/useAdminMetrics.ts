import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminMetrics, type AdminMetricsResponse } from '@/lib/admin/api-client';

interface MetricsState {
  metrics?: AdminMetricsResponse;
  loading: boolean;
  error?: string;
}

export function useAdminMetrics() {
  const [state, setState] = useState<MetricsState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);

  const runFetch = useCallback((controller: AbortController) => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    fetchAdminMetrics(controller.signal)
      .then((metrics) => {
        setState({ metrics, loading: false });
      })
      .catch((error) => {
        if ((error as DOMException)?.name === 'AbortError') return;
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setState({ loading: false, error: message });
      });
  }, []);

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
    metrics: state.metrics,
    loading: state.loading,
    error: state.error,
    reload: load,
  };
}
