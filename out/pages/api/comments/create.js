'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const comment_service_1 = require('@/lib/services/comment-service');
const auth_helpers_1 = require('@/lib/auth-helpers');
const csrf_1 = require('@/lib/security/csrf');
// POST /api/comments/create
const POST = async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const db = dbUnknown;
    // CSRF validation (required for all callers)
    const cookie = context.request.headers.get('cookie') || undefined;
    let body = null;
    try {
      const raw = await context.request.json();
      if (raw && typeof raw === 'object') body = raw;
      else body = null;
    } catch {
      body = null;
    }
    const headerToken = context.request.headers.get('x-csrf-token') || '';
    const token = (body?.csrfToken || headerToken || '').toString();
    const ok = await (0, csrf_1.validateCsrfToken)(token, cookie);
    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'csrf_error', message: 'Invalid CSRF token' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!body) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Missing JSON body');
    }
    const { csrfToken: _csrfToken, ...commentData } = body;
    if (!commentData.content || !commentData.entityType || !commentData.entityId) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Missing required fields');
    }
    // Require auth: guests dürfen nicht posten
    let userId;
    try {
      const user = await (0, auth_helpers_1.requireAuth)({
        request: context.request,
        env: { DB: db },
      });
      userId = String(user.id);
    } catch {
      return (0, api_middleware_1.createApiError)(
        'auth_error',
        'Für diese Aktion ist eine Anmeldung erforderlich'
      );
    }
    const kv = env?.KV_COMMENTS || context.locals?.env?.KV_COMMENTS;
    const service = new comment_service_1.CommentService(db, kv);
    const created = await service.createComment(commentData, userId, token);
    try {
      const log = {
        at: Math.floor(Date.now() / 1000),
        action: 'comment_create',
        entityType: commentData.entityType,
        entityId: commentData.entityId,
        parentId: commentData.parentId || null,
        status: created?.status,
        userId,
      };
      console.log('[comments:create]', JSON.stringify(log));
    } catch {}
    return (0, api_middleware_1.createApiSuccess)(created, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('rate limit'))
      return (0, api_middleware_1.createApiError)('rate_limit', 'Too many comments');
    if (msg.toLowerCase().includes('spam') || msg.toLowerCase().includes('content')) {
      return (0, api_middleware_1.createApiError)('validation_error', msg);
    }
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
};
exports.POST = POST;
