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
    // Gate by env flag to avoid exposure when disabled
    if (import.meta.env.PUBLIC_ENABLE_DEBUG_PANEL !== 'true') {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'not_found', message: 'Debug panel disabled' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const raw: unknown = await context.request.json();
    const validLevels = ['info', 'warn', 'error', 'debug', 'log'] as const;
    type Level = typeof validLevels[number];

    const isLevel = (v: unknown): v is Level =>
      typeof v === 'string' && (validLevels as readonly string[]).includes(v);

    type Entry = { level: Level; message: string; context?: Record<string, unknown> };
    const isEntry = (v: unknown): v is Entry =>
      !!v && typeof v === 'object' &&
      isLevel((v as any).level) && typeof (v as any).message === 'string';

    let entries: Entry[] = [];
    if (Array.isArray(raw)) {
      entries = raw.filter(isEntry);
    } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).entries)) {
      entries = ((raw as any).entries as unknown[]).filter(isEntry) as Entry[];
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
      const enrichedContext = { ...(logContext || {}), source: 'client' } as Record<string, unknown>;
      log(level, `[CLIENT] ${message}`, enrichedContext);
      count++;
    }

    return new Response(
      JSON.stringify({ success: true, data: { logged: count } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
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
