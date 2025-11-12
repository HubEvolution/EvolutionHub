'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DELETE = exports.PUT = exports.GET = void 0;
const hono_1 = require('hono');
const cors_1 = require('hono/cors');
const logger_1 = require('hono/logger');
const api_middleware_1 = require('@/lib/api-middleware');
const comment_service_1 = require('@/lib/services/comment-service');
const auth_helpers_1 = require('@/lib/auth-helpers');
const csrf_1 = require('@/lib/security/csrf');
const app = new hono_1.Hono();
// Middleware
app.use('*', (0, logger_1.logger)());
app.use(
  '*',
  (0, cors_1.cors)({
    origin: (origin) => {
      if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
        return origin;
      }
      return null;
    },
    credentials: true,
  })
);
// CSRF protection for mutating methods on /:id
app.use('/:id', (0, csrf_1.createCsrfMiddleware)());
// GET /api/comments/[id] - Get a specific comment
// Note: keep Context non-generic to match installed Hono types
app.get('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const commentService = new comment_service_1.CommentService(c.env.DB, c.env.KV_COMMENTS);
    const comment = await commentService.getCommentById(commentId);
    return c.json({ success: true, data: comment });
  } catch (error) {
    console.error('Error fetching comment:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return c.json(
        { success: false, error: { type: 'not_found', message: 'Comment not found' } },
        404
      );
    }
    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to fetch comment' } },
      500
    );
  }
});
// PUT /api/comments/[id] - Update a comment
app.put('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await (0, auth_helpers_1.requireAuth)({
      req: { header: (name) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const body = await c.req.json();
    const { csrfToken, ...updateData } = body;
    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }
    const commentService = new comment_service_1.CommentService(c.env.DB);
    const updatedComment = await commentService.updateComment(
      commentId,
      updateData,
      String(user.id),
      csrfToken
    );
    return c.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json(
          { success: false, error: { type: 'validation_error', message: error.message } },
          400
        );
      }
      if (error.message.includes('Authentication')) {
        return c.json(
          { success: false, error: { type: 'auth_error', message: error.message } },
          401
        );
      }
    }
    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to update comment' } },
      500
    );
  }
});
// DELETE /api/comments/[id] - Delete (hide) a comment
app.delete('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await (0, auth_helpers_1.requireAuth)({
      req: { header: (name) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const body = await c.req.json();
    const { csrfToken } = body;
    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }
    const commentService = new comment_service_1.CommentService(c.env.DB);
    await commentService.deleteComment(commentId, String(user.id), csrfToken);
    return c.json({ success: true, data: { message: 'Comment deleted successfully' } });
  } catch (error) {
    console.error('Error deleting comment:', error);
    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json(
          { success: false, error: { type: 'validation_error', message: error.message } },
          400
        );
      }
      if (error.message.includes('Authentication')) {
        return c.json(
          { success: false, error: { type: 'auth_error', message: error.message } },
          401
        );
      }
    }
    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to delete comment' } },
      500
    );
  }
});
// Note: no default export; named handlers are used by the router
// Named handlers for file-based router
const GET = async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const db = dbUnknown;
    const id = context.params.id;
    if (!id) return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    const kv = env?.KV_COMMENTS || context.locals?.env?.KV_COMMENTS;
    const service = new comment_service_1.CommentService(db, kv);
    const comment = await service.getCommentById(id);
    return (0, api_middleware_1.createApiSuccess)(comment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found'))
      return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
};
exports.GET = GET;
const PUT = async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const db = dbUnknown;
    const id = context.params.id;
    if (!id) return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    // Auth
    const user = await (0, auth_helpers_1.requireAuth)({
      request: context.request,
      env: { DB: db },
    });
    // Body + CSRF
    const body = await context.request.json();
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
    const ok = await (0, csrf_1.validateCsrfToken)(token, cookie);
    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'csrf_error', message: 'Invalid CSRF token' },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    const { csrfToken: _csrfToken, ...updateData } = body;
    const kv = env?.KV_COMMENTS || context.locals?.env?.KV_COMMENTS;
    const service = new comment_service_1.CommentService(db, kv);
    const updated = await service.updateComment(id, updateData, String(user.id), token);
    return (0, api_middleware_1.createApiSuccess)(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication'))
      return (0, api_middleware_1.createApiError)('auth_error', msg);
    if (msg.includes('not found'))
      return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
};
exports.PUT = PUT;
const DELETE = async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const db = dbUnknown;
    const id = context.params.id;
    if (!id) return (0, api_middleware_1.createApiError)('validation_error', 'Comment ID required');
    const user = await (0, auth_helpers_1.requireAuth)({
      request: context.request,
      env: { DB: db },
    });
    const body = await context.request.json().catch(() => ({}));
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
    const ok = await (0, csrf_1.validateCsrfToken)(token, cookie);
    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'csrf_error', message: 'Invalid CSRF token' },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    const kv = env?.KV_COMMENTS || context.locals?.env?.KV_COMMENTS;
    const service = new comment_service_1.CommentService(db, kv);
    await service.deleteComment(id, String(user.id), token);
    return (0, api_middleware_1.createApiSuccess)({ message: 'Comment deleted successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication'))
      return (0, api_middleware_1.createApiError)('auth_error', msg);
    if (msg.includes('not found'))
      return (0, api_middleware_1.createApiError)('not_found', 'Comment not found');
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
};
exports.DELETE = DELETE;
