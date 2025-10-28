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

// GET /api/admin/comments/[id] — Admin details for a single comment
export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = (context.locals?.runtime?.env || {}) as {
      DB?: D1Database;
      KV_COMMENTS?: KVNamespace;
    };
    const db = env.DB as D1Database | undefined;
    if (!db) return createApiError('server_error', 'Database unavailable');

    // RBAC: moderator or admin
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

    try {
      const service = new CommentService(db, env.KV_COMMENTS);
      const comment = await service.getCommentById(commentId);
      return createApiSuccess({
        comment,
        adminData: {
          canEdit: true,
          canDelete: true,
          isAuthor: comment.authorId === String(user.id),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch comment details';
      if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
      return createApiError('server_error', msg);
    }
  },
  {
    logMetadata: { action: 'admin_comment_details' },
  }
);

// DELETE /api/admin/comments/[id] — Soft delete (hide) a comment
export const DELETE = withAuthApiMiddleware(
  async (context: APIContext) => {
    const env = (context.locals?.runtime?.env || {}) as {
      DB?: D1Database;
      KV_COMMENTS?: KVNamespace;
    };
    const db = env.DB as D1Database | undefined;
    if (!db) return createApiError('server_error', 'Database unavailable');

    // RBAC: moderator or admin
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

    let reason = 'Deleted by administrator';
    let notifyUser = false;
    try {
      const parsed = (await context.request.json()) as { reason?: string; notifyUser?: boolean };
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.reason === 'string' && parsed.reason.trim().length > 0) {
          reason = parsed.reason.trim();
        }
        if (typeof parsed.notifyUser === 'boolean') notifyUser = parsed.notifyUser;
      }
    } catch {}

    try {
      const service = new CommentService(db, env.KV_COMMENTS);
      // ensure comment exists (and for potential notifications)
      const existing = await service.getCommentById(commentId);

      const moderation = await service.moderateComment(
        commentId,
        { action: 'hide', reason },
        String(user.id)
      );

      // Optional notification hook placeholder (non-blocking)
      if (notifyUser && existing.authorId !== String(user.id)) {
        // intentionally no-op in this PR
      }

      return createApiSuccess({ moderation, deleted: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete comment';
      if (msg.includes('not found')) return createApiError('not_found', 'Comment not found');
      return createApiError('server_error', msg);
    }
  },
  {
    enforceCsrfToken: true,
    rateLimiter: sensitiveActionLimiter,
    logMetadata: { action: 'admin_comment_delete' },
  }
);

// 405 for unsupported methods
const methodNotAllowed = (allow: string) => () => createMethodNotAllowed(allow);
export const POST = methodNotAllowed('GET, DELETE');
export const PUT = methodNotAllowed('GET, DELETE');
export const PATCH = methodNotAllowed('GET, DELETE');
export const OPTIONS = methodNotAllowed('GET, DELETE');
export const HEAD = methodNotAllowed('GET, DELETE');
