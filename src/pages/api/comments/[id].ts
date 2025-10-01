import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../lib/services/comment-service';
import { getDb } from '../../../lib/db/helpers';
import { authenticateUser } from '../../../lib/auth';
import { createResponse, createErrorResponse } from '../../../lib/response-helpers';
import type { UpdateCommentRequest } from '../../../lib/types/comments';

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

// GET /api/comments/[id] - Get a specific comment
app.get('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const comment = await commentService.getCommentById(commentId);

    return createResponse(c, comment);
  } catch (error) {
    console.error('Error fetching comment:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse(c, 'Comment not found', 'not_found', 404);
    }

    return createErrorResponse(c, 'Failed to fetch comment', 'server_error', 500);
  }
});

// PUT /api/comments/[id] - Update a comment
app.put('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    const body = await c.req.json<UpdateCommentRequest & { csrfToken: string }>();
    const { csrfToken, ...updateData } = body;

    if (!csrfToken) {
      return createErrorResponse(c, 'CSRF token required', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    const updatedComment = await commentService.updateComment(
      commentId,
      updateData,
      user.id,
      csrfToken
    );

    return createResponse(c, updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return createErrorResponse(c, error.message, 'validation_error', 400);
      }
      if (error.message.includes('Authentication')) {
        return createErrorResponse(c, error.message, 'auth_error', 401);
      }
    }

    return createErrorResponse(c, 'Failed to update comment', 'server_error', 500);
  }
});

// DELETE /api/comments/[id] - Delete (hide) a comment
app.delete('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await authenticateUser(c);

    if (!user) {
      return createErrorResponse(c, 'Authentication required', 'auth_error', 401);
    }

    const body = await c.req.json<{ csrfToken: string }>();
    const { csrfToken } = body;

    if (!csrfToken) {
      return createErrorResponse(c, 'CSRF token required', 'validation_error', 400);
    }

    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    await commentService.deleteComment(commentId, user.id, csrfToken);

    return createResponse(c, { message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return createErrorResponse(c, error.message, 'validation_error', 400);
      }
      if (error.message.includes('Authentication')) {
        return createErrorResponse(c, error.message, 'auth_error', 401);
      }
    }

    return createErrorResponse(c, 'Failed to delete comment', 'server_error', 500);
  }
});

export default app;