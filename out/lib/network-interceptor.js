'use strict';
/**
 * Network Interceptor
 * Captures all fetch requests and logs them to the debug panel
 * Tracks: method, URL, status, duration, payload size
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.originalFetch = void 0;
exports.installNetworkInterceptor = installNetworkInterceptor;
exports.uninstallNetworkInterceptor = uninstallNetworkInterceptor;
const client_logger_1 = require('./client-logger');
// Store original fetch
const originalFetch = window.fetch;
exports.originalFetch = originalFetch;
// Track if interceptor is already installed
let isInstalled = false;
/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
/**
 * Build a sanitized request meta snapshot from RequestInit without consuming streams.
 */
function buildSanitizedRequestMeta(init) {
  try {
    // headers: only whitelist a few safe headers, otherwise report presence only
    const presentHeaders = [];
    const safeHeaders = {};
    const sensitiveHeadersPresent = [];
    const SENSITIVE_HEADER_KEYS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    if (init?.headers) {
      const h = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
      h.forEach((value, key) => {
        const k = key.toLowerCase();
        presentHeaders.push(k);
        if (k === 'content-type' || k === 'accept' || k === 'cache-control') {
          safeHeaders[k] = value.substring(0, 100);
        }
        if (SENSITIVE_HEADER_KEYS.includes(k) || k.startsWith('x-auth-')) {
          sensitiveHeadersPresent.push(k);
        }
      });
    }
    // body: handle only safe, non-stream cases
    let bodySummary;
    const b = init?.body;
    if (typeof b === 'string') {
      bodySummary = { type: 'text', length: b.length };
      // attempt JSON keys only
      try {
        const json = JSON.parse(b);
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          const keys = Object.keys(json).slice(0, 50);
          const SENSITIVE_JSON_KEYS = [
            'password',
            'token',
            'secret',
            'email',
            'session',
            'apikey',
            'api_key',
            'auth',
          ];
          const sensitiveKeys = keys.filter((k) => SENSITIVE_JSON_KEYS.includes(k.toLowerCase()));
          bodySummary = { type: 'json', length: b.length, keys, sensitiveKeys };
        }
      } catch {
        /* not json */
      }
    } else if (b instanceof URLSearchParams) {
      const keys = [];
      b.forEach((_v, k) => {
        if (!keys.includes(k)) keys.push(k);
      });
      bodySummary = { type: 'urlencoded', keys };
    } else if (typeof FormData !== 'undefined' && b instanceof FormData) {
      const keys = [];
      // FormData#forEach exists in browsers
      b.forEach((_v, k) => {
        if (!keys.includes(k)) keys.push(k);
      });
      bodySummary = { type: 'formdata', keys };
    } else if (b && typeof b === 'object') {
      // Blob/ArrayBuffer/TypedArray: don't inspect; just state type
      const typeName = b.constructor?.name || 'object';
      bodySummary = { type: typeName };
    }
    return {
      headers: {
        present: presentHeaders,
        safe: safeHeaders,
        sensitivePresent: sensitiveHeadersPresent,
      },
      body: bodySummary,
    };
  } catch {
    return undefined;
  }
}
/**
 * Install network interceptor
 * Overrides window.fetch to capture all HTTP requests
 */
function installNetworkInterceptor() {
  // Only install when debug panel is enabled
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;
  // Prevent double installation
  if (isInstalled) return;
  isInstalled = true;
  // Helpers
  const isDebugEndpoint = (url) =>
    url.startsWith('/api/debug/client-log') || url.startsWith('/api/debug/logs-stream');
  const isOptions = (method) => method.toUpperCase() === 'OPTIONS';
  const isStaticAsset = (url) =>
    /\.(css|js|mjs|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|txt|json|webmanifest)(\?|#|$)/i.test(
      url
    );
  const hasDebugHeader = (init) => {
    try {
      if (!init?.headers) return false;
      const h = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
      return h.get('X-Debug-Log') === '1';
    } catch {
      return false;
    }
  };
  // Override fetch
  window.fetch = async (...args) => {
    const [resource, init] = args;
    let url = '';
    try {
      if (typeof resource === 'string') {
        url = resource;
      } else if (typeof URL !== 'undefined' && resource instanceof URL) {
        url = resource.toString();
      } else if (typeof Request !== 'undefined' && resource instanceof Request) {
        url = resource.url;
      } else {
        // Fallback best effort
        const maybeUrl = resource?.url;
        url = typeof maybeUrl === 'string' ? maybeUrl : String(resource);
      }
    } catch {
      url = '';
    }
    const method = (init?.method || 'GET').toUpperCase();
    const startTime = performance.now();
    // Skip noisy or recursive cases
    if (isDebugEndpoint(url) || isOptions(method) || isStaticAsset(url) || hasDebugHeader(init)) {
      return originalFetch(...args);
    }
    // Sanitize URL: mask all query values to avoid leaking tokens/PII
    let safeUrl = url;
    try {
      const u = new URL(url, window.location.origin);
      if (u.searchParams && [...u.searchParams.keys()].length > 0) {
        const masked = new URL(u.origin + u.pathname);
        // keep keys, replace values by ***
        u.searchParams.forEach((_value, key) => {
          masked.searchParams.set(key, '***');
        });
        safeUrl = masked.toString();
      } else {
        safeUrl = u.toString();
      }
    } catch {
      // fallback: if malformed, keep as-is
    }
    // Log request start
    const reqMeta = buildSanitizedRequestMeta(init);
    client_logger_1.clientLogger.info(`[NETWORK] ${method} ${safeUrl} [REDACTED]`, {
      source: 'network',
      action: 'request_start',
      method,
      url: safeUrl,
      request: reqMeta,
    });
    try {
      // Execute original fetch
      const response = await originalFetch(...args);
      // Calculate duration
      const duration = Math.round(performance.now() - startTime);
      // Try to get response size from Content-Length header
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? formatBytes(parseInt(contentLength, 10)) : 'unknown';
      // Log response
      client_logger_1.clientLogger.info(
        `[NETWORK] ${method} ${safeUrl} → ${response.status} (${duration}ms, ${size}) [REDACTED]`,
        {
          source: 'network',
          action: 'request_complete',
          method,
          url: safeUrl,
          status: response.status,
          statusText: response.statusText,
          duration,
          size,
          request: reqMeta,
        }
      );
      return response;
    } catch (error) {
      // Calculate duration even for failed requests
      const duration = Math.round(performance.now() - startTime);
      // Log error
      client_logger_1.clientLogger.error(
        `[NETWORK] ${method} ${safeUrl} FAILED (${duration}ms): ${error instanceof Error ? error.message : String(error)} [REDACTED]`,
        {
          source: 'network',
          action: 'request_failed',
          method,
          url: safeUrl,
          duration,
          error: error instanceof Error ? error.message : String(error),
          request: reqMeta,
        }
      );
      throw error;
    }
  };
}
/**
 * Uninstall network interceptor
 * Restores original fetch
 */
function uninstallNetworkInterceptor() {
  if (!isInstalled) return;
  window.fetch = originalFetch;
  isInstalled = false;
}
