import { useEffect } from 'react';

interface Props {
  mode?: 'login';
  target: string; // absolute or relative path; we prefer relative within app
  pollIntervalMs?: number; // default 2000
  maxWaitMs?: number; // default 60000
}

export default function AuthSessionPoller({
  mode = 'login',
  target,
  pollIntervalMs = 2000,
  maxWaitMs = 60000,
}: Props) {
  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;
    let timeoutId: number | null = null;

    const redirectTo = (url: string) => {
      try {
        window.location.assign(url);
      } catch {
        window.location.href = url;
      }
    };

    const isLoggedIn = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'accept': 'application/json',
          },
        });
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        return Boolean(data && data.success === true && data.data && data.data.id);
      } catch {
        return false;
      }
    };

    const checkAndRedirect = async () => {
      if (cancelled) return;
      const ok = await isLoggedIn();
      if (cancelled) return;
      if (ok) {
        clearAll();
        const next = target && typeof target === 'string' ? target : '/dashboard';
        redirectTo(next);
      }
    };

    const clearAll = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAndRedirect();
      }
    };

    const onFocus = () => {
      void checkAndRedirect();
    };

    // Kick off polling
    intervalId = window.setInterval(() => {
      void checkAndRedirect();
    }, Math.max(1000, pollIntervalMs || 2000));

    // Also run an immediate check on mount
    void checkAndRedirect();

    // Stop after maxWaitMs to avoid infinite polling
    if (maxWaitMs && maxWaitMs > 0) {
      timeoutId = window.setTimeout(() => {
        clearAll();
      }, Math.max(10000, maxWaitMs));
    }

    // Listen for focus/visibility to re-check ASAP
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearAll();
    };
  }, [mode, target, pollIntervalMs, maxWaitMs]);

  return null;
}
