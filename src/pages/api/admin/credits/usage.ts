import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { getCreditsBalanceTenths } from '@/lib/kv/usage';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { url } = context;
    const env = getAdminEnv(context);

    if (!env.DB || !env.KV_AI_ENHANCER) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const userIdParam = url.searchParams.get('userId');
    const userId = userIdParam ? userIdParam.trim() : '';
    if (!userId) {
      return createApiError('validation_error', 'userId is required');
    }

    const tenths = await getCreditsBalanceTenths(env.KV_AI_ENHANCER, userId);
    const credits = Math.floor(tenths / 10);

    return createApiSuccess({ credits, tenths });
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
