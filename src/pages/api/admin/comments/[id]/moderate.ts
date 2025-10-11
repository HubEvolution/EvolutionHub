import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../../../lib/services/comment-service';
import { requireModerator } from '../../../../../lib/auth-helpers';
const app = new Hono<{ Bindings: { DB: D1Database; KV_COMMENTS?: KVNamespace } }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests from the same origin and localhost for development
      if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
        return origin;
      }
      return null; // Reject other origins
    },
    credentials: true,
  })
);

// POST /api/admin/comments/[id]/moderate - Moderate a specific comment
app.post('/moderate', async (c) => {
  try {
    // Require moderator or admin role
    const user = await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const commentId = c.req.param('id');

    if (!commentId) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment ID required' } },
        400
      );
    }

    const body = await c.req.json<{
      action: 'approve' | 'reject' | 'flag' | 'hide';
      reason?: string;
      notifyUser?: boolean;
    }>();

    const { action, reason, notifyUser = false } = body;

    if (!['approve', 'reject', 'flag', 'hide'].includes(action)) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Invalid action' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB, c.env.KV_COMMENTS);

    // Get comment details before moderation for potential notifications
    const comment = await commentService.getCommentById(commentId);
    if (!comment) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment not found' } },
        404
      );
    }

    // Perform moderation
    const moderation = await commentService.moderateComment(
      commentId,
      { action, reason },
      Number(user.id)
    );

    // TODO: Send notification to comment author if requested
    if (notifyUser && comment.authorId !== Number(user.id)) {
      // This would be implemented in Phase 2: Benachrichtigungs-System
      console.log(`Notification requested for comment ${commentId} moderation`);
    }

    return c.json({
      success: true,
      data: {
        moderation,
        comment: {
          id: comment.id,
          status: comment.status,
          content: comment.content,
          authorId: comment.authorId,
          entityType: comment.entityType,
          entityId: comment.entityId,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error moderating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return c.json(
          { success: false, error: { type: 'validation_error', message: error.message } },
          404
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

// GET /api/admin/comments/[id] - Get detailed comment information for admin
app.get('/', async (c) => {
  try {
    const user = await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    // TODO: Check if user has admin permissions

    const commentId = c.req.param('id');

    if (!commentId) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment ID required' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB);

    const comment = await commentService.getCommentById(commentId);

    if (!comment) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        comment,
        adminData: {
          canEdit: true,
          canDelete: true,
          isAuthor: comment.authorId === Number(user.id),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching comment details:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }

    return c.json(
      {
        success: false,
        error: { type: 'server_error', message: 'Failed to fetch comment details' },
      },
      500
    );
  }
});

// DELETE /api/admin/comments/[id] - Delete a comment (admin only)
app.delete('/', async (c) => {
  try {
    const user = await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    // TODO: Check if user has admin permissions for deletion

    const commentId = c.req.param('id');

    if (!commentId) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment ID required' } },
        400
      );
    }

    const body = await c.req.json<{
      reason?: string;
      notifyUser?: boolean;
    }>();

    const { reason = 'Deleted by administrator', notifyUser = false } = body;

    const commentService = new CommentService(c.env.DB);

    // Get comment details before deletion for potential notifications
    const comment = await commentService.getCommentById(commentId);
    if (!comment) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Comment not found' } },
        404
      );
    }

    // Soft delete the comment by setting status to 'hidden'
    const moderation = await commentService.moderateComment(
      commentId,
      { action: 'hide', reason },
      Number(user.id)
    );

    // TODO: Send notification to comment author if requested
    if (notifyUser && comment.authorId !== Number(user.id)) {
      console.log(`Notification requested for comment ${commentId} deletion`);
    }

    return c.json({ success: true, data: { moderation, deleted: true } });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return c.json(
          { success: false, error: { type: 'validation_error', message: error.message } },
          404
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

export default app;
