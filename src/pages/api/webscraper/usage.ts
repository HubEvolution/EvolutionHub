import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { WebscraperService } from '@/lib/services/webscraper-service';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { Plan } from '@/config/ai-image/entitlements';
import { getWebscraperEntitlementsFor } from '@/config/webscraper/entitlements';
import { WEBSCRAPER_CONFIG } from '@/config/webscraper';

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

export const GET = withApiMiddleware(async (context) => {
  const { locals } = context;

  // Owner detection
  const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
  const ownerId =
    ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
  const plan: Plan | undefined =
    ownerType === 'user'
      ? (((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan)
      : undefined;

  const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
  const env = {
    KV_WEBSCRAPER: rawEnv.KV_WEBSCRAPER as KVNamespace | undefined,
    ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
    PUBLIC_WEBSCRAPER_V1:
      typeof rawEnv.PUBLIC_WEBSCRAPER_V1 === 'string' ? rawEnv.PUBLIC_WEBSCRAPER_V1 : undefined,
    WEBSCRAPER_GUEST_LIMIT:
      typeof rawEnv.WEBSCRAPER_GUEST_LIMIT === 'string' ? rawEnv.WEBSCRAPER_GUEST_LIMIT : undefined,
    WEBSCRAPER_USER_LIMIT:
      typeof rawEnv.WEBSCRAPER_USER_LIMIT === 'string' ? rawEnv.WEBSCRAPER_USER_LIMIT : undefined,
  };

  if (env.PUBLIC_WEBSCRAPER_V1 === 'false') {
    return createApiError('forbidden', 'Feature not enabled');
  }

  const service = new WebscraperService(env);
  try {
    const ent = getWebscraperEntitlementsFor(ownerType, plan);
    const usage = await service.getUsagePublic(ownerType, ownerId, ent.dailyBurstCap);

    const resp = createApiSuccess({
      ownerType,
      usage,
      limits: {
        user: WEBSCRAPER_CONFIG.userLimit,
        guest: WEBSCRAPER_CONFIG.guestLimit,
      },
      // optionally provide plan and entitlements for clients that show them
      plan,
      entitlements: ent,
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set('X-Usage-Plan', ownerType === 'user' ? (plan ?? 'free') : '');
      resp.headers.set('X-Usage-Limit', String(ent.dailyBurstCap));
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

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
