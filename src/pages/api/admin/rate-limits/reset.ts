import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { sensitiveActionLimiter, resetLimiterKey, type AnyEnv } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';

interface ResetBody {
  name?: string;
  key?: string;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;
    const runtimeEnv = (locals.runtime?.env ?? {}) as AnyEnv;
    const adminEnv = runtimeEnv as unknown as AdminBindings;

    if (!adminEnv.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: adminEnv.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let body: ResetBody | null = null;
    try {
      body = (await request.json()) as ResetBody;
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const name = (body?.name || '').trim();
    const key = (body?.key || '').trim();
    if (!name || !key) return createApiError('validation_error', 'name and key are required');

    const ok = await resetLimiterKey(name, key, { env: runtimeEnv });
    return createApiSuccess({ ok });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_rate_limits_reset' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
