import type { APIContext } from 'astro';
import { getLogBuffer, getEnvironmentInfo } from '@/server/utils/logger';
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
    logApiAccess(
      'anonymous',
      context.clientAddress || 'unknown',
      {
        endpoint: '/api/debug/logs-stream',
        method: 'GET',
        action: 'debug_logs_stream_accessed',
        streaming: 'sse'
      }
    );
    const envInfo = getEnvironmentInfo();
  
    // If this is Astro dev environment, redirect to WebSocket
    if (envInfo.isAstroDevEnvironment) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Use WebSocket connection for Astro dev environment',
        websocketUrl: 'ws://localhost:8081'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create SSE response headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Get current log buffer
    const logs = getLogBuffer();
  
    // Create SSE stream
    const encoder = new TextEncoder();
    let id = 0;
  
    const stream = new ReadableStream({
      start(controller) {
        // Send initial logs from buffer
        logs.forEach(log => {
          const sseData = `id: ${++id}\ndata: ${log}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        });

        // Send environment info
        const envData = `id: ${++id}\ndata: ${JSON.stringify({
          type: 'environment-info',
          environment: envInfo,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(envData));

        // Heartbeat interval to keep connection alive (Cloudflare Workers requirement)
        const heartbeatInterval = setInterval(() => {
          try {
            const keepAlive = `id: ${++id}\ndata: ${JSON.stringify({
              type: 'keep-alive',
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(encoder.encode(keepAlive));
          } catch (err) {
            clearInterval(heartbeatInterval);
          }
        }, 5000); // Every 5 seconds

        // Auto-close after 30 seconds to prevent hanging
        const timeout = setTimeout(() => {
          clearInterval(heartbeatInterval);
          controller.close();
        }, 30000); // 30 seconds

        // Cleanup on abort
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          clearTimeout(timeout);
        };

        // Note: Cannot directly listen to abort signal in this context
        // Client will reconnect if connection drops
      }
    });

    return new Response(stream, { headers });
  
  } catch (error: any) {
    // Error handling without middleware
    console.error('SSE endpoint error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error in SSE endpoint',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * POST /api/debug/logs-stream
 * Polling endpoint as fallback for environments that don't support SSE
 */
export const POST = async (context: APIContext) => {
  try {
    // Manual logging instead of middleware
    logApiAccess(
      'anonymous',
      context.clientAddress || 'unknown',
      {
        endpoint: '/api/debug/logs-stream',
        method: 'POST',
        action: 'debug_logs_polled',
        transport: 'polling'
      }
    );
    const envInfo = getEnvironmentInfo();
    const logs = getLogBuffer();
  
    return new Response(JSON.stringify({
      success: true,
      data: {
        logs: logs.slice(-50), // Last 50 logs
        environment: envInfo,
        timestamp: new Date().toISOString(),
        bufferSize: logs.length
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  
  } catch (error: any) {
    // Error handling without middleware
    console.error('Polling endpoint error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error in polling endpoint',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
