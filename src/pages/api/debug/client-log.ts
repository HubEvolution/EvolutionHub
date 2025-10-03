/**
 * Client-side log endpoint for debug panel
 * Allows React components to send logs that appear in the debug panel
 *
 * POST /api/debug/client-log
 * Body: { level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: object }
 */

import type { APIContext } from 'astro';
import { log } from '@/server/utils/logger';

export const POST = async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { level, message, context: logContext } = body;

    if (!level || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'validation_error',
            message: 'Missing required fields: level and message',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate level
    const validLevels = ['info', 'warn', 'error', 'debug', 'log'];
    if (!validLevels.includes(level)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'validation_error',
            message: `Invalid level. Must be one of: ${validLevels.join(', ')}`,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add client indicator to context
    const enrichedContext = {
      ...logContext,
      source: 'client',
    };

    // Log it using the server logger (will appear in debug panel)
    log(level, `[CLIENT] ${message}`, enrichedContext);

    return new Response(
      JSON.stringify({
        success: true,
        data: { logged: true },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          type: 'server_error',
          message: error.message || 'Failed to log message',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Method not allowed for other HTTP methods
export const GET = () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        type: 'method_not_allowed',
        message: 'Use POST to send logs',
      },
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST',
      },
    }
  );
};
