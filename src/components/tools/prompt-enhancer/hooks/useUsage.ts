import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UsageInfo, UsageResponseData, ApiSuccess, ApiErrorBody, OwnerType, Plan, PlanEntitlements } from '../types';
import { getUsage } from '../api';

interface UseUsageResult {
  usage: UsageInfo | null;
  ownerType: OwnerType | null;
  plan: Plan | null;
  entitlements: PlanEntitlements | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUsage(): UseUsageResult {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [ownerType, setOwnerType] = useState<OwnerType | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isDebug = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams;
      return qp.get('debug_usage') === '1' || localStorage.getItem('debug_usage') === '1';
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsage(isDebug);
      if ('success' in data && data.success) {
        setUsage(data.data.usage);
        setOwnerType(data.data.ownerType);
        setPlan((data.data as UsageResponseData).plan ?? null);
        try {
          setEntitlements((data.data as UsageResponseData).entitlements || null);
        } catch {
          setEntitlements(null);
        }
      } else {
        setError(data.error?.message || 'Failed to load usage');
      }
    } catch (e) {
      setError('Failed to load usage');
    } finally {
      setLoading(false);
    }
  }, [isDebug]);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-refresh on focus/visibility/auth-change/storage/pageshow
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') { void refresh(); } };
    const onAuthChanged = () => { void refresh(); };
    const onStorage = (e: StorageEvent) => { if (e.key === 'auth:changed') { void refresh(); } };
    const onPageShow = () => { void refresh(); };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('auth:changed', onAuthChanged as any);
    window.addEventListener('storage', onStorage as any);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('auth:changed', onAuthChanged as any);
      window.removeEventListener('storage', onStorage as any);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refresh]);

  return { usage, ownerType, plan, entitlements, loading, error, refresh };
}