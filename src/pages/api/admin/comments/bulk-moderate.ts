import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import type { D1Database } from '@cloudflare/workers-types';
import { requireModerator } from '@/lib/auth-helpers';
import { CommentService } from '@/lib/services/comment-service';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';

type BulkModerateAction = 'approve' | 'reject' | 'flag' | 'hide';

interface BulkModerateBody {
  commentIds: string[];
  action: BulkModerateAction;
  reason?: string;
}

export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = (context.locals?.runtime?.env || {}) as {
      DB?: D1Database;
      KV_COMMENTS?: KVNamespace;
    };
    const db = env.DB as D1Database | undefined;
    if (!db) return createApiError('server_error', 'Database unavailable');

    // Require moderator or admin
    let user: { id: string | number };
    try {
      user = await requireModerator({
        req: { header: (n: string) => context.request.headers.get(n) || undefined },
        request: context.request,
        env: { DB: db },
      });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    // Parse JSON body
    let body: BulkModerateBody | null = null;
    try {
      const raw = (await context.request.json()) as unknown;
      if (raw && typeof raw === 'object') {
        body = raw as BulkModerateBody;
      }
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }

    const ids = Array.isArray(body?.commentIds)
      ? (body!.commentIds as unknown[])
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter((x) => x.length > 0)
      : [];
    const action = String(body?.action || '').toLowerCase() as BulkModerateAction;
    const reason = (body?.reason || '').trim();

    if (ids.length === 0) {
      return createApiError('validation_error', 'commentIds required');
    }
    if (!['approve', 'reject', 'flag', 'hide'].includes(action)) {
      return createApiError('validation_error', 'Invalid action');
    }

    const service = new CommentService(db, env.KV_COMMENTS);
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const id of ids) {
      try {
        await service.moderateComment(id, { action, reason }, String(user.id));
        results.push({ id, ok: true });
      } catch (e) {
        results.push({ id, ok: false, error: e instanceof Error ? e.message : 'unknown_error' });
      }
    }

    return createApiSuccess({ results });
  },
  {
    // Enforce strict CSRF and apply sensitive rate limits for bulk actions
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_comments_bulk_moderate' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
