import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { addCreditPackTenths, getCreditsBalanceTenths } from '@/lib/kv/usage';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';

function getAdminEnv(context: APIContext): AdminBindings {
  const env = (context.locals?.runtime?.env ?? {}) as Partial<AdminBindings> | undefined;
  return (env ?? {}) as AdminBindings;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals } = context;
    const env = getAdminEnv(context);

    if (!(locals as { user?: { id?: string } }).user?.id) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const enabled = String(env.INTERNAL_CREDIT_GRANT || '').trim() === '1';
    // For safety, only allow in non-production unless explicitly enabled
    const isProd = String(env.ENVIRONMENT || '').toLowerCase() === 'production';
    if (!enabled && isProd) {
      return createApiError('forbidden', 'Credit grant is disabled');
    }

    const db = env.DB as D1Database | undefined;
    const kv = env.KV_AI_ENHANCER;
    if (!db || !kv) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    // Require admin role for performing grants
    try {
      await requireAdmin({ request: context.request, env: { DB: db } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    if (!body || typeof body !== 'object') {
      return createApiError('validation_error', 'Invalid request payload');
    }

    const { email, amount } = body as { email?: unknown; amount?: unknown };
    const targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!targetEmail || !targetEmail.includes('@')) {
      return createApiError('validation_error', 'Valid recipient email required');
    }

    const parsedAmount = (() => {
      if (typeof amount === 'number' && Number.isFinite(amount)) return amount;
      if (typeof amount === 'string' && amount.trim().length > 0) {
        const numeric = Number.parseFloat(amount.trim());
        if (Number.isFinite(numeric)) return numeric;
      }
      return 1000;
    })();

    const normalizedAmount = Math.max(1, Math.min(100000, Math.floor(parsedAmount)));

    // Lookup user id by email
    const row = await db
      .prepare(`SELECT id FROM users WHERE lower(email) = ?1 LIMIT 1`)
      .bind(targetEmail)
      .first<{ id: string }>();

    if (!row?.id) {
      return createApiError('not_found', 'User not found');
    }

    const userId = row.id;
    const packId = `manual-topup-${Date.now()}`;
    const unitsTenths = Math.round(normalizedAmount * 10);

    await addCreditPackTenths(kv, userId, packId, unitsTenths);
    const balanceTenths = await getCreditsBalanceTenths(kv, userId);
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
          'credit_grant',
          JSON.stringify({ email: targetEmail, userId, amount: normalizedAmount, packId }),
          Date.now()
        )
        .run();
    } catch {}
    const balance = Math.floor(balanceTenths / 10);

    return createApiSuccess({
      email: targetEmail,
      userId,
      granted: normalizedAmount,
      balance,
      packId,
    });
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_credit_grant' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
