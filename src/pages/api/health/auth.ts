import type { APIRoute, APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { authLimiter } from '@/lib/rate-limiter';

function getEnv(context: APIContext): Record<string, string> {
  try {
    return ((context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime
      ?.env || {}) as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

export const GET: APIRoute = withApiMiddleware(
  async (context) => {
    const env = getEnv(context);
    const provided = context.request.headers.get('x-internal-health');
    const expected = env?.INTERNAL_HEALTH_TOKEN;
    if (!expected || !provided || provided !== expected) {
      return createApiError('forbidden', 'Missing or invalid internal health token');
    }

    const authProvider = env?.AUTH_PROVIDER || null;
    const stytchCustomDomain = env?.STYTCH_CUSTOM_DOMAIN || null;
    const baseUrl = env?.BASE_URL || null;

    const data = {
      ok: true,
      environment: env?.ENVIRONMENT || null,
      authProvider,
      stytchCustomDomainConfigured: Boolean(stytchCustomDomain),
      baseUrl,
      timestamp: new Date().toISOString(),
    } as const;

    return createApiSuccess(data);
  },
  {
    rateLimiter: authLimiter,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST: APIRoute = methodNotAllowed;
export const PUT: APIRoute = methodNotAllowed;
export const PATCH: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;
export const OPTIONS: APIRoute = methodNotAllowed;
