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
import { AuditLogService } from '@/lib/services/audit-log-service';

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request, params } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!env.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const id = params?.id || '';
    if (!id) return createApiError('validation_error', 'Missing id');

    const svc = new AuditLogService(env.DB);
    const row = await svc.getById(id);
    if (!row) return createApiError('not_found', 'Not found');
    return createApiSuccess(row);
  },
  {
    rateLimiter: apiRateLimiter,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
