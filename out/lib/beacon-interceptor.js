'use strict';
/**
 * Beacon Interceptor
 * Captures navigator.sendBeacon calls for the Debug Panel.
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.installBeaconInterceptor = installBeaconInterceptor;
const client_logger_1 = require('./client-logger');
let installed = false;
function installBeaconInterceptor() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (!nav || typeof nav.sendBeacon !== 'function') return;
  const original = nav.sendBeacon.bind(nav);
  try {
    nav.sendBeacon = function (url, data) {
      try {
        const safeUrl = (() => {
          try {
            const u = new URL(url, window.location.origin);
            if ([...u.searchParams.keys()].length > 0) {
              const masked = new URL(u.origin + u.pathname);
              u.searchParams.forEach((_v, k) => masked.searchParams.set(k, '***'));
              return masked.toString();
            }
            return u.toString();
          } catch {
            return String(url);
          }
        })();
        const len = typeof data === 'string' ? data.length : (data?.size ?? undefined);
        client_logger_1.clientLogger.info(`[NETWORK][BEACON] ${safeUrl} [REDACTED]`, {
          source: 'network',
          action: 'beacon_send',
          url: safeUrl,
          length: len,
        });
      } catch {
        /* noop */
      }
      try {
        return original(url, data);
      } catch (err) {
        client_logger_1.clientLogger.error(`[NETWORK][BEACON] FAILED: ${String(err)}`);
        return false;
      }
    };
    installed = true;
  } catch {
    /* noop */
  }
}
