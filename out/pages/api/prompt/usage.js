"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const entitlements_1 = require("@/config/ai-image/entitlements");
const usage_1 = require("@/lib/kv/usage");
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
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    // Reuse existing plan/entitlement mapping from ai-image for now
    const plan = ownerType === 'user'
        ? (locals.user?.plan ?? 'free')
        : undefined;
    const ent = (0, entitlements_1.getEntitlementsFor)(ownerType, plan);
    try {
        // Resolve quotas from env (authoritative for Prompt Enhancer usage)
        const rawEnv = (locals.runtime?.env ?? {});
        const kv = rawEnv.KV_PROMPT_ENHANCER;
        const useV2 = String(rawEnv.USAGE_KV_V2 || '') === '1';
        const limitUser = parseInt(String(rawEnv.PROMPT_USER_LIMIT || '20'), 10);
        const limitGuest = parseInt(String(rawEnv.PROMPT_GUEST_LIMIT || '5'), 10);
        const effectiveLimit = ownerType === 'user' ? limitUser : limitGuest;
        // Read usage from KV (rolling 24h window when USAGE_KV_V2=1)
        let used = 0;
        let resetAt = null;
        if (kv) {
            if (useV2) {
                const keyV2 = (0, usage_1.rollingDailyKey)('prompt', ownerType, ownerId);
                const usageV2 = await (0, usage_1.getUsage)(kv, keyV2);
                if (usageV2) {
                    used = usageV2.count || 0;
                    resetAt = usageV2.resetAt ? usageV2.resetAt * 1000 : null;
                }
            }
            else {
                const key = `prompt:usage:${ownerType}:${ownerId}`;
                const raw = await kv.get(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        used = typeof parsed.count === 'number' ? parsed.count : 0;
                        resetAt = typeof parsed.resetAt === 'number' ? parsed.resetAt : null;
                    }
                    catch {
                        // ignore parse errors
                    }
                }
            }
        }
        const usage = { used, limit: effectiveLimit, resetAt };
        const resp = (0, api_middleware_1.createApiSuccess)({
            ownerType,
            usage,
            limits: {
                user: limitUser,
                guest: limitGuest,
            },
            plan: ownerType === 'user' ? (plan ?? 'free') : undefined,
            entitlements: ent,
            ...(isDebug
                ? {
                    debug: {
                        ownerId: (() => {
                            try {
                                return ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
                            }
                            catch {
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
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
