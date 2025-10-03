/**
 * Network Interceptor
 * Captures all fetch requests and logs them to the debug panel
 * Tracks: method, URL, status, duration, payload size
 * Only active when PUBLIC_ENABLE_DEBUG_PANEL is true
 */

import { clientLogger } from './client-logger';

// Store original fetch
const originalFetch = window.fetch;

// Track if interceptor is already installed
let isInstalled = false;

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Install network interceptor
 * Overrides window.fetch to capture all HTTP requests
 */
export function installNetworkInterceptor() {
  // Only install when debug panel is enabled
  if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') return;

  // Prevent double installation
  if (isInstalled) return;
  isInstalled = true;

  // Override fetch
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [resource, init] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = init?.method || 'GET';
    const startTime = performance.now();

    // Log request start
    clientLogger.info(`[NETWORK] ${method} ${url}`, {
      source: 'network',
      action: 'request_start',
      method,
      url,
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
      clientLogger.info(
        `[NETWORK] ${method} ${url} → ${response.status} (${duration}ms, ${size})`,
        {
          source: 'network',
          action: 'request_complete',
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          duration,
          size,
        }
      );

      return response;
    } catch (error) {
      // Calculate duration even for failed requests
      const duration = Math.round(performance.now() - startTime);

      // Log error
      clientLogger.error(
        `[NETWORK] ${method} ${url} FAILED (${duration}ms): ${error instanceof Error ? error.message : String(error)}`,
        {
          source: 'network',
          action: 'request_failed',
          method,
          url,
          duration,
          error: error instanceof Error ? error.message : String(error),
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
export function uninstallNetworkInterceptor() {
  if (!isInstalled) return;

  window.fetch = originalFetch;
  isInstalled = false;
}

/**
 * Get access to original fetch
 * Useful for internal requests that shouldn't be intercepted
 */
export { originalFetch };
