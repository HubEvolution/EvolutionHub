'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const hono_1 = require('hono');
const cors_1 = require('hono/cors');
const logger_1 = require('hono/logger');
const api_middleware_1 = require('@/lib/api-middleware');
const comment_service_1 = require('@/lib/services/comment-service');
const auth_helpers_1 = require('@/lib/auth-helpers');
const csrf_1 = require('@/lib/security/csrf');
function resolveModerationEnv(context) {
  const runtimeEnv = context.locals?.runtime?.env;
  const legacyEnv = context.locals?.env;
  const env = runtimeEnv ?? legacyEnv;
  if (!env?.DB) {
    throw new Error('Database binding missing');
  }
  return env;
}
function toModeratorId(value) {
  const id = String(value ?? '').trim();
  if (!id) throw new Error('Authentication error: invalid moderator id');
  return id;
}
function isModerateRequestPayload(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value;
  if (typeof candidate.commentId !== 'string' || candidate.commentId.trim().length === 0) {
    return false;
  }
  const { action, reason, notifyUser } = candidate;
  if (typeof action !== 'string') {
    return false;
  }
  if (reason !== undefined && typeof reason !== 'string') {
    return false;
  }
  if (notifyUser !== undefined && typeof notifyUser !== 'boolean') {
    return false;
  }
  if (candidate.csrfToken !== undefined && typeof candidate.csrfToken !== 'string') {
    return false;
  }
  return true;
}
async function readModerateRequest(request) {
  const body = await request.json().catch(() => undefined);
  if (!isModerateRequestPayload(body)) {
    throw new Error('validation_error: Invalid moderation payload');
  }
  return body;
}
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
// CSRF protection for mutating moderation route
app.use('/', (0, csrf_1.createCsrfMiddleware)());
// POST /api/comments/moderate - Moderate a comment (approve, reject, flag, hide)
app.post('/', async (c) => {
  try {
    // Require moderator or admin role
    const user = await (0, auth_helpers_1.requireModerator)({
      req: { header: (name) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const body = await c.req.json();
    const { commentId, csrfToken, ...moderationData } = body;
    if (!commentId || !csrfToken) {
      return c.json(
        {
          success: false,
          error: { type: 'validation_error', message: 'Comment ID and CSRF token required' },
        },
        400
      );
    }
    // Validate CSRF token
    const isValidCsrf = await (0, csrf_1.validateCsrfToken)(csrfToken);
    if (!isValidCsrf) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Invalid CSRF token' } },
        400
      );
    }
    const commentService = new comment_service_1.CommentService(c.env.DB, c.env.KV_COMMENTS);
    const moderation = await commentService.moderateComment(
      commentId,
      moderationData,
      String(user.id)
    );
    return c.json({ success: true, data: moderation });
  } catch (error) {
    console.error('Error moderating comment:', error);
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
      { success: false, error: { type: 'server_error', message: 'Failed to moderate comment' } },
      500
    );
  }
});
// GET /api/comments/moderation-queue - Get comments needing moderation
app.get('/queue', async (c) => {
  try {
    await (0, auth_helpers_1.requireModerator)({
      req: { header: (name) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const commentService = new comment_service_1.CommentService(c.env.DB);
    const queue = await commentService.getModerationQueue();
    return c.json({ success: true, data: queue });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }
    return c.json(
      {
        success: false,
        error: { type: 'server_error', message: 'Failed to fetch moderation queue' },
      },
      500
    );
  }
});
// GET /api/comments/stats - Get comment statistics
app.get('/stats', async (c) => {
  try {
    await (0, auth_helpers_1.requireModerator)({
      req: { header: (name) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const commentService = new comment_service_1.CommentService(c.env.DB);
    const stats = await commentService.getCommentStats();
    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching comment stats:', error);
    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }
    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to fetch comment stats' } },
      500
    );
  }
});
// Note: no default export; named handlers are used by the router
// Named POST handler for /api/comments/moderate
const POST = async (context) => {
  try {
    const env = resolveModerationEnv(context);
    const moderator = await (0, auth_helpers_1.requireModerator)({
      request: context.request,
      env: { DB: env.DB },
    });
    const payload = await readModerateRequest(context.request);
    const csrfToken = payload.csrfToken ?? context.request.headers.get('x-csrf-token') ?? undefined;
    if (!csrfToken) {
      return (0, api_middleware_1.createApiError)('forbidden', 'CSRF token required');
    }
    const cookie = context.request.headers.get('cookie') ?? undefined;
    const csrfValid = await (0, csrf_1.validateCsrfToken)(csrfToken, cookie);
    if (!csrfValid) {
      return (0, api_middleware_1.createApiError)('forbidden', 'Invalid CSRF token');
    }
    const { commentId, csrfToken: _csrf, ...moderationData } = payload;
    const service = new comment_service_1.CommentService(env.DB, env.KV_COMMENTS);
    const result = await service.moderateComment(
      commentId,
      moderationData,
      toModeratorId(moderator.id)
    );
    return (0, api_middleware_1.createApiSuccess)(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('validation_error:')) {
      const [, detail] = message.split(':', 2);
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        (detail ?? '').trim() || message
      );
    }
    if (message.toLowerCase().includes('authentication')) {
      return (0, api_middleware_1.createApiError)('auth_error', message);
    }
    if (message.toLowerCase().includes('csrf')) {
      return (0, api_middleware_1.createApiError)('forbidden', message);
    }
    return (0, api_middleware_1.createApiError)('server_error', message);
  }
};
exports.POST = POST;
