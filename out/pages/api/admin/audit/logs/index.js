"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const auth_helpers_1 = require("@/lib/auth-helpers");
const audit_log_service_1 = require("@/lib/services/audit-log-service");
function parseNumber(v) {
    if (!v)
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
}
function isAuditEventType(v) {
    return v === 'API_ACCESS' || v === 'ADMIN_ACTION' || v === 'SECURITY_EVENT';
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, request, url } = context;
    const env = (locals.runtime?.env ?? {});
    if (!env.DB) {
        return (0, api_middleware_1.createApiError)('server_error', 'Infrastructure unavailable');
    }
    try {
        await (0, auth_helpers_1.requireAdmin)({ request, env: { DB: env.DB } });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const userId = url.searchParams.get('userId') || undefined;
    const eventTypeParam = url.searchParams.get('eventType');
    const eventType = eventTypeParam
        ? isAuditEventType(eventTypeParam)
            ? eventTypeParam
            : undefined
        : undefined;
    if (eventTypeParam && !eventType) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid eventType');
    }
    const from = parseNumber(url.searchParams.get('from'));
    const to = parseNumber(url.searchParams.get('to'));
    const limit = parseNumber(url.searchParams.get('limit'));
    const cursor = url.searchParams.get('cursor') || undefined;
    const svc = new audit_log_service_1.AuditLogService(env.DB);
    const result = await svc.list({ userId, eventType, from, to, limit, cursor });
    return (0, api_middleware_1.createApiSuccess)(result);
}, {
    rateLimiter: rate_limiter_1.apiRateLimiter,
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
