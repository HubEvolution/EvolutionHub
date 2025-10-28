import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireAuth } from '@/lib/auth-helpers';
import { validateCsrfToken } from '@/lib/security/csrf';
import type { ReportCommentRequest } from '@/lib/types/comments';

// POST /api/comments/[id]/report
export const POST = async (context: APIContext) => {
  try {
    const env = (context.locals?.runtime?.env || {}) as { DB?: any; KV_COMMENTS?: any } | undefined;
    const db = env?.DB || (context as unknown as { locals?: { env?: { DB?: any } } }).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    const id = context.params.id as string | undefined;
    if (!id) return createApiError('validation_error', 'Comment ID required');

    // Auth required
    const user = await requireAuth({ request: context.request, env: { DB: db } });

    // Body + CSRF
    const raw = (await context.request.json().catch(() => ({}))) as unknown;
    const body = (raw && typeof raw === 'object'
      ? (raw as ReportCommentRequest & { csrfToken?: string })
      : ({} as ReportCommentRequest & { csrfToken?: string }));
    const token = body?.csrfToken || context.request.headers.get('x-csrf-token') || '';
    const cookie = context.request.headers.get('cookie') || undefined;
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

    // Validate body
    if (!body || !body.reason) {
      return createApiError('validation_error', 'Missing reason');
    }

    const kv =
      env?.KV_COMMENTS ||
      (context as unknown as { locals?: { env?: { KV_COMMENTS?: any } } }).locals?.env?.KV_COMMENTS;
    const service = new CommentService(db, kv);

    const { csrfToken, ...reportData } = body;
    const report = await service.reportComment(id, reportData, String(user.id));

    return createApiSuccess(report, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Authentication')) return createApiError('auth_error', msg);
    if (msg.toLowerCase().includes('csrf')) {
      return new Response(
        JSON.stringify({ success: false, error: { type: 'csrf_error', message: msg } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return createApiError('server_error', msg);
  }
};
