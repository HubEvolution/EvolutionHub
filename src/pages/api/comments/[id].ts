import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { APIContext } from 'astro';
import {
  createApiError,
  createApiSuccess,
  withApiMiddleware,
  withAuthApiMiddleware,
} from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireAuth } from '@/lib/auth-helpers';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import type { UpdateCommentRequest } from '@/lib/types/comments';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { commentIdParamSchema, commentUpdateSchema, formatZodError } from '@/lib/validation';

type CommentBindings = { DB: D1Database; KV_COMMENTS: KVNamespace };
type CommentEnv = { Bindings: CommentBindings };

type CommentContext = Context<CommentEnv>;

type AstroCommentEnv = { DB?: unknown; KV_COMMENTS?: KVNamespace };

function resolveAstroCommentEnv(context: APIContext): { db: D1Database; kv?: KVNamespace } {
  const runtimeEnv = (context.locals?.runtime?.env || {}) as AstroCommentEnv;
  const legacyEnv = (context as { locals?: { env?: AstroCommentEnv } }).locals?.env;
  const env = runtimeEnv ?? legacyEnv ?? {};
  const dbUnknown = env.DB;
  if (!dbUnknown) {
    throw createApiError('server_error', 'Database binding missing');
  }
  if (typeof (dbUnknown as { prepare?: unknown }).prepare !== 'function') {
    throw createApiError('server_error', 'Database binding invalid');
  }
  return { db: dbUnknown as D1Database, kv: env.KV_COMMENTS };
}

const app = new Hono<CommentEnv>();

const toAuthContext = (c: CommentContext) => ({
  req: { header: (name: string) => c.req.header(name) },
  request: c.req.raw,
  env: { DB: c.env.DB },
});

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin: string | undefined) => {
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
app.get('/:id', async (c: CommentContext) => {
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
app.put('/:id', async (c: CommentContext) => {
  try {
    const commentId = c.req.param('id');
    const user = await requireAuth(toAuthContext(c));

    const body = (await c.req.json()) as UpdateCommentRequest & { csrfToken: string };
    const { csrfToken, ...updateData } = body;

    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB, c.env.KV_COMMENTS);

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
app.delete('/:id', async (c: CommentContext) => {
  try {
    const commentId = c.req.param('id');
    const user = await requireAuth(toAuthContext(c));

    const body = (await c.req.json()) as { csrfToken: string };
    const { csrfToken } = body;

    if (!csrfToken) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'CSRF token required' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB, c.env.KV_COMMENTS);

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
export const GET = withApiMiddleware(
  async (context: APIContext) => {
    try {
      const paramsParse = commentIdParamSchema.safeParse(context.params);
      if (!paramsParse.success) {
        return createApiError('validation_error', 'Invalid comment id', {
          details: formatZodError(paramsParse.error),
        });
      }

      const { db, kv } = resolveAstroCommentEnv(context);
      const service = new CommentService(db, kv);
      const comment = await service.getCommentById(paramsParse.data.id);
      return createApiSuccess(comment);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not found')) {
        return createApiError('not_found', 'Comment not found');
      }
      if (error instanceof Response) {
        return error;
      }
      return createApiError('server_error', message);
    }
  },
  {
    logMetadata: { action: 'comment_get' },
  }
);

export const PUT = withAuthApiMiddleware(
  async (context: APIContext) => {
    try {
      const paramsParse = commentIdParamSchema.safeParse(context.params);
      if (!paramsParse.success) {
        return createApiError('validation_error', 'Invalid comment id', {
          details: formatZodError(paramsParse.error),
        });
      }

      const { db, kv } = resolveAstroCommentEnv(context);
      const user = await requireAuth({ request: context.request, env: { DB: db } });

      const bodyUnknown = await context.request.json().catch(() => undefined);
      const parsedBody = commentUpdateSchema.safeParse(bodyUnknown);
      if (!parsedBody.success) {
        return createApiError('validation_error', 'Invalid request body', {
          details: formatZodError(parsedBody.error),
        });
      }

      const csrfToken = context.request.headers.get('x-csrf-token');
      if (!csrfToken) {
        return createApiError('forbidden', 'CSRF token required');
      }

      const service = new CommentService(db, kv);
      const updated = await service.updateComment(
        paramsParse.data.id,
        parsedBody.data,
        String(user.id),
        csrfToken
      );

      return createApiSuccess(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Authentication')) {
        return createApiError('auth_error', message);
      }
      if (message.includes('not found')) {
        return createApiError('not_found', 'Comment not found');
      }
      if (message.toLowerCase().includes('csrf')) {
        return createApiError('forbidden', message);
      }
      if (error instanceof Response) {
        return error;
      }
      return createApiError('server_error', message);
    }
  },
  {
    enforceCsrfToken: true,
    logMetadata: { action: 'comment_update' },
  }
);

export const DELETE = withAuthApiMiddleware(
  async (context: APIContext) => {
    try {
      const paramsParse = commentIdParamSchema.safeParse(context.params);
      if (!paramsParse.success) {
        return createApiError('validation_error', 'Invalid comment id', {
          details: formatZodError(paramsParse.error),
        });
      }

      const { db, kv } = resolveAstroCommentEnv(context);
      const user = await requireAuth({ request: context.request, env: { DB: db } });

      const csrfToken = context.request.headers.get('x-csrf-token');
      if (!csrfToken) {
        return createApiError('forbidden', 'CSRF token required');
      }

      const service = new CommentService(db, kv);
      await service.deleteComment(paramsParse.data.id, String(user.id), csrfToken);
      return createApiSuccess({ message: 'Comment deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Authentication')) {
        return createApiError('auth_error', message);
      }
      if (message.includes('not found')) {
        return createApiError('not_found', 'Comment not found');
      }
      if (message.toLowerCase().includes('csrf')) {
        return createApiError('forbidden', message);
      }
      if (error instanceof Response) {
        return error;
      }
      return createApiError('server_error', message);
    }
  },
  {
    enforceCsrfToken: true,
    logMetadata: { action: 'comment_delete' },
  }
);
