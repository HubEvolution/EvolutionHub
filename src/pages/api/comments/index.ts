import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import type { CommentFilters } from '@/lib/types/comments';

// Named export for GET /api/comments (required by file-based router)
export const GET = withApiMiddleware(async (context: APIContext) => {
  try {
    const env = (context.locals?.runtime?.env || {}) as { DB?: any; KV_COMMENTS?: any };
    const db = env?.DB || (context as unknown as { locals?: { env?: { DB?: any } } }).locals?.env?.DB;
    if (!db) return createApiError('server_error', 'Database binding missing');

    const url = new URL(context.request.url);
    const q = url.searchParams;

    // Debug diagnostics (non-sensitive) to help verify schema in staging/testing
    if (q.get('debug') === '1') {
      try {
        const info = await db.prepare("PRAGMA table_info('comments')").all();
        const rows = Array.isArray(info?.results)
          ? (info.results as Array<Record<string, unknown>>)
          : [];
        const cols = rows.map((r) => String((r as { name?: unknown }).name));
        const isLegacy =
          cols.includes('postId') &&
          cols.includes('approved') &&
          cols.includes('createdAt') &&
          !cols.includes('entity_type');
        const tablesRaw = await db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all();
        const trows = Array.isArray(tablesRaw?.results)
          ? (tablesRaw.results as Array<Record<string, unknown>>)
          : [];
        const tables = trows.map((r) => String((r as { name?: unknown }).name));
        return createApiSuccess({
          diag: { columns: cols, schema: isLegacy ? 'legacy' : 'modern', tables },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return createApiError('server_error', `debug-failed: ${msg}`);
      }
    }
    const statusQ = q.get('status');
    const status =
      statusQ === 'pending' ||
      statusQ === 'approved' ||
      statusQ === 'rejected' ||
      statusQ === 'flagged' ||
      statusQ === 'hidden'
        ? statusQ
        : undefined;
    const entityTypeQ = q.get('entityType');
    const entityType =
      entityTypeQ === 'blog_post' || entityTypeQ === 'project' || entityTypeQ === 'general'
        ? entityTypeQ
        : undefined;
    const filters: CommentFilters = {
      status,
      entityType,
      entityId: q.get('entityId') ?? undefined,
      authorId: q.get('authorId') ?? undefined,
      limit: q.get('limit') ? Number(q.get('limit')) : 20,
      offset: q.get('offset') ? Number(q.get('offset')) : 0,
      includeReplies: q.get('includeReplies') !== 'false',
    };

    const kv =
      env?.KV_COMMENTS ||
      (context as unknown as { locals?: { env?: { KV_COMMENTS?: any } } }).locals?.env?.KV_COMMENTS;
    // Dynamic import to avoid loading heavy/transitive modules (notifications etc.) in debug path
    const { CommentService } = await import('@/lib/services/comment-service');
    const service = new CommentService(db, kv);
    const result = await service.listComments(filters);
    return createApiSuccess(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return createApiError('server_error', msg);
  }
});

// Note: no default export; named handlers are used by the router
