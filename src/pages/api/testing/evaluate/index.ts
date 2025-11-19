import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { formatZodError, webEvalTaskRequestSchema } from '@/lib/validation';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { createTaskRecord } from '@/lib/testing/web-eval/storage';
import { resolveQueueConfig, type WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type { WebEvalTaskCreatePayload, WebEvalTaskRecord } from '@/lib/testing/web-eval';
import { validateTargetUrl } from '@/lib/testing/web-eval/ssrf';
import type { Plan } from '@/config/ai-image/entitlements';
import { getWebEvalEntitlementsFor } from '@/config/web-eval/entitlements';
import { getUsage as kvGetUsage, incrementDailyRolling, rollingDailyKey } from '@/lib/kv/usage';
import { loggerFactory } from '@/server/utils/logger-factory';

function ensureGuestIdCookie(context: APIContext): string {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guest_id', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return guestId;
}

function maskOwnerId(ownerId: string | undefined): string {
  if (!ownerId) return '';
  const len = ownerId.length;
  const tail = ownerId.slice(-4);
  return `…${tail}(${len})`;
}

async function handler(context: APIContext): Promise<Response> {
  const { locals, request } = context;
  const env = (locals.runtime?.env ?? {}) as WebEvalEnvBindings;
  const kv = env.KV_WEB_EVAL;
  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  // Production gating: disable task creation unless explicitly enabled
  const isProd = (env.ENVIRONMENT || '').toLowerCase() === 'production';
  if (isProd && env.WEB_EVAL_ENABLE_PROD !== '1') {
    return createApiError('forbidden', 'disabled_in_production');
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (!bodyUnknown || typeof bodyUnknown !== 'object') {
    return createApiError('validation_error', 'Invalid JSON body');
  }

  const parsed = webEvalTaskRequestSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return createApiError('validation_error', 'Invalid request parameters', {
      details: formatZodError(parsed.error),
    });
  }

  // SSRF/target validation (optional allowlist)
  // Enforce strictly in production; relax in non-production to keep local/integration flows working
  if (isProd) {
    const allowCsv =
      typeof env.WEB_EVAL_ALLOWED_ORIGINS === 'string' ? env.WEB_EVAL_ALLOWED_ORIGINS : undefined;
    const targetCheck = validateTargetUrl(parsed.data.url, allowCsv);
    if (!targetCheck.ok) {
      return createApiError('forbidden', 'ssrf_blocked', { reason: targetCheck.reason });
    }
  }

  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? String(locals.user!.id) : ensureGuestIdCookie(context);
  const plan: Plan | undefined = ownerType === 'user' ? ((locals.user?.plan as Plan | undefined) ?? 'free') : undefined;
  const entitlements = getWebEvalEntitlementsFor(ownerType, plan);
  const dailyLimit = entitlements.dailyBurstCap;
  const usageKey = rollingDailyKey('web-eval', ownerType, ownerId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const currentUsage = await kvGetUsage(kv, usageKey);
  const usedInWindow = currentUsage && currentUsage.resetAt > nowSeconds ? currentUsage.count : 0;
  if (usedInWindow >= dailyLimit) {
    try {
      loggerFactory.createLogger('web-eval-task').info('web_eval_quota_blocked', {
        ownerType,
        ownerId: maskOwnerId(ownerId),
        used: usedInWindow,
        limit: dailyLimit,
      });
    } catch {}
    return createApiError('validation_error', 'quota_exceeded', {
      limit: dailyLimit,
      resetAt: currentUsage?.resetAt ? currentUsage.resetAt * 1000 : null,
    });
  }

  const payload: WebEvalTaskCreatePayload = {
    ownerType,
    ownerId,
    url: parsed.data.url,
    task: parsed.data.task.trim(),
    headless: parsed.data.headless ?? true,
    timeoutMs: parsed.data.timeoutMs ?? 30_000,
  };

  const config = resolveQueueConfig(env);

  let record: WebEvalTaskRecord;
  try {
    record = await createTaskRecord(kv, payload, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task';
    return createApiError('server_error', message);
  }

  try {
    await incrementDailyRolling(kv, 'web-eval', ownerType, ownerId, dailyLimit);
  } catch (err) {
    try {
      loggerFactory.createLogger('web-eval-task').warn('web_eval_usage_increment_failed', {
        ownerType,
        ownerId: maskOwnerId(ownerId),
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {}
  }

  return createApiSuccess({
    taskId: record.id,
    status: record.status,
    createdAt: record.createdAt,
  });
}

export const POST = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
  enforceCsrfToken: true,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
