import type { APIContext } from 'astro';
import {
  getLogBuffer,
  getEnvironmentInfo,
  registerSSEStream,
  unregisterSSEStream,
  log,
} from '@/server/utils/logger';
import { logApiAccess } from '@/lib/security-logger';

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
    // Manual logging instead of middleware
    logApiAccess('anonymous', context.clientAddress || 'unknown', {
      endpoint: '/api/debug/logs-stream',
      method: 'GET',
      action: 'debug_logs_stream_accessed',
      streaming: 'sse',
    });
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

    const stream = new ReadableStream({
      start(controller) {
        // Register this controller for live log broadcasting
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
        const heartbeatInterval = setInterval(() => {
          try {
            const keepAlive = `id: ${++id}\ndata: ${JSON.stringify({
              type: 'keep-alive',
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(encoder.encode(keepAlive));
          } catch (err) {
            clearInterval(heartbeatInterval);
            unregisterSSEStream(controller);
          }
        }, 5000); // Every 5 seconds

        // Auto-close after 5 minutes to prevent indefinite connections
        const timeout = setTimeout(() => {
          clearInterval(heartbeatInterval);
          unregisterSSEStream(controller);
          controller.close();
        }, 300000); // 5 minutes

        // Cleanup on abort
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          clearTimeout(timeout);
          unregisterSSEStream(controller);
        };

        // Note: Cannot directly listen to abort signal in this context
        // Client will auto-reconnect if connection drops
      },
      cancel(controller) {
        // Cleanup when client closes connection
        unregisterSSEStream(controller);
      },
    });

    return new Response(stream, { headers });
  } catch (error: any) {
    // Error handling without middleware
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error in SSE endpoint',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * POST /api/debug/logs-stream
 * Polling endpoint as fallback for environments that don't support SSE
 */
export const POST = async (context: APIContext) => {
  try {
    // Manual logging instead of middleware
    logApiAccess('anonymous', context.clientAddress || 'unknown', {
      endpoint: '/api/debug/logs-stream',
      method: 'POST',
      action: 'debug_logs_polled',
      transport: 'polling',
    });
    const envInfo = getEnvironmentInfo();
    const logs = getLogBuffer();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          logs: logs.slice(-50), // Last 50 logs
          environment: envInfo,
          timestamp: new Date().toISOString(),
          bufferSize: logs.length,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error: any) {
    // Error handling without middleware
    console.error('Polling endpoint error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error in polling endpoint',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
