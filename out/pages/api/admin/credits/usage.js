"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const auth_helpers_1 = require("@/lib/auth-helpers");
const usage_1 = require("@/lib/kv/usage");
function getAdminEnv(context) {
    const env = (context.locals?.runtime?.env ?? {});
    return (env ?? {});
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { url } = context;
    const env = getAdminEnv(context);
    if (!env.DB || !env.KV_AI_ENHANCER) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
        await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: env.DB } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const userIdParam = url.searchParams.get('userId');
    const userId = userIdParam ? userIdParam.trim() : '';
    if (!userId) {
        return (0, api_middleware_1.createApiError)('validation_error', 'userId is required');
    }
    const tenths = await (0, usage_1.getCreditsBalanceTenths)(env.KV_AI_ENHANCER, userId);
    const credits = Math.floor(tenths / 10);
    return (0, api_middleware_1.createApiSuccess)({ credits, tenths });
}, { rateLimiter: rate_limiter_1.apiRateLimiter });
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
