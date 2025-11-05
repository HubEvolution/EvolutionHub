"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const comment_service_1 = require("@/lib/services/comment-service");
const auth_helpers_1 = require("@/lib/auth-helpers");
const csrf_1 = require("@/lib/security/csrf");
// POST /api/comments/[id]/report
const POST = async (context) => {
    try {
        const env = (context.locals?.runtime?.env || {});
        const dbUnknown = env?.DB || context.locals?.env?.DB;
        if (!dbUnknown)
            return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
        const hasPrepare = typeof dbUnknown.prepare === 'function';
        if (!hasPrepare)
            return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
        const db = dbUnknown;
        const id = context.params.id;
        if (!id)
            return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
        // Auth required
        const user = await (0, auth_helpers_1.requireAuth)({ request: context.request, env: { DB: db } });
        // Body + CSRF
        const raw = (await context.request.json().catch(() => ({})));
        const body = raw && typeof raw === 'object'
            ? raw
            : {};
        const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
        const cookie = context.request.headers.get('cookie') || undefined;
        const ok = await (0, csrf_1.validateCsrfToken)(token, cookie);
        if (!ok) {
            return new Response(JSON.stringify({
                success: false,
                error: { type: 'csrf_error', message: 'Invalid CSRF token' },
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        // Validate body
        if (!body || !body.reason) {
            return (0, api_middleware_1.createApiError)('validation_error', 'Missing reason');
        }
        const kv = env?.KV_COMMENTS ||
            context.locals?.env
                ?.KV_COMMENTS;
        const service = new comment_service_1.CommentService(db, kv);
        const { csrfToken: _csrfToken, ...reportData } = body;
        const report = await service.reportComment(id, reportData, String(user.id));
        return (0, api_middleware_1.createApiSuccess)(report, 201);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Authentication'))
            return (0, api_middleware_1.createApiError)('auth_error', msg);
        if (msg.toLowerCase().includes('csrf')) {
            return new Response(JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
};
exports.POST = POST;
