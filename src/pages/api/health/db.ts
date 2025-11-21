import type { APIContext, APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { createRateLimiter } from '@/lib/rate-limiter';

const dbHealthLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000,
  name: 'dbHealthCheck',
});

function getEnv(context: APIContext): { DB?: D1Database; ENVIRONMENT?: string } {
  try {
    return ((
      context.locals as unknown as { runtime?: { env?: { DB?: D1Database; ENVIRONMENT?: string } } }
    )?.runtime?.env || {}) as { DB?: D1Database; ENVIRONMENT?: string };
  } catch {
    return {} as { DB?: D1Database; ENVIRONMENT?: string };
  }
}

export const GET: APIRoute = withApiMiddleware(
  async (context) => {
    const env = getEnv(context);
    const startTime = Date.now();

    if (!env.DB) {
      return createApiError('server_error', 'Database binding not available');
    }

    const tables = {
      users: false,
      comments: false,
      comment_moderation: false,
      comment_reports: false,
      discount_codes: false,
    };

    const errors: string[] = [];

    async function checkTable(name: keyof typeof tables) {
      try {
        const stmt = env.DB!.prepare(`SELECT 1 as ok FROM ${name} LIMIT 1`);
        const row = await stmt.first<{ ok: number }>();
        tables[name] = row?.ok === 1 || row?.ok === undefined;
      } catch (err) {
        tables[name] = false;
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${name}: ${message}`);
      }
    }

    await Promise.all([
      checkTable('users'),
      checkTable('comments'),
      checkTable('comment_moderation'),
      checkTable('comment_reports'),
      checkTable('discount_codes'),
    ]);

    const duration = Date.now() - startTime;
    // Core health is defined über zentrale User-/Kommentar-Tabellen; optionale
    // Tabellen (z. B. discount_codes) werden weiterhin im Payload/Errors
    // reflektiert, beeinflussen aber nicht den "ok"-Status.
    const coreTables: (keyof typeof tables)[] = ['users', 'comments'];
    const coreHealthy = coreTables.every((name) => tables[name]);
    const status = coreHealthy ? 'ok' : 'degraded';

    return createApiSuccess({
      status,
      tables,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT || null,
      ...(errors.length > 0 && { errors }),
    });
  },
  {
    rateLimiter: dbHealthLimiter,
    enforceCsrfToken: false,
    disableAutoLogging: true,
    logMetadata: { action: 'db_health_check' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST: APIRoute = methodNotAllowed;
export const PUT: APIRoute = methodNotAllowed;
export const PATCH: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;
export const OPTIONS: APIRoute = methodNotAllowed;
export const HEAD: APIRoute = methodNotAllowed;
