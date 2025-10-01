import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import type { OwnerType, Plan } from '@/config/ai-image';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER } from '@/config/ai-image';
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
    maxAge: 60 * 60 * 24 * 180 // 180 days
  });
  return id;
}

export const GET = withApiMiddleware(async (context) => {
  const { locals } = context;
  const url = new URL(context.request.url);
  const isDebug = url.searchParams.get('debug') === '1';

  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  // Reuse existing plan/entitlement mapping from ai-image for now
  const plan = ownerType === 'user' ? ((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan : undefined;
  const ent = getEntitlementsFor(ownerType, plan);

  try {
    const usage = { used: 0, limit: ent.dailyBurstCap, resetAt: null };
    const resp = createApiSuccess({
      ownerType,
      usage,
      limits: {
        user: FREE_LIMIT_USER,
        guest: FREE_LIMIT_GUEST
      },
      plan: ownerType === 'user' ? (plan ?? 'free') : undefined,
      entitlements: ent,
      ...(isDebug
        ? {
            debug: {
              ownerId: (() => { try { return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : ''; } catch {
                // Ignore string slicing errors
                return '';
              } })(),
              limitResolved: ent.dailyBurstCap,
              env: String(locals.runtime?.env?.ENVIRONMENT || '')
            }
          }
        : {})
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set('X-Usage-Plan', ownerType === 'user' ? (plan ?? 'free') : '');
      resp.headers.set('X-Usage-Limit', String(ent.dailyBurstCap));
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
