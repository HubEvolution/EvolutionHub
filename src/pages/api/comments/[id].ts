import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { CommentService } from '../../../lib/services/comment-service';
import { requireAuth } from '../../../lib/auth-helpers';
import { createCsrfMiddleware } from '../../../lib/security/csrf';
import type { UpdateCommentRequest } from '../../../lib/types/comments';

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

// CSRF protection for mutating methods on /:id
app.use('/:id', createCsrfMiddleware());

// GET /api/comments/[id] - Get a specific comment
app.get('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const commentService = new CommentService(c.env.DB);

    const comment = await commentService.getCommentById(commentId);

    return c.json({ success: true, data: comment });
  } catch (error) {
    console.error('Error fetching comment:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ success: false, error: { type: 'not_found', message: 'Comment not found' } }, 404);
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch comment' } }, 500);
  }
});

// PUT /api/comments/[id] - Update a comment
app.put('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await requireAuth({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<UpdateCommentRequest & { csrfToken: string }>();
    const { csrfToken, ...updateData } = body;

    if (!csrfToken) {
      return c.json({ success: false, error: { type: 'validation_error', message: 'CSRF token required' } }, 400);
    }

    const commentService = new CommentService(c.env.DB);

    const updatedComment = await commentService.updateComment(
      commentId,
      updateData,
      Number(user.id),
      csrfToken
    );

    return c.json({ success: true, data: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json({ success: false, error: { type: 'validation_error', message: error.message } }, 400);
      }
      if (error.message.includes('Authentication')) {
        return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
      }
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to update comment' } }, 500);
  }
});

// DELETE /api/comments/[id] - Delete (hide) a comment
app.delete('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const user = await requireAuth({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<{ csrfToken: string }>();
    const { csrfToken } = body;

    if (!csrfToken) {
      return c.json({ success: false, error: { type: 'validation_error', message: 'CSRF token required' } }, 400);
    }

    const commentService = new CommentService(c.env.DB);

    await commentService.deleteComment(commentId, Number(user.id), csrfToken);

    return c.json({ success: true, data: { message: 'Comment deleted successfully' } });
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json({ success: false, error: { type: 'validation_error', message: error.message } }, 400);
      }
      if (error.message.includes('Authentication')) {
        return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
      }
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to delete comment' } }, 500);
  }
});

export default app;