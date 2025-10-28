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

// POST /api/admin/comments/[id]/moderate — Moderate a specific comment (approve/reject/flag/hide)
export const POST = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = (context.locals?.runtime?.env || {}) as {
      DB?: D1Database;
      KV_COMMENTS?: KVNamespace;
    };
    const db = env.DB as D1Database | undefined;
    if (!db) return createApiError('server_error', 'Database unavailable');

    // RBAC
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

    const commentId = context.params?.id?.toString().trim();
    if (!commentId) return createApiError('validation_error', 'Comment ID required');

    // Parse and validate body
    let body: { action?: string; reason?: string; notifyUser?: boolean } = {};
    try {
      body = (await context.request.json()) as typeof body;
    } catch {
      return createApiError('validation_error', 'Invalid JSON');
    }
    const actionStr = String(body.action || '').toLowerCase();
    const validActions = ['approve', 'reject', 'flag', 'hide'] as const;
    if (!(validActions as readonly string[]).includes(actionStr)) {
      return createApiError('validation_error', 'Invalid action');
    }
    const action = actionStr as (typeof validActions)[number];
    const reason = (body.reason || '').trim();
    const notifyUser = Boolean(body.notifyUser);

    try {
      const service = new CommentService(db, env.KV_COMMENTS);
      const moderation = await service.moderateComment(
        commentId,
        { action, reason },
        String(user.id)
      );
      const comment = await service.getCommentById(commentId);
      // Optional, non-blocking notification hook can be added later
      if (notifyUser && comment.authorId === String(user.id)) {
        // no-op
      }
      return createApiSuccess({ moderation, comment });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to moderate comment';
      if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_comment_moderate' },
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
