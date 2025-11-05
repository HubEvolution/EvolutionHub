"use strict";
/**
 * XHR Interceptor
 * Captures XMLHttpRequest requests/responses for the Debug Panel.
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.installXHRInterceptor = installXHRInterceptor;
const client_logger_1 = require("./client-logger");
let installed = false;
function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0)
        return 'unknown';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function isStaticAsset(url) {
    return /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|txt|json|webmanifest)(\?|#|$)/i.test(url);
}
function isDebugEndpoint(url) {
    return url.startsWith('/api/debug/client-log') || url.startsWith('/api/debug/logs-stream');
}
function sanitizeUrl(url) {
    try {
        const u = new URL(url, window.location.origin);
        if ([...u.searchParams.keys()].length > 0) {
            const masked = new URL(u.origin + u.pathname);
            u.searchParams.forEach((_v, k) => masked.searchParams.set(k, '***'));
            return masked.toString();
        }
        return u.toString();
    }
    catch {
        return url;
    }
}
function installXHRInterceptor() {
    if (installed)
        return;
    if (typeof window === 'undefined')
        return;
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true')
        return;
    if (!('XMLHttpRequest' in window))
        return;
    const OriginalXHR = window.XMLHttpRequest;
    try {
        class XHRInterceptor extends OriginalXHR {
            constructor() {
                super(...arguments);
                this.__method = 'GET';
                this.__url = '';
                this.__start = 0;
            }
            // Minimal shape to log request body metadata without leaking content
            static toBodyMeta(body) {
                try {
                    if (typeof body === 'string') {
                        const meta = { type: 'text', length: body.length };
                        try {
                            const json = JSON.parse(body);
                            if (json && typeof json === 'object' && !Array.isArray(json)) {
                                return {
                                    type: 'json',
                                    length: body.length,
                                    keys: Object.keys(json).slice(0, 50),
                                };
                            }
                        }
                        catch {
                            // not json
                        }
                        return meta;
                    }
                    else if (body instanceof URLSearchParams) {
                        const keys = [];
                        body.forEach((_v, k) => {
                            if (!keys.includes(k))
                                keys.push(k);
                        });
                        return { type: 'urlencoded', keys };
                    }
                    else if (typeof FormData !== 'undefined' && body instanceof FormData) {
                        const keys = [];
                        body.forEach((_v, k) => {
                            if (!keys.includes(k))
                                keys.push(k);
                        });
                        return { type: 'formdata', keys };
                    }
                    else if (body) {
                        const ctorName = body?.constructor
                            ?.name;
                        return { type: typeof ctorName === 'string' ? ctorName : 'object' };
                    }
                }
                catch {
                    // ignore meta errors
                }
                return undefined;
            }
            open(method, url, async, username, password) {
                try {
                    this.__method = (method || 'GET').toUpperCase();
                    this.__url = url || '';
                }
                catch {
                    /* noop */
                }
                return super.open(method, url, async ?? true, username ?? null, password ?? null);
            }
            send(body) {
                const url = this.__url;
                const method = this.__method;
                // Skip noisy endpoints
                if (!isDebugEndpoint(url) && !isStaticAsset(url)) {
                    this.__start = performance?.now?.() || Date.now();
                    const safeUrl = sanitizeUrl(url);
                    const bodyMeta = XHRInterceptor.toBodyMeta(body);
                    client_logger_1.clientLogger.info(`[NETWORK][XHR] ${method} ${safeUrl} [REDACTED]`, {
                        source: 'network',
                        action: 'xhr_request_start',
                        method,
                        url: safeUrl,
                        request: { body: bodyMeta },
                    });
                    const onLoadEnd = () => {
                        try {
                            const duration = Math.round((performance?.now?.() || Date.now()) - this.__start);
                            const sizeHeader = this.getResponseHeader('content-length');
                            const size = sizeHeader ? formatBytes(parseInt(sizeHeader, 10)) : 'unknown';
                            client_logger_1.clientLogger.info(`[NETWORK][XHR] ${method} ${safeUrl} → ${this.status} (${duration}ms, ${size}) [REDACTED]`, {
                                source: 'network',
                                action: 'xhr_request_complete',
                                method,
                                url: safeUrl,
                                status: this.status,
                                duration,
                                size,
                            });
                        }
                        catch {
                            /* noop */
                        }
                    };
                    const onError = (label) => () => {
                        try {
                            const duration = Math.round((performance?.now?.() || Date.now()) - this.__start);
                            client_logger_1.clientLogger.error(`[NETWORK][XHR] ${method} ${safeUrl} ${label} (${duration}ms) [REDACTED]`, {
                                source: 'network',
                                action: 'xhr_request_failed',
                                method,
                                url: safeUrl,
                                label,
                                duration,
                            });
                        }
                        catch {
                            /* noop */
                        }
                    };
                    this.addEventListener('load', onLoadEnd);
                    this.addEventListener('loadend', onLoadEnd);
                    this.addEventListener('error', onError('FAILED'));
                    this.addEventListener('abort', onError('ABORTED'));
                    this.addEventListener('timeout', onError('TIMEOUT'));
                }
                return super.send(body ?? null);
            }
        }
        window.XMLHttpRequest =
            XHRInterceptor;
        installed = true;
    }
    catch {
        // If extending fails in some UA, do not break app.
    }
}
