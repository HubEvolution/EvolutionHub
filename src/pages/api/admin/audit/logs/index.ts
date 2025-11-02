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
import type { AuditEventType } from '@/lib/types/audit';
import { AuditLogService } from '@/lib/services/audit-log-service';

function parseNumber(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

function isAuditEventType(v: string | null): v is AuditEventType {
  return v === 'API_ACCESS' || v === 'ADMIN_ACTION' || v === 'SECURITY_EVENT';
}

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, request, url } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!env.DB) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const userId = url.searchParams.get('userId') || undefined;
    const eventTypeParam = url.searchParams.get('eventType');
    const eventType = eventTypeParam
      ? isAuditEventType(eventTypeParam)
        ? eventTypeParam
        : undefined
      : undefined;
    if (eventTypeParam && !eventType) {
      return createApiError('validation_error', 'Invalid eventType');
    }

    const from = parseNumber(url.searchParams.get('from'));
    const to = parseNumber(url.searchParams.get('to'));
    const limit = parseNumber(url.searchParams.get('limit'));
    const cursor = url.searchParams.get('cursor') || undefined;

    const svc = new AuditLogService(env.DB);
    const result = await svc.list({ userId, eventType, from, to, limit, cursor });
    return createApiSuccess(result);
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
