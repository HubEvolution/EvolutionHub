import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import type { CommentFilters } from '@/lib/types/comments';
import { commentListQuerySchema, formatZodError } from '@/lib/validation';

type D1ResultRow = Record<string, unknown>;
type D1Result = { results?: D1ResultRow[] };
type CommentsEnv = { DB?: unknown; KV_COMMENTS?: KVNamespace };

function buildQueryRecord(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  const keys = new Set<string>();
  params.forEach((_, key) => keys.add(key));
  for (const key of keys) {
    const values = params.getAll(key);
    if (values.length === 0) continue;
    record[key] = values.length === 1 ? values[0] : values;
  }
  return record;
}

// Named export for GET /api/comments (required by file-based router)
export const GET = withApiMiddleware(
  async (context: APIContext) => {
    try {
      const env = (context.locals?.runtime?.env || {}) as CommentsEnv;
      const dbUnknown =
        env?.DB || (context as unknown as { locals?: { env?: { DB?: unknown } } }).locals?.env?.DB;
      if (!dbUnknown) return createApiError('server_error', 'Database binding missing');
      const hasPrepare = typeof (dbUnknown as { prepare?: unknown }).prepare === 'function';
      if (!hasPrepare) return createApiError('server_error', 'Database binding invalid');
      const db = dbUnknown as D1Database;

      const url = new URL(context.request.url);

      // Debug diagnostics (non-sensitive) to help verify schema in staging/testing
      if (url.searchParams.get('debug') === '1') {
        try {
          const info = await db.prepare("PRAGMA table_info('comments')").all();
          const rows = Array.isArray((info as D1Result)?.results)
            ? ((info as D1Result).results as D1ResultRow[])
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
          const trows = Array.isArray((tablesRaw as D1Result)?.results)
            ? ((tablesRaw as D1Result).results as D1ResultRow[])
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

      const queryRecord = buildQueryRecord(url.searchParams);
      const parsedQuery = commentListQuerySchema.safeParse(queryRecord);
      if (!parsedQuery.success) {
        return createApiError('validation_error', 'Invalid query parameters', {
          details: formatZodError(parsedQuery.error),
        });
      }

      const { debug: _debug, ...parsedFilters } = parsedQuery.data;

      const filters: CommentFilters = {
        status: parsedFilters.status,
        entityType: parsedFilters.entityType,
        entityId: parsedFilters.entityId,
        authorId: parsedFilters.authorId,
        limit: parsedFilters.limit,
        offset: parsedFilters.offset,
        includeReplies: parsedFilters.includeReplies,
      };

      const kv =
        env?.KV_COMMENTS ||
        (context as unknown as { locals?: { env?: { KV_COMMENTS?: KVNamespace } } }).locals?.env
          ?.KV_COMMENTS;
      // Dynamic import to avoid loading heavy/transitive modules (notifications etc.) in debug path
      const { CommentService } = await import('@/lib/services/comment-service');
      const service = new CommentService(db, kv);
      const result = await service.listComments(filters);
      return createApiSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return createApiError('server_error', msg);
    }
  },
  {
    logMetadata: { action: 'comments_list' },
  }
);

// Note: no default export; named handlers are used by the router
