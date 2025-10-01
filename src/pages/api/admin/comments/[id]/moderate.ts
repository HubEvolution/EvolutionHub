import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../../../lib/services/comment-service';
import { getDb } from '../../../../../lib/db/helpers';
import { requireModerator } from '../../../../../lib/auth-helpers';

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

// POST /api/admin/comments/[id]/moderate - Moderate a specific comment
app.post('/moderate', async (c) => {
  try {
    // Require moderator or admin role
    const user = await requireModerator(c);

    const commentId = c.req.param('id');

    if (!commentId) {
      return createErrorResponse(c, 'Comment ID required', 'validation_error', 400);
    }

    const body = await c.req.json<{
      status: 'approved' | 'rejected' | 'flagged' | 'hidden';
      reason?: string;
      notifyUser?: boolean;
    }>();

    const { status, reason, notifyUser = false } = body;

    if (!status || !['approved', 'rejected', 'flagged', 'hidden'].includes(status)) {
      return createErrorResponse(c, 'Valid status required (approved, rejected, flagged, hidden)', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    // Get comment details before moderation for potential notifications
    const comment = await commentService.getCommentById(commentId);
    if (!comment) {
      return createErrorResponse(c, 'Comment not found', 'validation_error', 404);
    }

    // Perform moderation
    const moderation = await commentService.moderateComment(
      commentId,
      { status, reason },
      user.id
    );

    // TODO: Send notification to comment author if requested
    if (notifyUser && comment.author.id !== user.id) {
      // This would be implemented in Phase 2: Benachrichtigungs-System
      console.log(`Notification requested for comment ${commentId} moderation`);
    }

    return createResponse(c, {
      moderation,
      comment: {
        id: comment.id,
        status: comment.status,
        content: comment.content,
        author: comment.author,
        entityType: comment.entityType,
        entityId: comment.entityId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error moderating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(c, error.message, 'validation_error', 404);
      }
      if (error.message.includes('Authentication')) {
        return createErrorResponse(c, error.message, 'auth_error', 401);
      }
    }

    return createErrorResponse(c, 'Failed to moderate comment', 'server_error', 500);
  }
});

// GET /api/admin/comments/[id] - Get detailed comment information for admin
app.get('/', async (c) => {
  try {
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    // TODO: Check if user has admin permissions

    const commentId = c.req.param('id');

    if (!commentId) {
      return createErrorResponse(c, 'Comment ID required', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const comment = await commentService.getCommentById(commentId);

    if (!comment) {
      return createErrorResponse(c, 'Comment not found', 'validation_error', 404);
    }

    // Get additional admin-specific data
    const reports = await commentService.getCommentReports(commentId);
    const moderationHistory = await commentService.getModerationHistory(commentId);

    return createResponse(c, {
      comment,
      reports,
      moderationHistory,
      adminData: {
        canEdit: true, // TODO: Check actual permissions
        canDelete: true, // TODO: Check actual permissions
        isAuthor: comment.author.id === user.id,
      }
    });
  } catch (error) {
    console.error('Error fetching comment details:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return createErrorResponse(c, error.message, 'auth_error', 401);
    }

    return createErrorResponse(c, 'Failed to fetch comment details', 'server_error', 500);
  }
});

// DELETE /api/admin/comments/[id] - Delete a comment (admin only)
app.delete('/', async (c) => {
  try {
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    // TODO: Check if user has admin permissions for deletion

    const commentId = c.req.param('id');

    if (!commentId) {
      return createErrorResponse(c, 'Comment ID required', 'validation_error', 400);
    }

    const body = await c.req.json<{
      reason?: string;
      notifyUser?: boolean;
    }>();

    const { reason = 'Deleted by administrator', notifyUser = false } = body;

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    // Get comment details before deletion for potential notifications
    const comment = await commentService.getCommentById(commentId);
    if (!comment) {
      return createErrorResponse(c, 'Comment not found', 'validation_error', 404);
    }

    // Soft delete the comment by setting status to 'hidden'
    const moderation = await commentService.moderateComment(
      commentId,
      { status: 'hidden', reason },
      user.id
    );

    // TODO: Send notification to comment author if requested
    if (notifyUser && comment.author.id !== user.id) {
      console.log(`Notification requested for comment ${commentId} deletion`);
    }

    return createResponse(c, {
      moderation,
      deleted: true
    });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(c, error.message, 'validation_error', 404);
      }
      if (error.message.includes('Authentication')) {
        return createErrorResponse(c, error.message, 'auth_error', 401);
      }
    }

    return createErrorResponse(c, 'Failed to delete comment', 'server_error', 500);
  }
});

export default app;