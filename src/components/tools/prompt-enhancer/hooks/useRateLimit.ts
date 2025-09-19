
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseRateLimit {
  retryUntil: number | null;
  retryActive: boolean;
  retryRemainingSec: number;
  setFromRetryAfter: (seconds: number) => void;
  handle429Response: (res: Response) => Promise<number>;
}

export function useRateLimit(): UseRateLimit {
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (!retryUntil) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [retryUntil]);

  const retryActive = useMemo(() => Boolean(retryUntil && nowMs < (retryUntil as number)), [retryUntil, nowMs]);
  const retryRemainingSec = useMemo(() => {
    if (!retryUntil) return 0;
    return Math.max(0, Math.ceil((retryUntil - nowMs) / 1000));
  }, [retryUntil, nowMs]);

  const setFromRetryAfter = useCallback((seconds: number) => {
    const until = Date.now() + Math.max(1, Math.floor(seconds)) * 1000;
    setRetryUntil(until);
  }, []);

  const handle429Response = useCallback(async (res: Response) => {
    const ra = res.headers.get('Retry-After');
    let retrySec = ra ? parseInt(ra, 10) : 0;
    if (!retrySec) {
      try {
        const bodyUnknown: unknown = await res.clone().json().catch(() => null);
        const retryAfter = bodyUnknown && typeof bodyUnknown === 'object'
          ? (bodyUnknown as any)?.error?.details?.retryAfter
          : undefined;
        if (typeof retryAfter === 'number' || typeof retryAfter === 'string') {
          const n = Number(retryAfter);
          if (Number.isFinite(n) && n > 0) retrySec = n;
        }
      } catch {
        // ignore JSON parse errors
      }
    }
    if (!Number.isFinite(retrySec) || retrySec <= 0) retrySec = 1;
    setFromRetryAfter(retrySec);
    return retrySec;
  }, []);

  return {
    retryUntil,
    retryActive,
    retryRemainingSec,
    setFromRetryAfter,
    handle429Response,
  };
}