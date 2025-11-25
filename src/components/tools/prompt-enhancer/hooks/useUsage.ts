import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UsageInfo, UsageResponseData, OwnerType, Plan, PlanEntitlements } from '../types';
import { getUsage } from '../api';

interface UseUsageResult {
  usage: UsageInfo | null;
  dailyUsage: UsageInfo | null;
  monthlyUsage: UsageInfo | null;
  creditsBalanceTenths: number | null;
  ownerType: OwnerType | null;
  plan: Plan | null;
  entitlements: PlanEntitlements | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUsage(): UseUsageResult {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [dailyUsage, setDailyUsage] = useState<UsageInfo | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<UsageInfo | null>(null);
  const [creditsBalanceTenths, setCreditsBalanceTenths] = useState<number | null>(null);
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
        const resp = data.data as UsageResponseData;

        // Prefer extended dailyUsage (entitlement-based) when available; fall back to legacy usage
        const baseDaily = resp.dailyUsage
          ? {
              used: resp.dailyUsage.used,
              limit: resp.dailyUsage.limit,
              resetAt: resp.dailyUsage.resetAt,
            }
          : {
              used: resp.usage.used,
              limit: resp.usage.limit,
              resetAt: resp.usage.resetAt,
            };

        setUsage(baseDaily);
        setDailyUsage(
          resp.dailyUsage
            ? {
                used: resp.dailyUsage.used,
                limit: resp.dailyUsage.limit,
                resetAt: resp.dailyUsage.resetAt,
              }
            : null
        );

        setMonthlyUsage(
          resp.monthlyUsage
            ? {
                used: resp.monthlyUsage.used,
                limit: resp.monthlyUsage.limit,
                resetAt: resp.monthlyUsage.resetAt,
              }
            : null
        );

        setCreditsBalanceTenths(
          typeof resp.creditsBalanceTenths === 'number' ? resp.creditsBalanceTenths : null
        );

        setOwnerType(resp.ownerType);
        setPlan(resp.plan ?? null);
        try {
          setEntitlements(resp.entitlements || null);
        } catch {
          setEntitlements(null);
        }
      } else {
        setError(data.error?.message || 'Failed to load usage');
      }
    } catch (_e) {
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
    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const onAuthChanged = () => {
      void refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth:changed') {
        void refresh();
      }
    };
    const onPageShow = () => {
      void refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('auth:changed', onAuthChanged as EventListener);
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('auth:changed', onAuthChanged as EventListener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [refresh]);

  return {
    usage,
    dailyUsage,
    monthlyUsage,
    creditsBalanceTenths,
    ownerType,
    plan,
    entitlements,
    loading,
    error,
    refresh,
  };
}
