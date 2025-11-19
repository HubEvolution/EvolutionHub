import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { voiceTranscribeLimiter } from '@/lib/rate-limiter';
import { getVideoEntitlementsFor } from '@/config/ai-video/entitlements';
import type { Plan } from '@/config/ai-image/entitlements';
import { getUsage as kvGetUsage, rollingDailyKey, toUsageOverview } from '@/lib/kv/usage';

type OwnerType = 'user' | 'guest';

function ensureGuestIdCookie(context: APIContext): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;

  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).toString();
  const url = new URL(context.request.url);
  context.cookies.set('guest_id', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 180,
  });
  return id;
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function endOfDayTimestamp(): number {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.getTime();
}

export const GET = withApiMiddleware(
  async (context: APIContext) => {
    const requestOrigin = normalizeOrigin(new URL(context.request.url).origin);
    const headerOrigin = normalizeOrigin(context.request.headers.get('origin'));
    if (headerOrigin && requestOrigin && headerOrigin !== requestOrigin) {
      return createApiError('forbidden', 'Origin not allowed');
    }

    const { locals } = context;
    const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? String(locals.user!.id) : ensureGuestIdCookie(context);

    const plan =
      ownerType === 'user' ? ((locals.user?.plan as Plan | undefined) ?? 'free') : undefined;
    const entitlements = getVideoEntitlementsFor(ownerType, plan);
    const limitTenths = Math.max(0, entitlements.monthlyCreditsTenths);

    let usedTenths = 0;
    let resetAtMs: number | null = null;

    try {
      const env = locals.runtime?.env ?? {};
      const kv = (env.KV_AI_VIDEO_USAGE ?? env.KV_AI_ENHANCER) as
        | import('@cloudflare/workers-types').KVNamespace
        | undefined;

      if (kv) {
        const key = rollingDailyKey('ai-video', ownerType, ownerId);
        const usage = await kvGetUsage(kv, key);
        if (usage) {
          if (Number.isFinite(usage.count)) {
            usedTenths = Math.max(0, Math.floor(usage.count));
          }
          if (Number.isFinite(usage.resetAt) && usage.resetAt > 0) {
            resetAtMs = usage.resetAt > 10 ** 12 ? usage.resetAt : usage.resetAt * 1000;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const resp = createApiError('server_error', message);
      try {
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        resp.headers.set('Pragma', 'no-cache');
        resp.headers.set('Expires', '0');
        resp.headers.set('X-Usage-Error', '1');
      } catch {}
      return resp;
    }

    const remainingTenths = Math.max(0, limitTenths - usedTenths);
    const limit = limitTenths / 10;
    const remaining = remainingTenths / 10;
    const effectiveResetAt = resetAtMs ?? endOfDayTimestamp();

    const usage = toUsageOverview({ used: limit - remaining, limit, resetAt: effectiveResetAt });

    const response = createApiSuccess({ limit, remaining, resetAt: effectiveResetAt, usage });

    try {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('X-Usage-Limit', String(limit));
      response.headers.set('X-Usage-Remaining', String(remaining));
      response.headers.set('X-Usage-Reset', String(effectiveResetAt));
    } catch {}

    return response;
  },
  {
    enforceCsrfToken: false,
    rateLimiter: voiceTranscribeLimiter,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
