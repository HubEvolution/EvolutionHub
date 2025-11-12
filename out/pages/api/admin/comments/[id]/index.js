'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.DELETE =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const auth_helpers_1 = require('@/lib/auth-helpers');
const comment_service_1 = require('@/lib/services/comment-service');
const rate_limiter_1 = require('@/lib/rate-limiter');
// GET /api/admin/comments/[id] — Admin details for a single comment
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const env = context.locals?.runtime?.env || {};
    const db = env.DB;
    if (!db) return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    // RBAC: moderator or admin
    let user;
    try {
      user = await (0, auth_helpers_1.requireModerator)({
        req: { header: (n) => context.request.headers.get(n) || undefined },
        request: context.request,
        env: { DB: db },
      });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const commentId = context.params?.id?.toString().trim();
    if (!commentId)
      return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    try {
      const service = new comment_service_1.CommentService(db, env.KV_COMMENTS);
      const comment = await service.getCommentById(commentId);
      return (0, api_middleware_1.createApiSuccess)({
        comment,
        adminData: {
          canEdit: true,
          canDelete: true,
          isAuthor: comment.authorId === String(user.id),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch comment details';
      if (msg.includes('not found'))
        return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
      return (0, api_middleware_1.createApiError)('server_error', msg);
    }
  },
  {
    logMetadata: { action: 'admin_comment_details' },
  }
);
// DELETE /api/admin/comments/[id] — Soft delete (hide) a comment
exports.DELETE = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const env = context.locals?.runtime?.env || {};
    const db = env.DB;
    if (!db) return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    // RBAC: moderator or admin
    let user;
    try {
      user = await (0, auth_helpers_1.requireModerator)({
        req: { header: (n) => context.request.headers.get(n) || undefined },
        request: context.request,
        env: { DB: db },
      });
    } catch {
      return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
    }
    const commentId = context.params?.id?.toString().trim();
    if (!commentId)
      return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    let reason = 'Deleted by administrator';
    let notifyUser = false;
    try {
      const parsed = await context.request.json();
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.reason === 'string' && parsed.reason.trim().length > 0) {
          reason = parsed.reason.trim();
        }
        if (typeof parsed.notifyUser === 'boolean') notifyUser = parsed.notifyUser;
      }
    } catch {}
    try {
      const service = new comment_service_1.CommentService(db, env.KV_COMMENTS);
      // ensure comment exists (and for potential notifications)
      const existing = await service.getCommentById(commentId);
      const moderation = await service.moderateComment(
        commentId,
        { action: 'hide', reason },
        String(user.id)
      );
      // Optional notification hook placeholder (non-blocking)
      if (notifyUser && existing.authorId !== String(user.id)) {
        // intentionally no-op in this PR
      }
      return (0, api_middleware_1.createApiSuccess)({ moderation, deleted: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete comment';
      if (msg.includes('not found'))
        return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
      return (0, api_middleware_1.createApiError)('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_comment_delete' },
  }
);
// 405 for unsupported methods
const methodNotAllowed = (allow) => () => (0, api_middleware_1.createMethodNotAllowed)(allow);
exports.POST = methodNotAllowed('GET, DELETE');
exports.PUT = methodNotAllowed('GET, DELETE');
exports.PATCH = methodNotAllowed('GET, DELETE');
exports.OPTIONS = methodNotAllowed('GET, DELETE');
exports.HEAD = methodNotAllowed('GET, DELETE');
