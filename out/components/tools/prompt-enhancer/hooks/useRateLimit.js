'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useRateLimit = useRateLimit;
const react_1 = require('react');
function useRateLimit() {
  const [retryUntil, setRetryUntil] = (0, react_1.useState)(null);
  const [nowMs, setNowMs] = (0, react_1.useState)(Date.now());
  (0, react_1.useEffect)(() => {
    if (!retryUntil) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [retryUntil]);
  const retryActive = (0, react_1.useMemo)(
    () => Boolean(retryUntil && nowMs < retryUntil),
    [retryUntil, nowMs]
  );
  const retryRemainingSec = (0, react_1.useMemo)(() => {
    if (!retryUntil) return 0;
    return Math.max(0, Math.ceil((retryUntil - nowMs) / 1000));
  }, [retryUntil, nowMs]);
  const setFromRetryAfter = (0, react_1.useCallback)((seconds) => {
    const until = Date.now() + Math.max(1, Math.floor(seconds)) * 1000;
    setRetryUntil(until);
  }, []);
  const handle429Response = (0, react_1.useCallback)(
    async (res) => {
      const ra = res.headers.get('Retry-After');
      let retrySec = ra ? parseInt(ra, 10) : 0;
      if (!retrySec) {
        try {
          const bodyUnknown = await res
            .clone()
            .json()
            .catch(() => null);
          const details =
            bodyUnknown &&
            typeof bodyUnknown === 'object' &&
            bodyUnknown !== null &&
            'error' in bodyUnknown &&
            typeof bodyUnknown.error === 'object' &&
            bodyUnknown.error !== null &&
            'details' in bodyUnknown.error
              ? bodyUnknown.error.details
              : null;
          const retryAfter =
            details && typeof details === 'object' && details !== null && 'retryAfter' in details
              ? details.retryAfter
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
    },
    [setFromRetryAfter]
  );
  return {
    retryUntil,
    retryActive,
    retryRemainingSec,
    setFromRetryAfter,
    handle429Response,
  };
}
