'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const auth_helpers_1 = require('@/lib/auth-helpers');
const comment_service_1 = require('@/lib/services/comment-service');
const rate_limiter_1 = require('@/lib/rate-limiter');
exports.POST = (0, api_middleware_1.withAuthApiMiddleware)(
  async (context) => {
    const env = context.locals?.runtime?.env || {};
    const db = env.DB;
    if (!db) return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    // Require moderator or admin
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
    // Parse JSON body
    let body = null;
    try {
      const raw = await context.request.json();
      if (raw && typeof raw === 'object') {
        body = raw;
      }
    } catch {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON');
    }
    const ids = Array.isArray(body?.commentIds)
      ? body.commentIds
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter((x) => x.length > 0)
      : [];
    const action = String(body?.action || '').toLowerCase();
    const reason = (body?.reason || '').trim();
    if (ids.length === 0) {
      return (0, api_middleware_1.createApiError)('validation_error', 'commentIds required');
    }
    if (!['approve', 'reject', 'flag', 'hide'].includes(action)) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid action');
    }
    const service = new comment_service_1.CommentService(db, env.KV_COMMENTS);
    const results = [];
    for (const id of ids) {
      try {
        await service.moderateComment(id, { action, reason }, String(user.id));
        results.push({ id, ok: true });
      } catch (e) {
        results.push({ id, ok: false, error: e instanceof Error ? e.message : 'unknown_error' });
      }
    }
    return (0, api_middleware_1.createApiSuccess)({ results });
  },
  {
    // Enforce strict CSRF and apply sensitive rate limits for bulk actions
    enforceCsrfToken: true,
    rateLimiter: rate_limiter_1.sensitiveActionLimiter,
    logMetadata: { action: 'admin_comments_bulk_moderate' },
  }
);
// 405 for unsupported methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
