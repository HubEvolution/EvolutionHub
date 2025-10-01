import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../lib/services/comment-service';
import { requireModerator } from '../../../lib/auth-helpers';
import { createCsrfMiddleware } from '../../../lib/security/csrf';
import type { ModerateCommentRequest } from '../../../lib/types/comments';

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

export default app;