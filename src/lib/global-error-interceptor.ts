/**
 * Global Error Interceptor
 * Captures window errors and unhandled promise rejections for the Debug Panel.
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true.
 */

import { clientLogger } from './client-logger';

let installed = false;

export function installGlobalErrorInterceptor() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
  installed = true;

  // window error
  window.addEventListener('error', (event) => {
    try {
      const msg = event?.message || 'Unknown error';
      const src = event?.filename || 'unknown';
      const line = event?.lineno ?? 0;
      const col = event?.colno ?? 0;
      const detail = event?.error && typeof (event.error as any).stack === 'string'
        ? (event.error as any).stack
        : undefined;
      clientLogger.error(
        `[GLOBAL-ERROR] ${msg} at ${src}:${line}:${col}` + (detail ? `\n${detail}` : ''),
        { source: 'client', action: 'global_error', filename: src, line, col }
      );
    } catch {/* noop */}
  });

  // unhandled promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason: any = (event as any)?.reason;
      const msg = typeof reason === 'string' ? reason : (reason?.message || String(reason));
      const stack = typeof reason?.stack === 'string' ? reason.stack : undefined;
      clientLogger.error(
        `[UNHANDLED-REJECTION] ${msg}` + (stack ? `\n${stack}` : ''),
        { source: 'client', action: 'unhandled_rejection' }
      );
    } catch {/* noop */}
  });
}
