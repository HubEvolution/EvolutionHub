import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../../lib/services/comment-service';
import { getDb } from '../../../../lib/db/helpers';
import { requireAdmin } from '../../../../lib/auth-helpers';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from the same origin and localhost for development
    if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
      return origin;
    }
    return null; // Reject other origins
  },
  credentials: true,
}));

// GET /api/admin/comments - List all comments for admin moderation
app.get('/', async (c) => {
  try {
    // Require admin role
    await requireAdmin(c);

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const query = c.req.query();

    // Parse filters from query parameters
    const filters = {
      status: query.status as any,
      entityType: query.entityType as any,
      entityId: query.entityId,
      authorId: query.authorId ? parseInt(query.authorId) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50, // Higher default for admin
      offset: query.offset ? parseInt(query.offset) : 0,
      includeReplies: query.includeReplies !== 'false',
      includeReports: query.includeReports === 'true', // Include reports for admin
      adminView: true, // Enable admin-specific data
    };

    const result = await commentService.listComments(filters);

    // Get statistics for admin dashboard
    const stats = await commentService.getCommentStats();

    return c.json({
      success: true,
      data: {
        comments: result,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);

    if (error instanceof Error && error.message.includes('permissions')) {
      return c.json({ success: false, error: { type: 'forbidden', message: error.message } }, 403);
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch comments' } }, 500);
  }
});

// GET /api/admin/comments/stats - Get detailed comment statistics for admin
app.get('/stats', async (c) => {
  try {
    // Require admin role
    await requireAdmin(c);

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const stats = await commentService.getCommentStats();

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching comment stats:', error);

    if (error instanceof Error && error.message.includes('permissions')) {
      return c.json({ success: false, error: { type: 'forbidden', message: error.message } }, 403);
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch comment stats' } }, 500);
  }
});

// GET /api/admin/comments/queue - Get comments needing moderation
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

// POST /api/admin/comments/bulk-moderate - Bulk moderation actions
app.post('/bulk-moderate', async (c) => {
  try {
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    // TODO: Check if user has admin permissions

    const body = await c.req.json<{
      commentIds: string[];
      action: 'approve' | 'reject' | 'flag' | 'hide';
      reason?: string;
    }>();

    const { commentIds, action, reason } = body;

    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return createErrorResponse(c, 'Comment IDs array required', 'validation_error', 400);
    }

    if (!['approve', 'reject', 'flag', 'hide'].includes(action)) {
      return createErrorResponse(c, 'Invalid action', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const results = [];

    for (const commentId of commentIds) {
      try {
        const moderation = await commentService.moderateComment(
          commentId,
          { status: action, reason },
          user.id
        );
        results.push({ commentId, success: true, moderation });
      } catch (error) {
        results.push({
          commentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return createResponse(c, { results });
  } catch (error) {
    console.error('Error in bulk moderation:', error);
    return createErrorResponse(c, 'Failed to perform bulk moderation', 'server_error', 500);
  }
});

export default app;