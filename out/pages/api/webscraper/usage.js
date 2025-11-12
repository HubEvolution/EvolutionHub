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
const webscraper_service_1 = require('@/lib/services/webscraper-service');
const entitlements_1 = require('@/config/webscraper/entitlements');
const webscraper_1 = require('@/config/webscraper');
function ensureGuestIdCookie(context) {
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
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
  const { locals } = context;
  // Owner detection
  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
  const plan = ownerType === 'user' ? (locals.user?.plan ?? 'free') : undefined;
  const rawEnv = locals.runtime?.env ?? {};
  const env = {
    KV_WEBSCRAPER: rawEnv.KV_WEBSCRAPER,
    ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
    PUBLIC_WEBSCRAPER_V1:
      typeof rawEnv.PUBLIC_WEBSCRAPER_V1 === 'string' ? rawEnv.PUBLIC_WEBSCRAPER_V1 : undefined,
    WEBSCRAPER_GUEST_LIMIT:
      typeof rawEnv.WEBSCRAPER_GUEST_LIMIT === 'string' ? rawEnv.WEBSCRAPER_GUEST_LIMIT : undefined,
    WEBSCRAPER_USER_LIMIT:
      typeof rawEnv.WEBSCRAPER_USER_LIMIT === 'string' ? rawEnv.WEBSCRAPER_USER_LIMIT : undefined,
  };
  if (env.PUBLIC_WEBSCRAPER_V1 === 'false') {
    return (0, api_middleware_1.createApiError)('forbidden', 'Feature not enabled');
  }
  const service = new webscraper_service_1.WebscraperService(env);
  try {
    const ent = (0, entitlements_1.getWebscraperEntitlementsFor)(ownerType, plan);
    const usage = await service.getUsagePublic(ownerType, ownerId, ent.dailyBurstCap);
    const resp = (0, api_middleware_1.createApiSuccess)({
      ownerType,
      usage,
      limits: {
        user: webscraper_1.WEBSCRAPER_CONFIG.userLimit,
        guest: webscraper_1.WEBSCRAPER_CONFIG.guestLimit,
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
    const resp = (0, api_middleware_1.createApiError)('server_error', message);
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-Error', '1');
    } catch {}
    return resp;
  }
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
