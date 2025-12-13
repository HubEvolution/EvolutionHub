import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { Plan } from '@/config/ai-image/entitlements';
import { getWebEvalEntitlementsFor } from '@/config/web-eval/entitlements';
import {
  getUsage as kvGetUsage,
  rollingDailyKey,
  monthlyKey,
  toUsageOverview,
  getCreditsBalanceTenths,
} from '@/lib/kv/usage';
import { resolveEffectivePlanForUser } from '@/lib/services/billing-plan-service';

function flagOn(v: string | undefined): boolean {
  if (!v) return false;
  const s = String(v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

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

export const GET = withApiMiddleware(async (context: APIContext) => {
  const { locals } = context;
  const url = new URL(context.request.url);
  const isDebug = url.searchParams.get('debug') === '1';

  const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? String(locals.user!.id) : ensureGuestIdCookie(context);
  const planResult =
    ownerType === 'user'
      ? await resolveEffectivePlanForUser({
          userId: ownerId,
          env: { DB: ((locals.runtime?.env ?? {}) as { DB?: unknown }).DB },
          localsPlan: (locals.user?.plan as Plan | undefined) ?? undefined,
        })
      : undefined;
  const plan: Plan | undefined = ownerType === 'user' ? planResult!.plan : undefined;

  const env = (locals.runtime?.env ?? {}) as Record<string, unknown>;

  // UI/Feature flag: tool disabled
  const publicToolFlag =
    typeof env.PUBLIC_TOOL_WEB_EVAL === 'string' ? (env.PUBLIC_TOOL_WEB_EVAL as string) : undefined;
  if (!flagOn(publicToolFlag)) {
    return createApiError('forbidden', 'feature.disabled.web_eval');
  }

  const kv = env.KV_WEB_EVAL as KVNamespace | undefined;
  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  try {
    const ent = getWebEvalEntitlementsFor(ownerType, plan);
    const limit = ent.dailyBurstCap;

    let used = 0;
    let resetAt: number | null = null;
    const key = rollingDailyKey('web-eval', ownerType, ownerId);
    const usage = await kvGetUsage(kv, key);
    if (usage) {
      used = usage.count || 0;
      resetAt = usage.resetAt ? usage.resetAt * 1000 : null;
    }

    const usageOverview = toUsageOverview({ used, limit, resetAt });

    const dailyUsage = toUsageOverview({
      used,
      limit: ent.dailyBurstCap,
      resetAt,
    });

    // Monthly usage based on entitlements (web-eval monthlyRuns)
    let monthlyUsage: ReturnType<typeof toUsageOverview> | null = null;
    try {
      const mKey = monthlyKey('web-eval', ownerType, ownerId);
      const monthlyCounter = await kvGetUsage(kv, mKey);
      const monthlyUsed = monthlyCounter?.count || 0;
      monthlyUsage = toUsageOverview({
        used: monthlyUsed,
        limit: ent.monthlyRuns,
        resetAt: null,
      });
    } catch {
      monthlyUsage = null;
    }

    // Optional credits balance from global AI credits KV (display only; no quota fallback here yet)
    let creditsBalanceTenths: number | null = null;
    const kvCredits = env.KV_AI_ENHANCER as KVNamespace | undefined;
    if (ownerType === 'user' && kvCredits) {
      try {
        creditsBalanceTenths = await getCreditsBalanceTenths(kvCredits, ownerId);
      } catch {
        creditsBalanceTenths = null;
      }
    }

    const resp = createApiSuccess({
      ownerType,
      usage: usageOverview,
      dailyUsage,
      monthlyUsage,
      limits: {
        user: limit,
        guest: limit,
      },
      plan,
      entitlements: ent,
      creditsBalanceTenths,
      ...(isDebug
        ? {
            debug: {
              ownerId: (() => {
                try {
                  return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
                } catch {
                  return '';
                }
              })(),
              limitResolved: limit,
              env: String(env.ENVIRONMENT || ''),
            },
          }
        : {}),
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set('X-Usage-Plan', ownerType === 'user' ? (plan ?? 'free') : '');
      resp.headers.set('X-Usage-Limit', String(limit));
    } catch {}
    return resp;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const resp = createApiError('server_error', message);
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-Error', '1');
    } catch {}
    return resp;
  }
});

export const POST = createMethodNotAllowed('GET');
export const PUT = createMethodNotAllowed('GET');
export const PATCH = createMethodNotAllowed('GET');
export const DELETE = createMethodNotAllowed('GET');
export const OPTIONS = createMethodNotAllowed('GET');
export const HEAD = createMethodNotAllowed('GET');
