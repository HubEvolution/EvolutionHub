import { useCallback, useEffect, useState } from 'react';

interface UsageOverview {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number | null;
}

interface VideoUsageData {
  ownerType: 'user' | 'guest';
  limit: number;
  remaining: number;
  resetAt: number;
  usage: UsageOverview;
  plan?: string;
  entitlements: {
    monthlyCreditsTenths: number;
  };
  creditsBalanceTenths?: number | null;
}

interface UsageResponseSuccess {
  success: true;
  data: VideoUsageData;
}

interface UsageResponseError {
  success: false;
  error?: { message?: string };
}

type UsageResponse = UsageResponseSuccess | UsageResponseError;

interface UseVideoUsageResult {
  usage: UsageOverview | null;
  ownerType: 'user' | 'guest' | null;
  plan: string | null;
  creditsBalanceTenths: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVideoUsage(): UseVideoUsageResult {
  const [usage, setUsage] = useState<UsageOverview | null>(null);
  const [ownerType, setOwnerType] = useState<'user' | 'guest' | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [creditsBalanceTenths, setCreditsBalanceTenths] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/ai-video/usage', {
        method: 'GET',
        credentials: 'same-origin',
      });

      let data: UsageResponse | null = null;
      try {
        data = (await res.json()) as UsageResponse;
      } catch {
        data = null;
      }

      if (!res.ok || !data || !data.success || !data.data) {
        const message =
          data && 'error' in data && data.error?.message
            ? data.error.message
            : `Failed to load usage (${res.status})`;
        setError(message);
        return;
      }

      const payload = data.data;

      const overview: UsageOverview = {
        used: payload.usage.used,
        limit: payload.usage.limit,
        remaining: payload.remaining,
        resetAt: payload.usage.resetAt,
      };

      setUsage(overview);
      setOwnerType(payload.ownerType ?? null);
      setPlan(payload.plan ?? null);
      setCreditsBalanceTenths(
        typeof payload.creditsBalanceTenths === 'number' ? payload.creditsBalanceTenths : null
      );
    } catch {
      setError('Failed to load usage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth:changed') {
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

  return { usage, ownerType, plan, creditsBalanceTenths, loading, error, refresh };
}
