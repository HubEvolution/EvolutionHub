import type { APIContext } from 'astro';
import {
  getLogBuffer,
  getEnvironmentInfo,
  registerSSEStream,
  unregisterSSEStream,
  log,
} from '@/server/utils/logger';
import { logApiAccess } from '@/lib/security-logger';

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const DEBUG_ENDPOINT = '/api/debug/logs-stream';

function isDebugPanelEnabled(): boolean {
  return import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL === 'true';
}

function createJsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function logEndpointAccess(context: APIContext, method: 'GET' | 'POST', mode: 'sse' | 'polling') {
  logApiAccess('anonymous', context.clientAddress || 'unknown', {
    endpoint: DEBUG_ENDPOINT,
    method,
    action: method === 'GET' ? 'debug_logs_stream_accessed' : 'debug_logs_polled',
    streaming: mode,
  });
}

function toErrorMessage(error: unknown): string {
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
export const GET = async (context: APIContext) => {
  try {
    if (!isDebugPanelEnabled()) {
      return new Response('Not found', { status: 404 });
    }

    logEndpointAccess(context, 'GET', 'sse');
    const envInfo = getEnvironmentInfo();

    // Create SSE response headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Get current log buffer
    const logs = getLogBuffer();

    // Create SSE stream
    const encoder = new TextEncoder();
    let id = 0;

    const stream = new ReadableStream<Uint8Array>({
      start(controller: SSEController) {
        registerSSEStream(controller);

        // Log that stream has been registered
        log('info', `Debug panel SSE stream registered (active: ${envInfo.activeStreams + 1})`);

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
        let heartbeatInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
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
            unregisterSSEStream(controller);
          }
        }, 5000); // Every 5 seconds

        // Auto-close after 5 minutes to prevent indefinite connections
        const autoClose = setTimeout(() => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          unregisterSSEStream(controller);
          controller.close();
        }, 300000); // 5 minutes

        const signal = context.request.signal;
        if (signal.aborted) {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
          clearTimeout(autoClose);
          unregisterSSEStream(controller);
          controller.close();
          return;
        }

        const onAbort = () => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          clearTimeout(autoClose);
          unregisterSSEStream(controller);
          controller.close();
        };

        signal.addEventListener('abort', onAbort, { once: true });
      },
      cancel(controller: SSEController) {
        unregisterSSEStream(controller);
      },
    });

    return new Response(stream, { headers });
  } catch (error: unknown) {
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

/**
 * POST /api/debug/logs-stream
 * Polling endpoint as fallback for environments that don't support SSE
 */
export const POST = async (context: APIContext) => {
  try {
    if (!isDebugPanelEnabled()) {
      return createJsonResponse({ success: false, error: 'Debug panel disabled' }, 404);
    }

    logEndpointAccess(context, 'POST', 'polling');
    const envInfo = getEnvironmentInfo();
    const logs = getLogBuffer();

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
  } catch (error: unknown) {
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
