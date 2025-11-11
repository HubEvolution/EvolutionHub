import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminStatusResponse } from '@/lib/admin/api-client';
import { fetchAdminStatus } from '@/lib/admin/api-client';

interface StatusState {
  data?: AdminStatusResponse;
  loading: boolean;
  error?: string;
}

export function useAdminStatus() {
  const [state, setState] = useState<StatusState>({ loading: true });
  const controllerRef = useRef<AbortController | null>(null);

  const runFetch = useCallback((controller: AbortController) => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    fetchAdminStatus(controller.signal)
      .then((data) => {
        setState({ data, loading: false });
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
    status: state.data,
    loading: state.loading,
    error: state.error,
    reload: load,
  };
}
