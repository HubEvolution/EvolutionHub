import type { APIContext } from 'astro';
import { createApiError, createApiSuccess, withAuthApiMiddleware } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireAuth } from '@/lib/auth-helpers';
import { commentCreateSchema, formatZodError } from '@/lib/validation';

type CommentEnv = { DB?: unknown; KV_COMMENTS?: KVNamespace };

function resolveCommentEnv(context: APIContext): { db: D1Database; kv?: KVNamespace } {
  const runtimeEnv = (context.locals?.runtime?.env || {}) as CommentEnv;
  const legacyEnv = (context as { locals?: { env?: CommentEnv } }).locals?.env;
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

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    try {
      const { db, kv } = resolveCommentEnv(context);
      const user = await requireAuth({ request: context.request, env: { DB: db } });

      const bodyUnknown = await context.request.json().catch(() => undefined);
      const parsed = commentCreateSchema.safeParse(bodyUnknown);
      if (!parsed.success) {
        return createApiError('validation_error', 'Invalid request body', {
          details: formatZodError(parsed.error),
        });
      }

      const csrfToken = context.request.headers.get('x-csrf-token') ?? undefined;
      const service = new CommentService(db, kv);
      const created = await service.createComment(parsed.data, String(user.id), csrfToken);

      return createApiSuccess(created, 201);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('rate limit')) {
        return createApiError('rate_limit', 'Too many comments');
      }
      if (message.toLowerCase().includes('spam') || message.toLowerCase().includes('content')) {
        return createApiError('validation_error', message);
      }
      return createApiError('server_error', message);
    }
  },
  {
    enforceCsrfToken: true,
    logMetadata: { action: 'comment_create' },
  }
);
