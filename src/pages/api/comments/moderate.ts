import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireModerator } from '@/lib/auth-helpers';
import { createCsrfMiddleware, validateCsrfToken } from '@/lib/security/csrf';
import type { ModerateCommentRequest } from '@/lib/types/comments';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
      return origin;
    }
    return null;
  },
  credentials: true,
}));

// CSRF protection for mutating moderation route
app.use('/', createCsrfMiddleware());

// POST /api/comments/moderate - Moderate a comment (approve, reject, flag, hide)
app.post('/', async (c) => {
  try {
    // Require moderator or admin role
    const user = await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<ModerateCommentRequest & {
      commentId: string;
      csrfToken: string;
    }>();

    const { commentId, csrfToken, ...moderationData } = body;

    if (!commentId || !csrfToken) {
      return c.json({ success: false, error: { type: 'validation_error', message: 'Comment ID and CSRF token required' } }, 400);
    }

    // Validate CSRF token
    const { validateCsrfToken } = await import('../../../lib/security/csrf');
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return c.json({ success: false, error: { type: 'validation_error', message: 'Invalid CSRF token' } }, 400);
    }

    const commentService = new CommentService(c.env.DB);

    const moderation = await commentService.moderateComment(
      commentId,
      moderationData,
      Number(user.id)
    );

    return c.json({ success: true, data: moderation });
  } catch (error) {
    console.error('Error moderating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json({ success: false, error: { type: 'validation_error', message: error.message } }, 400);
      }
      if (error.message.includes('Authentication')) {
        return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
      }
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to moderate comment' } }, 500);
  }
});

// GET /api/comments/moderation-queue - Get comments needing moderation
app.get('/queue', async (c) => {
  try {
    await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const commentService = new CommentService(c.env.DB);

    const queue = await commentService.getModerationQueue();

    return c.json({ success: true, data: queue });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch moderation queue' } }, 500);
  }
});

// GET /api/comments/stats - Get comment statistics
app.get('/stats', async (c) => {
  try {
    await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const commentService = new CommentService(c.env.DB);

    const stats = await commentService.getCommentStats();

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching comment stats:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }
    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch comment stats' } }, 500);
  }
});

// Note: no default export; named handlers are used by the router

// Named POST handler for /api/comments/moderate
export const POST = async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as { DB: D1Database } | undefined;
    const db = env?.DB || (context as any).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    // Require moderator or admin
    const user = await requireModerator({ request: context.request, env: { DB: db } });

    const body = (await context.request.json()) as (ModerateCommentRequest & { commentId?: string; csrfToken?: string });
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
    const ok = await validateCsrfToken(token, cookie);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: { type: 'csrf_error', message: 'Invalid CSRF token' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const commentId = body.commentId;
    if (!commentId) return createApiError('validation_error', 'Comment ID required');

    const { csrfToken, commentId: _omit, ...moderationData } = body as any;
    const service = new CommentService(db);
    const res = await service.moderateComment(commentId, moderationData, Number(user.id));
    return createApiSuccess(res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication')) return createApiError('auth_error', msg);
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return createApiError('server_error', msg);
  }
};