'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = exports.GET = void 0;
const logger_1 = require('@/server/utils/logger');
const security_logger_1 = require('@/lib/security-logger');
const DEBUG_ENDPOINT = '/api/debug/logs-stream';
function isDebugPanelEnabled() {
  return import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL === 'true';
}
function createJsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function logEndpointAccess(context, method, mode) {
  (0, security_logger_1.logApiAccess)('anonymous', context.clientAddress || 'unknown', {
    endpoint: DEBUG_ENDPOINT,
    method,
    action: method === 'GET' ? 'debug_logs_stream_accessed' : 'debug_logs_polled',
    streaming: mode,
  });
}
function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
/**
 * GET /api/debug/logs-stream
 * Server-Sent Events (SSE) endpoint for streaming logs in Wrangler/Cloudflare environments
 *
 * This endpoint provides real-time log streaming when WebSocket is not available
 * (e.g., in Cloudflare Workers/Pages runtime)
 *
 * Features:
 * - SSE-based real-time streaming
 * - Log buffer management
 * - Environment-aware fallback
 * - Memory-efficient for Edge Runtime
 *
 * Note: No API middleware wrapper used due to SSE stream incompatibility
 */
const GET = async (context) => {
  try {
    if (!isDebugPanelEnabled()) {
      return new Response('Not found', { status: 404 });
    }
    logEndpointAccess(context, 'GET', 'sse');
    const envInfo = (0, logger_1.getEnvironmentInfo)();
    // Create SSE response headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
    // Get current log buffer
    const logs = (0, logger_1.getLogBuffer)();
    // Create SSE stream
    const encoder = new TextEncoder();
    let id = 0;
    const stream = new ReadableStream({
      start(controller) {
        (0, logger_1.registerSSEStream)(controller);
        // Log that stream has been registered
        (0, logger_1.log)(
          'info',
          `Debug panel SSE stream registered (active: ${envInfo.activeStreams + 1})`
        );
        // Send initial logs from buffer
        logs.forEach((logEntry) => {
          const sseData = `id: ${++id}\ndata: ${logEntry}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        });
        // Send environment info
        const envData = `id: ${++id}\ndata: ${JSON.stringify({
          type: 'environment-info',
          environment: envInfo,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(encoder.encode(envData));
        // Heartbeat interval to keep connection alive (Cloudflare Workers requirement)
        let heartbeatInterval = setInterval(() => {
          try {
            const keepAlive = `id: ${++id}\ndata: ${JSON.stringify({
              type: 'keep-alive',
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(encoder.encode(keepAlive));
          } catch (_err) {
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval);
              heartbeatInterval = null;
            }
            (0, logger_1.unregisterSSEStream)(controller);
          }
        }, 5000); // Every 5 seconds
        // Auto-close after 5 minutes to prevent indefinite connections
        const autoClose = setTimeout(() => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          (0, logger_1.unregisterSSEStream)(controller);
          controller.close();
        }, 300000); // 5 minutes
        const signal = context.request.signal;
        if (signal.aborted) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          clearTimeout(autoClose);
          (0, logger_1.unregisterSSEStream)(controller);
          controller.close();
          return;
        }
        const onAbort = () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          clearTimeout(autoClose);
          (0, logger_1.unregisterSSEStream)(controller);
          controller.close();
        };
        signal.addEventListener('abort', onAbort, { once: true });
      },
      cancel(controller) {
        (0, logger_1.unregisterSSEStream)(controller);
      },
    });
    return new Response(stream, { headers });
  } catch (error) {
    console.error('SSE endpoint error:', error);
    return createJsonResponse(
      {
        success: false,
        error: 'Internal server error in SSE endpoint',
        message: toErrorMessage(error),
      },
      500
    );
  }
};
exports.GET = GET;
/**
 * POST /api/debug/logs-stream
 * Polling endpoint as fallback for environments that don't support SSE
 */
const POST = async (context) => {
  try {
    if (!isDebugPanelEnabled()) {
      return createJsonResponse({ success: false, error: 'Debug panel disabled' }, 404);
    }
    logEndpointAccess(context, 'POST', 'polling');
    const envInfo = (0, logger_1.getEnvironmentInfo)();
    const logs = (0, logger_1.getLogBuffer)();
    return createJsonResponse(
      {
        success: true,
        data: {
          logs: logs.slice(-50), // Last 50 logs
          environment: envInfo,
          timestamp: new Date().toISOString(),
          bufferSize: logs.length,
        },
      },
      200
    );
  } catch (error) {
    console.error('Polling endpoint error:', error);
    return createJsonResponse(
      {
        success: false,
        error: 'Internal server error in polling endpoint',
        message: toErrorMessage(error),
      },
      500
    );
  }
};
exports.POST = POST;
