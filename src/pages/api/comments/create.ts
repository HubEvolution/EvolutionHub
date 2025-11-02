import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireAuth } from '@/lib/auth-helpers';
import { validateCsrfToken } from '@/lib/security/csrf';
import type { CreateCommentRequest } from '@/lib/types/comments';

// POST /api/comments/create
export const POST = async (context: APIContext) => {
  try {
    const env = (context.locals?.runtime?.env || {}) as
      | { DB?: unknown; KV_COMMENTS?: KVNamespace }
      | undefined;
    const dbUnknown =
      env?.DB || (context as unknown as { locals?: { env?: { DB?: unknown } } }).locals?.env?.DB;
    if (!dbUnknown) return createApiError('server_error', 'Database binding missing');
    const hasPrepare = typeof (dbUnknown as { prepare?: unknown }).prepare === 'function';
    if (!hasPrepare) return createApiError('server_error', 'Database binding invalid');
    const db = dbUnknown as D1Database;

    // CSRF validation (required for all callers)
    const cookie = context.request.headers.get('cookie') || undefined;
    let body: (CreateCommentRequest & { csrfToken?: string }) | null = null;
    try {
      const raw = (await context.request.json()) as unknown;
      if (raw && typeof raw === 'object')
        body = raw as CreateCommentRequest & { csrfToken?: string };
      else body = null;
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

    const { csrfToken: _csrfToken, ...commentData } = body;
    if (!commentData.content || !commentData.entityType || !commentData.entityId) {
      return createApiError('validation_error', 'Missing required fields');
    }

    // Require auth: guests dürfen nicht posten
    let userId: string;
    try {
      const user = await requireAuth({ request: context.request, env: { DB: db } });
      userId = String(user.id);
    } catch {
      return createApiError('auth_error', 'Für diese Aktion ist eine Anmeldung erforderlich');
    }

    const kv =
      env?.KV_COMMENTS ||
      (context as unknown as { locals?: { env?: { KV_COMMENTS?: KVNamespace } } }).locals?.env
        ?.KV_COMMENTS;
    const service = new CommentService(db, kv);
    const created = await service.createComment(commentData, userId, token);
    try {
      const log = {
        at: Math.floor(Date.now() / 1000),
        action: 'comment_create',
        entityType: commentData.entityType,
        entityId: commentData.entityId,
        parentId: commentData.parentId || null,
        status: created?.status,
        userId,
      };

      console.log('[comments:create]', JSON.stringify(log));
    } catch {}
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
