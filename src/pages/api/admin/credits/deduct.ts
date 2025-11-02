import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { consumeCreditsTenths, getCreditsBalanceTenths } from '@/lib/kv/usage';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';

interface DeductBody {
  email: string;
  amount?: number; // credits
  idempotencyKey?: string;
  strict?: boolean;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!(locals as { user?: { id?: string } }).user?.id) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const enabled = String(env.INTERNAL_CREDIT_GRANT || '').trim() === '1';
    const isProd = String(env.ENVIRONMENT || '').toLowerCase() === 'production';
    if (!enabled && isProd) {
      return createApiError('forbidden', 'Credit adjust is disabled');
    }

    const db = env.DB;
    const kv = env.KV_AI_ENHANCER;
    if (!db || !kv) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let body: DeductBody | null = null;
    try {
      body = (await context.request.json()) as DeductBody;
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const targetEmail = (body?.email || '').trim().toLowerCase();
    const amount = Math.max(1, Math.min(100000, Math.floor(Number(body?.amount ?? 1000))));
    const strict = body?.strict !== false;

    const row = await db
      .prepare(`SELECT id FROM users WHERE lower(email) = ?1 LIMIT 1`)
      .bind(targetEmail)
      .first<{ id: string }>();

    if (!row?.id) {
      return createApiError('not_found', 'User not found');
    }

    const userId = row.id;
    const reqTenths = Math.round(amount * 10);

    if (strict) {
      const balTenths = await getCreditsBalanceTenths(kv, userId);
      if (reqTenths > balTenths) {
        return createApiError('validation_error', 'insufficient_credits');
      }
    }

    const idem =
      (body?.idempotencyKey || '').trim() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const jobId = `admin-deduct-${idem}`;

    const result = await consumeCreditsTenths(kv, userId, reqTenths, jobId);
    const balanceTenths = await getCreditsBalanceTenths(kv, userId);
    const balance = Math.floor(balanceTenths / 10);

    // Audit log
    const ip = typeof context.clientAddress === 'string' ? context.clientAddress : null;
    try {
      await db
        .prepare(
          `INSERT INTO audit_logs (id, event_type, actor_user_id, actor_ip, resource, action, details, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
        )
        .bind(
          crypto.randomUUID(),
          'ADMIN_ACTION',
          (locals as { user?: { id?: string } }).user?.id || null,
          ip,
          'credits',
          'credit_deduct',
          JSON.stringify({
            email: targetEmail,
            userId,
            requested: amount,
            deducted: Math.floor(result.totalConsumedTenths / 10),
            strict,
            jobId,
          }),
          Date.now()
        )
        .run();
    } catch {}

    return createApiSuccess({
      email: targetEmail,
      userId,
      requested: amount,
      deducted: Math.floor(result.totalConsumedTenths / 10),
      requestedTenths: reqTenths,
      deductedTenths: result.totalConsumedTenths,
      remainingTenths: result.remainingTenths,
      balance,
      breakdown: result.breakdown,
      idempotent: result.idempotent,
      jobId,
    });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_credit_deduct' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
