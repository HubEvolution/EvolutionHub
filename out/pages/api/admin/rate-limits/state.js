"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const auth_helpers_1 = require("@/lib/auth-helpers");
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, url } = context;
    const env = (locals.runtime?.env ?? {});
    if (!env.DB) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
        await (0, auth_helpers_1.requireAdmin)({ request: context.request, env: { DB: env.DB } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const name = url.searchParams.get('name') || undefined;
    const state = (0, rate_limiter_1.getLimiterState)(name || undefined);
    return (0, api_middleware_1.createApiSuccess)({ state });
}, { rateLimiter: rate_limiter_1.apiRateLimiter });
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
