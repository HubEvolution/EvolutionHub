"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const auth_helpers_1 = require("@/lib/auth-helpers");
const comment_service_1 = require("@/lib/services/comment-service");
const rate_limiter_1 = require("@/lib/rate-limiter");
// POST /api/admin/comments/[id]/moderate — Moderate a specific comment (approve/reject/flag/hide)
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const env = (context.locals?.runtime?.env || {});
    const db = env.DB;
    if (!db)
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    // RBAC
    let user;
    try {
        user = await (0, auth_helpers_1.requireModerator)({
            req: { header: (n) => context.request.headers.get(n) || undefined },
            request: context.request,
            env: { DB: db },
        });
    }
    catch {
        return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const commentId = context.params?.id?.toString().trim();
    if (!commentId)
        return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    // Parse and validate body
    let body = {};
    try {
        body = (await context.request.json());
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON');
    }
    const actionStr = String(body.action || '').toLowerCase();
    const validActions = ['approve', 'reject', 'flag', 'hide'];
    if (!validActions.includes(actionStr)) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid action');
    }
    const action = actionStr;
    const reason = (body.reason || '').trim();
    const notifyUser = Boolean(body.notifyUser);
    try {
        const service = new comment_service_1.CommentService(db, env.KV_COMMENTS);
        const moderation = await service.moderateComment(commentId, { action, reason }, String(user.id));
        const comment = await service.getCommentById(commentId);
        // Optional, non-blocking notification hook can be added later
        if (notifyUser && comment.authorId === String(user.id)) {
            // no-op
        }
        return (0, api_middleware_1.createApiSuccess)({ moderation, comment });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to moderate comment';
        if (msg.includes('not found'))
            return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
}, {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_comment_moderate' },
});
// 405 for unsupported methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
