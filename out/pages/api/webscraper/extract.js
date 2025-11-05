"use strict";
/**
 * API Route for Webscraper Tool
 *
 * POST /api/webscraper/extract: Extract content from URL.
 * Integrates with WebscraperService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const webscraper_service_1 = require("@/lib/services/webscraper-service");
const rate_limiter_1 = require("@/lib/rate-limiter");
const entitlements_1 = require("@/config/webscraper/entitlements");
const webscraper_1 = require("@/lib/validation/schemas/webscraper");
const validation_1 = require("@/lib/validation");
const webscraperLimiter = (0, rate_limiter_1.createRateLimiter)({
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
    name: 'webscraper',
});
function ensureGuestIdCookie(context) {
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
            maxAge: 60 * 60 * 24 * 180, // 180 days
        });
    }
    return guestId;
}
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals, request } = context;
    const user = locals.user;
    // Parse body
    let input;
    try {
        const bodyUnknown = await request.json();
        if (!bodyUnknown || typeof bodyUnknown !== 'object') {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
        }
        const parsed = webscraper_1.webscraperRequestSchema.safeParse(bodyUnknown);
        if (!parsed.success) {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
                details: (0, validation_1.formatZodError)(parsed.error),
            });
        }
        input = { url: parsed.data.url, options: parsed.data.options ?? {} };
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
    }
    // Owner detection
    const ownerType = user ? 'user' : 'guest';
    const ownerId = user?.id || ensureGuestIdCookie(context);
    const plan = ownerType === 'user'
        ? (user?.plan ?? 'free')
        : undefined;
    // Init service with flag check
    const rawEnv = (locals.runtime?.env ?? {});
    const env = {
        KV_WEBSCRAPER: rawEnv.KV_WEBSCRAPER,
        ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
        PUBLIC_WEBSCRAPER_V1: typeof rawEnv.PUBLIC_WEBSCRAPER_V1 === 'string' ? rawEnv.PUBLIC_WEBSCRAPER_V1 : undefined,
        WEBSCRAPER_GUEST_LIMIT: typeof rawEnv.WEBSCRAPER_GUEST_LIMIT === 'string'
            ? rawEnv.WEBSCRAPER_GUEST_LIMIT
            : undefined,
        WEBSCRAPER_USER_LIMIT: typeof rawEnv.WEBSCRAPER_USER_LIMIT === 'string' ? rawEnv.WEBSCRAPER_USER_LIMIT : undefined,
    };
    if (env.PUBLIC_WEBSCRAPER_V1 === 'false') {
        return (0, api_middleware_1.createApiError)('forbidden', 'Feature not enabled');
    }
    const service = new webscraper_service_1.WebscraperService({
        KV_WEBSCRAPER: env.KV_WEBSCRAPER,
        ENVIRONMENT: env.ENVIRONMENT,
        PUBLIC_WEBSCRAPER_V1: env.PUBLIC_WEBSCRAPER_V1,
        WEBSCRAPER_GUEST_LIMIT: env.WEBSCRAPER_GUEST_LIMIT,
        WEBSCRAPER_USER_LIMIT: env.WEBSCRAPER_USER_LIMIT,
    });
    try {
        const ent = (0, entitlements_1.getWebscraperEntitlementsFor)(ownerType, plan);
        const result = await service.scrape(input, ownerType, ownerId, ent.dailyBurstCap);
        return (0, api_middleware_1.createApiSuccess)({
            result: result.result,
            usage: result.usage,
        });
    }
    catch (err) {
        const typedErr = err;
        if (typedErr instanceof Error && typedErr.message.includes('quota exceeded')) {
            const detailsRecord = typedErr.details &&
                typeof typedErr.details === 'object' &&
                !Array.isArray(typedErr.details)
                ? typedErr.details
                : undefined;
            return (0, api_middleware_1.createApiError)('forbidden', typedErr.message, detailsRecord);
        }
        if (typedErr instanceof Error && typedErr.code === 'feature_disabled') {
            return (0, api_middleware_1.createApiError)('forbidden', typedErr.message);
        }
        if (typedErr instanceof Error && typedErr.code === 'validation_error') {
            return (0, api_middleware_1.createApiError)('validation_error', typedErr.message);
        }
        if (typedErr instanceof Error && typedErr.code === 'robots_txt_blocked') {
            return (0, api_middleware_1.createApiError)('forbidden', typedErr.message);
        }
        if (typedErr instanceof Error && typedErr.code === 'fetch_error') {
            return (0, api_middleware_1.createApiError)('server_error', typedErr.message);
        }
        if (typedErr instanceof Error && typedErr.code === 'parse_error') {
            return (0, api_middleware_1.createApiError)('server_error', typedErr.message);
        }
        return (0, api_middleware_1.createApiError)('server_error', typedErr instanceof Error ? typedErr.message : 'Unknown error');
    }
}, {
    rateLimiter: webscraperLimiter,
    enforceCsrfToken: true,
    disableAutoLogging: false,
});
// 405 for other methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
