'use strict';
/**
 * Client-side log endpoint for debug panel
 * Allows React components to send logs that appear in the debug panel
 *
 * POST /api/debug/client-log
 * Body: { level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: object }
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = exports.POST = void 0;
const logger_1 = require('@/server/utils/logger');
const POST = async (context) => {
  try {
    // Gate by env flag to avoid exposure when disabled
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'not_found', message: 'Debug panel disabled' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const raw = await context.request.json();
    const validLevels = ['info', 'warn', 'error', 'debug', 'log'];
    const isLevel = (v) => typeof v === 'string' && validLevels.includes(v);
    const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
    const isEntry = (v) => isPlainObject(v) && isLevel(v.level) && typeof v.message === 'string';
    let entries = [];
    if (Array.isArray(raw)) {
      entries = raw.filter(isEntry);
    } else if (isPlainObject(raw) && Array.isArray(raw.entries)) {
      entries = raw.entries.filter(isEntry);
    } else if (isEntry(raw)) {
      entries = [raw];
    }
    if (!entries.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'validation_error', message: 'No valid log entries provided' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    let count = 0;
    for (const { level, message, context: logContext } of entries) {
      const base = logContext && isPlainObject(logContext) ? logContext : {};
      const enrichedContext = { ...base, source: 'client' };
      (0, logger_1.log)(level, `[CLIENT] ${message}`, enrichedContext);
      count++;
    }
    return new Response(JSON.stringify({ success: true, data: { logged: count } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to log message';
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          type: 'server_error',
          message: msg,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
exports.POST = POST;
// Method not allowed for other HTTP methods
const GET = () => {
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
exports.GET = GET;
