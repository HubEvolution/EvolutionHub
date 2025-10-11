import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { drizzle } from 'drizzle-orm/d1';
import { and, count, eq, inArray } from 'drizzle-orm';
import { comments } from '@/lib/db/schema';

export const GET = withApiMiddleware(async (context: APIContext) => {
  try {
    const env = (context.locals as any).runtime?.env as { DB: D1Database } | undefined;
    const dbBinding = env?.DB || (context as any).locals?.env?.DB;
    if (!dbBinding) return createApiError('server_error', 'Database binding missing');
    const db = drizzle(dbBinding);

    const url = new URL(context.request.url);
    const q = url.searchParams;
    const entityType = q.get('entityType');
    const entityIds = q.getAll('entityId');

    // Debug diagnostics
    if (q.get('debug') === '1') {
      try {
        const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
        const cols = ((info?.results as any[]) || []).map((r: any) => String(r.name));
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

    if (!entityType || entityIds.length === 0) {
      return createApiError('validation_error', 'Missing entityType or entityId');
    }

    // Detect legacy schema once
    const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
    const cols = new Set<string>(((info?.results as any[]) || []).map((r: any) => String(r.name)));
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
              eq(comments.entityType, entityType as any),
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
        const cnt = Number((res.results as any[])[0]?.cnt || 0);
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
            eq(comments.entityType, entityType as any),
            inArray(comments.entityId, entityIds),
            eq(comments.status, 'approved')
          )
        )
        .groupBy(comments.entityId);

      const map: Record<string, number> = Object.fromEntries(entityIds.map((id) => [id, 0]));
      for (const row of res as any[]) map[row.entityId] = row.cnt || 0;
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
      for (const row of (res.results as any[]) || []) {
        map[String((row as any).entityId)] = Number((row as any).cnt || 0);
      }
      return createApiSuccess({ counts: map });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return createApiError('server_error', msg);
  }
});
