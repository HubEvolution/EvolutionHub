import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter, getLimiterState, type AnyEnv } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, url } = context;
    const runtimeEnv = (locals.runtime?.env ?? {}) as AnyEnv;
    const adminEnv = runtimeEnv as AdminBindings;

    if (!adminEnv.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: adminEnv.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const name = url.searchParams.get('name') || undefined;
    const state = await getLimiterState(name || undefined, { env: runtimeEnv });
    return createApiSuccess({ state });
  },
  { rateLimiter: apiRateLimiter }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
