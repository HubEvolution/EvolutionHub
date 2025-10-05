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
    const entityType = url.searchParams.get('entityType');
    const entityIds = url.searchParams.getAll('entityId');

    if (!entityType || entityIds.length === 0) {
      return createApiError('validation_error', 'Missing entityType or entityId');
    }

    // Single id fast-path
    if (entityIds.length === 1) {
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
    }

    // Batch
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return createApiError('server_error', msg);
  }
});
