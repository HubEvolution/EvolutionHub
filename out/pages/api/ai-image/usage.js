"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const ai_image_service_1 = require("@/lib/services/ai-image-service");
const ai_image_1 = require("@/config/ai-image");
const entitlements_1 = require("@/config/ai-image/entitlements");
function ensureGuestIdCookie(context) {
    const existing = context.cookies.get('guest_id')?.value;
    if (existing)
        return existing;
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
    const url = new URL(context.request.url);
    const isDebug = url.searchParams.get('debug') === '1';
    // Owner detection
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    const env = locals.runtime?.env ?? {};
    const service = new ai_image_service_1.AiImageService({
        R2_AI_IMAGES: env.R2_AI_IMAGES,
        KV_AI_ENHANCER: env.KV_AI_ENHANCER,
        REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
        ENVIRONMENT: env.ENVIRONMENT,
    });
    try {
        const plan = ownerType === 'user'
            ? (locals.user?.plan ?? 'free')
            : undefined;
        const ent = (0, entitlements_1.getEntitlementsFor)(ownerType, plan);
        const usage = await service.getUsage(ownerType, ownerId, ent.dailyBurstCap);
        const debugOwnerId = (() => {
            // Avoid leaking IDs; expose only last 4 chars and length
            try {
                return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
            }
            catch {
                // Ignore string slicing errors - return empty string
                return '';
            }
        })();
        const resp = (0, api_middleware_1.createApiSuccess)({
            ownerType,
            usage,
            limits: {
                user: ai_image_1.FREE_LIMIT_USER,
                guest: ai_image_1.FREE_LIMIT_GUEST,
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
            }
            catch {
                // Ignore debug header failures
            }
        }
        catch {
            // Ignore header setting failures
        }
        return resp;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        const resp = (0, api_middleware_1.createApiError)('server_error', message);
        try {
            resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            resp.headers.set('Pragma', 'no-cache');
            resp.headers.set('Expires', '0');
            resp.headers.set('X-Usage-Error', '1');
        }
        catch {
            // Ignore header setting failures
        }
        return resp;
    }
});
// 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
