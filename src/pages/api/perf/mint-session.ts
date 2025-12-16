import type { APIRoute, APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { authLimiter } from '@/lib/rate-limiter';
import { createSession } from '@/lib/auth-v2';

type PerfMintEnv = {
  INTERNAL_HEALTH_TOKEN?: string;
  PERF_TEST_USER_EMAIL?: string;
  ENVIRONMENT?: string;
  DB?: D1Database;
};

function resolveEnv(context: APIContext): PerfMintEnv {
  try {
    const env =
      (context.locals as unknown as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env ||
      {};
    return env as unknown as PerfMintEnv;
  } catch {
    return {};
  }
}

function hex32(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const GET: APIRoute = withApiMiddleware(
  async (context) => {
    const env = resolveEnv(context);

    const processEnv =
      typeof process !== 'undefined'
        ? ((process.env as unknown as Record<string, string | undefined>) ?? {})
        : {};
    const requestUrl = new URL(context.request.url);
    const isLoopback =
      requestUrl.hostname === 'localhost' ||
      requestUrl.hostname === '127.0.0.1' ||
      requestUrl.hostname === '::1';
    const environmentRaw =
      env.ENVIRONMENT ||
      processEnv.ENVIRONMENT ||
      undefined;

    const inferredDev = !environmentRaw && isLoopback;

    const environment = inferredDev ? 'development' : environmentRaw;

    if (environment !== 'staging' && environment !== 'development') {
      return createApiError('forbidden', 'Perf session mint not available');
    }

    const provided = context.request.headers.get('x-internal-health');
    const expectedFromEnv = env.INTERNAL_HEALTH_TOKEN || processEnv.INTERNAL_HEALTH_TOKEN;
    const expected =
      environment === 'development' && isLoopback
        ? 'ci-internal-health-token'
        : expectedFromEnv;
    if (!expected || !provided || provided !== expected) {
      const debug =
        environment === 'development' && isLoopback
          ? {
              hasHeader: Boolean(provided),
              headerLength: provided ? provided.length : 0,
              hasExpectedFromEnv: Boolean(expectedFromEnv),
              inferredDev,
              isLoopback,
            }
          : undefined;
      return createApiError(
        'forbidden',
        'Missing or invalid internal health token',
        debug ? { debug } : undefined
      );
    }

    const email = env.PERF_TEST_USER_EMAIL;
    if (!email) {
      return createApiError('server_error', 'PERF_TEST_USER_EMAIL not configured');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database binding missing');
    }

    const user = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string }>();

    if (!user?.id) {
      return createApiError('not_found', 'Perf test user not found');
    }

    const session = await createSession(db, user.id);

    const url = new URL(context.request.url);
    const isHttps = url.protocol === 'https:';
    const maxAge = 60 * 60 * 24 * 30;

    try {
      context.cookies.set('session_id', session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: isHttps,
        maxAge,
      });
      if (isHttps) {
        context.cookies.set('__Host-session', session.id, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict',
          secure: true,
          maxAge,
        });
      }
    } catch {
    }

    const csrfToken = hex32();
    try {
      context.cookies.set('csrf_token', csrfToken, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        secure: isHttps,
        maxAge,
      });
    } catch {
    }

    return createApiSuccess({ userId: user.id, csrfToken });
  },
  {
    requireAuth: false,
    rateLimiter: authLimiter,
    disableAutoLogging: true,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST: APIRoute = methodNotAllowed;
export const PUT: APIRoute = methodNotAllowed;
export const PATCH: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;
export const OPTIONS: APIRoute = methodNotAllowed;
