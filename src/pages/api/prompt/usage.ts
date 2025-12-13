import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { OwnerType, Plan } from '@/config/ai-image';
import { getPromptEntitlementsFor } from '@/config/prompt/entitlements';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  getUsage as kvGetUsage,
  rollingDailyKey,
  monthlyKey,
  toUsageOverview,
  getCreditsBalanceTenths,
} from '@/lib/kv/usage';
import { resolveEffectivePlanForUser } from '@/lib/services/billing-plan-service';

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
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return id;
}

export const GET = withApiMiddleware(async (context: APIContext) => {
  const { locals } = context;
  const url = new URL(context.request.url);
  const isDebug = url.searchParams.get('debug') === '1';

  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId =
    ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  // Resolve plan from user (shared Plan type); entitlements are prompt-specific
  const planResult =
    ownerType === 'user'
      ? await resolveEffectivePlanForUser({
          userId: ownerId,
          env: { DB: (locals.runtime?.env as { DB?: unknown } | undefined)?.DB },
          localsPlan:
            ((locals.user as { plan?: Plan } | null)?.plan as Plan | undefined) ?? undefined,
        })
      : undefined;
  const plan = ownerType === 'user' ? planResult!.plan : undefined;
  const ent = getPromptEntitlementsFor(ownerType, plan);

  try {
    // Resolve quotas from env (authoritative for Prompt Enhancer usage)
    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const kv = rawEnv.KV_PROMPT_ENHANCER as KVNamespace | undefined;
    const useV2 = String(rawEnv.USAGE_KV_V2 || '') === '1';
    const limitUser = parseInt(String(rawEnv.PROMPT_USER_LIMIT || '20'), 10);
    const limitGuest = parseInt(String(rawEnv.PROMPT_GUEST_LIMIT || '5'), 10);
    const effectiveLimit = ownerType === 'user' ? limitUser : limitGuest;

    // Read usage from KV (rolling 24h window when USAGE_KV_V2=1)
    let used = 0;
    let resetAt: number | null = null;
    if (kv) {
      if (useV2) {
        const keyV2 = rollingDailyKey('prompt', ownerType, ownerId);
        const usageV2 = await kvGetUsage(kv as KVNamespace, keyV2);
        if (usageV2) {
          used = usageV2.count || 0;
          resetAt = usageV2.resetAt ? usageV2.resetAt * 1000 : null;
        }
      } else {
        const key = `prompt:usage:${ownerType}:${ownerId}`;
        const raw = await kv.get(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { count?: number; resetAt?: number };
            used = typeof parsed.count === 'number' ? parsed.count : 0;
            resetAt = typeof parsed.resetAt === 'number' ? parsed.resetAt : null;
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    const usage = toUsageOverview({ used, limit: effectiveLimit, resetAt });

    // Extended daily usage based on entitlements (kept optional for backwards compatibility)
    const dailyUsage = toUsageOverview({
      used,
      limit: ent.dailyBurstCap,
      resetAt,
    });

    // Monthly usage based on prompt entitlements; stored via monthlyKey in KV
    let monthlyUsage: ReturnType<typeof toUsageOverview> | null = null;
    if (kv) {
      const mKey = monthlyKey('prompt', ownerType, ownerId);
      const monthlyCounter = await kvGetUsage(kv as KVNamespace, mKey);
      const monthlyUsed = monthlyCounter?.count || 0;
      monthlyUsage = toUsageOverview({
        used: monthlyUsed,
        limit: ent.monthlyRuns,
        resetAt: null,
      });
    }

    // Credits balance (tenths) from global AI credits KV, when available
    let creditsBalanceTenths: number | null = null;
    const kvCredits = rawEnv.KV_AI_ENHANCER as KVNamespace | undefined;
    if (ownerType === 'user' && kvCredits) {
      try {
        creditsBalanceTenths = await getCreditsBalanceTenths(kvCredits, ownerId);
      } catch {
        // ignore credit lookup failures; keep field null
      }
    }
    const resp = createApiSuccess({
      ownerType,
      usage,
      dailyUsage,
      monthlyUsage,
      limits: {
        user: limitUser,
        guest: limitGuest,
      },
      plan: ownerType === 'user' ? (plan ?? 'free') : undefined,
      entitlements: ent,
      creditsBalanceTenths,
      ...(isDebug
        ? {
            debug: {
              ownerId: (() => {
                try {
                  return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
                } catch {
                  // Ignore string slicing errors
                  return '';
                }
              })(),
              limitResolved: effectiveLimit,
              env: String(rawEnv.ENVIRONMENT || ''),
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
      resp.headers.set('X-Usage-Limit', String(effectiveLimit));
    } catch {
      // Ignore header setting failures
    }
    return resp;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    const resp = createApiError('server_error', message);
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-Error', '1');
    } catch {
      // Ignore header setting failures
    }
    return resp;
  }
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
