'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const auth_helpers_1 = require('@/lib/auth-helpers');
const usage_1 = require('@/lib/kv/usage');
const validation_1 = require('@/lib/validation');
function getAdminEnv(context) {
  const env = context.locals?.runtime?.env ?? {};
  return env ?? {};
}
const querySchema = validation_1.z
  .object({
    email: validation_1.z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((value) => (value ? value.trim() : '')),
    id: validation_1.z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value.trim() : '')),
  })
  .refine((val) => !!val.email || !!val.id, {
    message: 'email or id required',
    path: ['email'],
  });
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
  const { request } = context;
  const env = getAdminEnv(context);
  const db = env.DB;
  const kv = env.KV_AI_ENHANCER;
  if (!db) return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
  try {
    await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: db } });
  } catch {
    return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
  }
  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsedQuery.success) {
    return (0, api_middleware_1.createApiError)('validation_error', 'Invalid query', {
      details: (0, validation_1.formatZodError)(parsedQuery.error),
    });
  }
  const { email, id } = parsedQuery.data;
  let userRow = null;
  try {
    if (email) {
      userRow = await db
        .prepare(
          'SELECT id, email, name, plan, created_at FROM users WHERE lower(email) = ?1 LIMIT 1'
        )
        .bind(email)
        .first();
    } else if (id) {
      userRow = await db
        .prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?1 LIMIT 1')
        .bind(id)
        .first();
    }
  } catch {
    return (0, api_middleware_1.createApiError)('server_error', 'Lookup failed');
  }
  if (!userRow?.id) return (0, api_middleware_1.createApiError)('not_found', 'User not found');
  let credits = 0;
  if (kv) {
    try {
      const tenths = await (0, usage_1.getCreditsBalanceTenths)(kv, userRow.id);
      credits = Math.floor((typeof tenths === 'number' ? tenths : 0) / 10);
    } catch {}
  }
  let sub = null;
  let lastIp = null;
  let lastSeenAt = null;
  try {
    sub = await db
      .prepare(
        `SELECT id, plan, status, current_period_end, updated_at
         FROM subscriptions
         WHERE user_id = ?1
         ORDER BY datetime(updated_at) DESC
         LIMIT 1`
      )
      .bind(userRow.id)
      .first();
  } catch {}
  try {
    const last = await db
      .prepare(
        `SELECT actor_ip, created_at FROM audit_logs WHERE actor_user_id = ?1 ORDER BY created_at DESC LIMIT 1`
      )
      .bind(userRow.id)
      .first();
    if (last) {
      lastIp = last.actor_ip || null;
      lastSeenAt = typeof last.created_at === 'number' ? last.created_at : null;
    }
  } catch {}
  // Fallback: if no audit-based lastSeenAt, approximate from sessions table (expires_at - 30d)
  if (!lastSeenAt) {
    try {
      const sess = await db
        .prepare(
          `SELECT expires_at FROM sessions WHERE user_id = ?1 ORDER BY expires_at DESC LIMIT 1`
        )
        .bind(userRow.id)
        .first();
      if (sess && sess.expires_at != null) {
        const raw = sess.expires_at;
        const expSec = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
        if (expSec > 0) {
          const approxCreatedMs = expSec * 1000 - 30 * 24 * 60 * 60 * 1000; // 30 days TTL
          lastSeenAt = Math.max(0, approxCreatedMs);
        }
      }
    } catch {}
  }
  const data = {
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name || '',
      plan: userRow.plan ?? 'free',
      createdAt: userRow.created_at || null,
    },
    credits,
    lastSeenAt,
    lastIp,
    subscription: sub
      ? {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          updatedAt: sub.updated_at,
        }
      : null,
  };
  return (0, api_middleware_1.createApiSuccess)(data);
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
