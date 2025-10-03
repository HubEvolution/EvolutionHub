import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { AiImageService } from '@/lib/services/ai-image-service';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER, type OwnerType, type Plan } from '@/config/ai-image';
import { getEntitlementsFor } from '@/config/ai-image/entitlements';

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
  const url = new URL(context.request.url);
  const isDebug = url.searchParams.get('debug') === '1';

  // Owner detection
  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId =
    ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  const env = locals.runtime?.env ?? {};
  const service = new AiImageService({
    R2_AI_IMAGES: env.R2_AI_IMAGES,
    KV_AI_ENHANCER: env.KV_AI_ENHANCER,
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
    ENVIRONMENT: env.ENVIRONMENT,
  });

  try {
    const plan =
      ownerType === 'user'
        ? (((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan)
        : undefined;
    const ent = getEntitlementsFor(ownerType, plan);
    const usage = await service.getUsage(ownerType, ownerId, ent.dailyBurstCap);

    const debugOwnerId = (() => {
      // Avoid leaking IDs; expose only last 4 chars and length
      try {
        return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
      } catch {
        // Ignore string slicing errors - return empty string
        return '';
      }
    })();
    const resp = createApiSuccess({
      ownerType,
      usage,
      limits: {
        user: FREE_LIMIT_USER,
        guest: FREE_LIMIT_GUEST,
      },
      // optionally provide plan for clients that want to show it; existing clients safely ignore it
      plan: ownerType === 'user' ? (plan ?? 'free') : undefined,
      entitlements: ent,
      ...(isDebug
        ? {
            debug: {
              ownerId: debugOwnerId,
              limitResolved: ent.dailyBurstCap,
              env: String(env.ENVIRONMENT || ''),
            },
          }
        : {}),
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      // lightweight introspection headers for quick checks in Network tab
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set('X-Usage-Plan', ownerType === 'user' ? (plan ?? 'free') : '');
      resp.headers.set('X-Usage-Limit', String(ent.dailyBurstCap));
      // additional debug to diagnose session vs guest
      try {
        const hasSession = !!context.cookies.get('session_id')?.value;
        const hasUser = !!locals.user?.id;
        resp.headers.set('X-Debug-Session', hasSession ? '1' : '0');
        resp.headers.set('X-Debug-User', hasUser ? '1' : '0');
      } catch {
        // Ignore debug header failures
      }
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

// 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
