/**
 * XHR Interceptor
 * Captures XMLHttpRequest requests/responses for the Debug Panel.
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true.
 */

import { clientLogger } from './client-logger';

let installed = false;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function isStaticAsset(url: string) {
  return /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|txt|json|webmanifest)(\?|#|$)/i.test(
    url
  );
}
function isDebugEndpoint(url: string) {
  return url.startsWith('/api/debug/client-log') || url.startsWith('/api/debug/logs-stream');
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    if ([...u.searchParams.keys()].length > 0) {
      const masked = new URL(u.origin + u.pathname);
      u.searchParams.forEach((_v, k) => masked.searchParams.set(k, '***'));
      return masked.toString();
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function installXHRInterceptor() {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
  if (!('XMLHttpRequest' in window)) return;

  const OriginalXHR = window.XMLHttpRequest;

  try {
    class XHRInterceptor extends OriginalXHR {
      private __method: string = 'GET';
      private __url: string = '';
      private __start: number = 0;

      open(
        method: string,
        url: string,
        async?: boolean,
        username?: string | null,
        password?: string | null
      ) {
        try {
          this.__method = (method || 'GET').toUpperCase();
          this.__url = url || '';
        } catch {
          /* noop */
        }
        return super.open(
          method as any,
          url as any,
          async as any,
          username as any,
          password as any
        );
      }

      send(body?: Document | BodyInit | null) {
        const url = this.__url;
        const method = this.__method;
        // Skip noisy endpoints
        if (!isDebugEndpoint(url) && !isStaticAsset(url)) {
          this.__start = (performance?.now?.() as number) || Date.now();
          const safeUrl = sanitizeUrl(url);
          let bodyMeta: any;
          try {
            if (typeof body === 'string') {
              bodyMeta = { type: 'text', length: body.length };
              try {
                const json = JSON.parse(body);
                if (json && typeof json === 'object' && !Array.isArray(json)) {
                  bodyMeta = {
                    type: 'json',
                    length: body.length,
                    keys: Object.keys(json).slice(0, 50),
                  };
                }
              } catch {
                /* not json */
              }
            } else if (body instanceof URLSearchParams) {
              const keys: string[] = [];
              body.forEach((_v, k) => {
                if (!keys.includes(k)) keys.push(k);
              });
              bodyMeta = { type: 'urlencoded', keys };
            } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
              const keys: string[] = [];
              (body as FormData).forEach((_v, k) => {
                if (!keys.includes(k)) keys.push(k);
              });
              bodyMeta = { type: 'formdata', keys };
            } else if (body) {
              bodyMeta = { type: (body as any)?.constructor?.name || 'object' };
            }
          } catch {
            /* noop */
          }

          clientLogger.info(`[NETWORK][XHR] ${method} ${safeUrl} [REDACTED]`, {
            source: 'network',
            action: 'xhr_request_start',
            method,
            url: safeUrl,
            request: { body: bodyMeta },
          });

          const onLoadEnd = () => {
            try {
              const duration = Math.round(
                ((performance?.now?.() as number) || Date.now()) - this.__start
              );
              const sizeHeader = this.getResponseHeader('content-length');
              const size = sizeHeader ? formatBytes(parseInt(sizeHeader, 10)) : 'unknown';
              clientLogger.info(
                `[NETWORK][XHR] ${method} ${safeUrl} → ${this.status} (${duration}ms, ${size}) [REDACTED]`,
                {
                  source: 'network',
                  action: 'xhr_request_complete',
                  method,
                  url: safeUrl,
                  status: this.status,
                  duration,
                  size,
                }
              );
            } catch {
              /* noop */
            }
          };
          const onError = (label: string) => () => {
            try {
              const duration = Math.round(
                ((performance?.now?.() as number) || Date.now()) - this.__start
              );
              clientLogger.error(
                `[NETWORK][XHR] ${method} ${safeUrl} ${label} (${duration}ms) [REDACTED]`,
                {
                  source: 'network',
                  action: 'xhr_request_failed',
                  method,
                  url: safeUrl,
                  label,
                  duration,
                }
              );
            } catch {
              /* noop */
            }
          };

          this.addEventListener('load', onLoadEnd);
          this.addEventListener('loadend', onLoadEnd);
          this.addEventListener('error', onError('FAILED'));
          this.addEventListener('abort', onError('ABORTED'));
          this.addEventListener('timeout', onError('TIMEOUT'));
        }
        return super.send(body as any);
      }
    }

    (window as any).XMLHttpRequest = XHRInterceptor as any;
    installed = true;
  } catch {
    // If extending fails in some UA, do not break app.
  }
}
