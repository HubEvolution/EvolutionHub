import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { drizzle } from 'drizzle-orm/d1';
import { and, count, eq, inArray } from 'drizzle-orm';
import { comments } from '@/lib/db/schema';
import { commentCountQuerySchema, formatZodError } from '@/lib/validation';

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

function getCommentsCountMode(context: APIContext): 'disabled' | 'db' {
  try {
    const env =
      (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env ||
      {};
    const raw = (env as Record<string, string>).COMMENTS_COUNT_MODE;
    if (raw && raw.toLowerCase() === 'disabled') {
      return 'disabled';
    }
    return 'db';
  } catch {
    return 'db';
  }
}

export const GET = withApiMiddleware(
  async (context: APIContext) => {
    try {
      const url = new URL(context.request.url);
      const q = url.searchParams;

      // Debug diagnostics
      if (q.get('debug') === '1') {
        const env = (context.locals?.runtime?.env || {}) as { DB?: unknown };
        const dbUnknown =
          env?.DB ||
          (context as unknown as { locals?: { env?: { DB?: unknown } } }).locals?.env?.DB;
        if (!dbUnknown) return createApiError('server_error', 'Database binding missing');
        const hasPrepare = typeof (dbUnknown as { prepare?: unknown }).prepare === 'function';
        if (!hasPrepare) return createApiError('server_error', 'Database binding invalid');
        const dbBinding = dbUnknown as D1Database;
        try {
          const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
          const rows = Array.isArray(info?.results)
            ? (info.results as Array<Record<string, unknown>>)
            : [];
          const cols = rows.map((r) => String((r as { name?: unknown }).name));
          const isLegacy =
            cols.includes('postId') &&
            cols.includes('approved') &&
            cols.includes('createdAt') &&
            !cols.includes('entity_type');
          return createApiSuccess({
            diag: { columns: cols, schema: isLegacy ? 'legacy' : 'modern' },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return createApiError('server_error', `debug-failed: ${msg}`);
        }
      }

      const queryRecord = buildQueryRecord(q);
      const parsedQuery = commentCountQuerySchema.safeParse(queryRecord);
      if (!parsedQuery.success) {
        return createApiError('validation_error', 'Invalid query parameters', {
          details: formatZodError(parsedQuery.error),
        });
      }

      const { entityType, entityIds } = parsedQuery.data;

      const mode = getCommentsCountMode(context);
      if (mode === 'disabled') {
        if (entityIds.length === 1) {
          return createApiSuccess({ entityId: entityIds[0], count: 0 });
        }
        const stubMap: Record<string, number> = Object.fromEntries(entityIds.map((id) => [id, 0]));
        return createApiSuccess({ counts: stubMap });
      }

      const env = (context.locals?.runtime?.env || {}) as { DB?: unknown };
      const dbUnknown =
        env?.DB || (context as unknown as { locals?: { env?: { DB?: unknown } } }).locals?.env?.DB;
      if (!dbUnknown) return createApiError('server_error', 'Database binding missing');
      const hasPrepare = typeof (dbUnknown as { prepare?: unknown }).prepare === 'function';
      if (!hasPrepare) return createApiError('server_error', 'Database binding invalid');
      const dbBinding = dbUnknown as D1Database;
      const db = drizzle(dbBinding);

      // Detect legacy schema once
      const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
      const colsRows = Array.isArray(info?.results)
        ? (info.results as Array<Record<string, unknown>>)
        : [];
      const cols = new Set<string>(colsRows.map((r) => String((r as { name?: unknown }).name)));
      const isLegacy =
        cols.has('postId') &&
        cols.has('approved') &&
        cols.has('createdAt') &&
        !cols.has('entity_type');

      // Single id fast-path
      if (entityIds.length === 1) {
        if (!isLegacy) {
          const res = await db
            .select({ count: count() })
            .from(comments)
            .where(
              and(
                eq(comments.entityType, entityType),
                eq(comments.entityId, entityIds[0]),
                eq(comments.status, 'approved')
              )
            );
          const c = res[0]?.count || 0;
          return createApiSuccess({ entityId: entityIds[0], count: c });
        } else {
          // Legacy: entityType is ignored (only blog_post supported historically)
          const stmt = dbBinding
            .prepare('SELECT COUNT(*) as cnt FROM comments WHERE postId = ? AND approved = 1')
            .bind(entityIds[0]);
          const res = await stmt.all();
          const rrows = Array.isArray(res.results)
            ? (res.results as Array<Record<string, unknown>>)
            : [];
          const cnt = Number((rrows[0] as { cnt?: unknown })?.cnt ?? 0);
          return createApiSuccess({ entityId: entityIds[0], count: cnt });
        }
      }

      // Batch
      if (!isLegacy) {
        const res = await db
          .select({ entityId: comments.entityId, cnt: count() })
          .from(comments)
          .where(
            and(
              eq(comments.entityType, entityType),
              inArray(comments.entityId, entityIds),
              eq(comments.status, 'approved')
            )
          )
          .groupBy(comments.entityId);
        const rows = res as Array<{ entityId: string; cnt: number }>; // drizzle typed projection
        const map: Record<string, number> = Object.fromEntries(entityIds.map((id) => [id, 0]));
        for (const row of rows) map[row.entityId] = row.cnt || 0;
        return createApiSuccess({ counts: map });
      } else {
        // Legacy batch
        const placeholders = entityIds.map(() => '?').join(',');
        const stmt = dbBinding
          .prepare(
            `SELECT postId as entityId, COUNT(*) as cnt FROM comments WHERE postId IN (${placeholders}) AND approved = 1 GROUP BY postId`
          )
          .bind(...entityIds);
        const res = await stmt.all();
        const map: Record<string, number> = Object.fromEntries(entityIds.map((id) => [id, 0]));
        const lrows = Array.isArray(res.results)
          ? (res.results as Array<Record<string, unknown>>)
          : [];
        for (const row of lrows) {
          const eid = row.entityId as unknown;
          const cnt = row.cnt as unknown;
          map[String(eid ?? '')] = Number(cnt ?? 0);
        }
        return createApiSuccess({ counts: map });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return createApiError('server_error', msg);
    }
  },
  {
    logMetadata: { action: 'comments_count' },
  }
);
