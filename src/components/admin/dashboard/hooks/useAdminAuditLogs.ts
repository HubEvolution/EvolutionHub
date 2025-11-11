import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminAuditLogs, type AdminAuditLogsResponse } from '@/lib/admin/api-client';

export interface AuditFilters {
  eventType?: string;
  userId?: string;
}

interface AuditState {
  items: AdminAuditLogsResponse['items'];
  loading: boolean;
  error?: string;
}

export function useAdminAuditLogs(initialFilters: AuditFilters = {}) {
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [state, setState] = useState<AuditState>({ items: [], loading: true });
  const controllerRef = useRef<AbortController | null>(null);

  const runFetch = useCallback((controller: AbortController, nextFilters: AuditFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    fetchAdminAuditLogs({ ...nextFilters, limit: 10 }, controller.signal)
      .then((data) => {
        setState({ items: data.items ?? [], loading: false });
      })
      .catch((error) => {
        if ((error as DOMException)?.name === 'AbortError') return;
        const message =
          error instanceof Error ? error.message : 'Audit-Logs konnten nicht geladen werden.';
        setState({ items: [], loading: false, error: message });
      });
  }, []);

  const load = useCallback(
    (nextFilters: AuditFilters = filters) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setFilters(nextFilters);
      runFetch(controller, nextFilters);
    },
    [filters, runFetch]
  );

  useEffect(() => {
    load(filters);
    return () => controllerRef.current?.abort();
  }, [load, filters]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    filters,
    reload: load,
  };
}
