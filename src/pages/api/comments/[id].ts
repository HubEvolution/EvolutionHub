import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireAuth } from '@/lib/auth-helpers';
import { createCsrfMiddleware, validateCsrfToken } from '@/lib/security/csrf';
import type { UpdateCommentRequest } from '@/lib/types/comments';

const app = new Hono<{ Bindings: { DB: D1Database; KV_COMMENTS?: KVNamespace } }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
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
app.use('/:id', createCsrfMiddleware());

// GET /api/comments/[id] - Get a specific comment
app.get('/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const commentService = new CommentService(c.env.DB, c.env.KV_COMMENTS);

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
    const user = await requireAuth({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<UpdateCommentRequest & { csrfToken: string }>();
    const { csrfToken, ...updateData } = body;

    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB);

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
    const user = await requireAuth({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<{ csrfToken: string }>();
    const { csrfToken } = body;

    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB);

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
export const GET = async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as
      | { DB: D1Database; KV_COMMENTS?: KVNamespace }
      | undefined;
    const db = env?.DB || (context as any).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    const id = context.params.id as string | undefined;
    if (!id) return createApiError('validation_error', 'Comment ID required');

    const kv = env?.KV_COMMENTS || (context as any).locals?.env?.KV_COMMENTS;
    const service = new CommentService(db, kv);
    const comment = await service.getCommentById(id);
    return createApiSuccess(comment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
    return createApiError('server_error', msg);
  }
};

export const PUT = async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as
      | { DB: D1Database; KV_COMMENTS?: KVNamespace }
      | undefined;
    const db = env?.DB || (context as any).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    const id = context.params.id as string | undefined;
    if (!id) return createApiError('validation_error', 'Comment ID required');

    // Auth
    const user = await requireAuth({
      request: context.request,
      env: { DB: db },
    });

    // Body + CSRF
    const body = (await context.request.json()) as UpdateCommentRequest & { csrfToken?: string };
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
    const ok = await validateCsrfToken(token, cookie);
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

    const { csrfToken, ...updateData } = body;
    const kv = env?.KV_COMMENTS || (context as any).locals?.env?.KV_COMMENTS;
    const service = new CommentService(db, kv);
    const updated = await service.updateComment(id, updateData, String(user.id), token);
    return createApiSuccess(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication')) return createApiError('auth_error', msg);
    if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return createApiError('server_error', msg);
  }
};

export const DELETE = async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as
      | { DB: D1Database; KV_COMMENTS?: KVNamespace }
      | undefined;
    const db = env?.DB || (context as any).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    const id = context.params.id as string | undefined;
    if (!id) return createApiError('validation_error', 'Comment ID required');

    const user = await requireAuth({ request: context.request, env: { DB: db } });

    const body = (await context.request.json().catch(() => ({}))) as { csrfToken?: string };
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
    const ok = await validateCsrfToken(token, cookie);
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

    const kv = env?.KV_COMMENTS || (context as any).locals?.env?.KV_COMMENTS;
    const service = new CommentService(db, kv);
    await service.deleteComment(id, String(user.id), token);
    return createApiSuccess({ message: 'Comment deleted successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication')) return createApiError('auth_error', msg);
    if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return createApiError('server_error', msg);
  }
};
