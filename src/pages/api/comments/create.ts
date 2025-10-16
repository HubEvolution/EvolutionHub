import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrfToken } from '@/lib/security/csrf';
import type { CreateCommentRequest } from '@/lib/types/comments';

// POST /api/comments/create
export const POST = async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as
      | { DB: D1Database; KV_COMMENTS?: KVNamespace }
      | undefined;
    const db = env?.DB || (context as any).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    // CSRF validation (required for all callers)
    const cookie = context.request.headers.get('cookie') || undefined;
    let body: (CreateCommentRequest & { csrfToken?: string }) | null = null;
    try {
      body = (await context.request.json()) as CreateCommentRequest & { csrfToken?: string };
    } catch {
      body = null;
    }
    const headerToken = context.request.headers.get('x-csrf-token') || '';
    const token = (body?.csrfToken || headerToken || '').toString();
    const ok = await validateCsrfToken(token, cookie);
    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { type: 'csrf_error', message: 'Invalid CSRF token' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body) {
      return createApiError('validation_error', 'Missing JSON body');
    }

    const { csrfToken, ...commentData } = body;
    if (!commentData.content || !commentData.entityType || !commentData.entityId) {
      return createApiError('validation_error', 'Missing required fields');
    }

    // Optional auth
    const user = await getAuthUser({ request: context.request, env: { DB: db } });
    const userId = user ? String(user.id) : undefined;

    const kv = env?.KV_COMMENTS || (context as any).locals?.env?.KV_COMMENTS;
    const service = new CommentService(db, kv);
    const created = await service.createComment(commentData, userId, token);
    return createApiSuccess(created, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('rate limit'))
      return createApiError('rate_limit', 'Too many comments');
    if (msg.toLowerCase().includes('spam') || msg.toLowerCase().includes('content')) {
      return createApiError('validation_error', msg);
    }
    return createApiError('server_error', msg);
  }
};
