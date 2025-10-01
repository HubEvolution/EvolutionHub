import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../lib/services/comment-service';
import { getDb } from '../../../lib/db/helpers';
import { requireModerator } from '../../../lib/auth-helpers';
import type { ModerateCommentRequest } from '../../../lib/types/comments';

const app = new Hono();

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

// POST /api/comments/moderate - Moderate a comment (approve, reject, flag, hide)
app.post('/', async (c) => {
  try {
    // Require moderator or admin role
    const user = await requireModerator(c);

    const body = await c.req.json<ModerateCommentRequest & {
      commentId: string;
      csrfToken: string;
    }>();

    const { commentId, csrfToken, ...moderationData } = body;

    if (!commentId || !csrfToken) {
      return createErrorResponse(c, 'Comment ID and CSRF token required', 'validation_error', 400);
    }

    // Validate CSRF token
    const { validateCsrfToken } = await import('../../../lib/security/csrf');
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return createErrorResponse(c, 'Invalid CSRF token', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const moderation = await commentService.moderateComment(
      commentId,
      moderationData,
      user.id
    );

    return createResponse(c, moderation);
  } catch (error) {
    console.error('Error moderating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return createErrorResponse(c, error.message, 'validation_error', 400);
      }
      if (error.message.includes('Authentication')) {
        return createErrorResponse(c, error.message, 'auth_error', 401);
      }
    }

    return createErrorResponse(c, 'Failed to moderate comment', 'server_error', 500);
  }
});

// GET /api/comments/moderation-queue - Get comments needing moderation
app.get('/queue', async (c) => {
  try {
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    // TODO: Check if user has moderation permissions

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const queue = await commentService.getModerationQueue();

    return createResponse(c, queue);
  } catch (error) {
    console.error('Error fetching moderation queue:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return createErrorResponse(c, error.message, 'auth_error', 401);
    }

    return createErrorResponse(c, 'Failed to fetch moderation queue', 'server_error', 500);
  }
});

// GET /api/comments/stats - Get comment statistics
app.get('/stats', async (c) => {
  try {
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    // TODO: Check if user has admin permissions

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const stats = await commentService.getCommentStats();

    return createResponse(c, stats);
  } catch (error) {
    console.error('Error fetching comment stats:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return createErrorResponse(c, error.message, 'auth_error', 401);
    }

    return createErrorResponse(c, 'Failed to fetch comment stats', 'server_error', 500);
  }
});

export default app;