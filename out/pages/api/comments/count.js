'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const d1_1 = require('drizzle-orm/d1');
const drizzle_orm_1 = require('drizzle-orm');
const schema_1 = require('@/lib/db/schema');
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const dbBinding = dbUnknown;
    const db = (0, d1_1.drizzle)(dbBinding);
    const url = new URL(context.request.url);
    const q = url.searchParams;
    const entityType = q.get('entityType');
    const entityIds = q.getAll('entityId');
    // Debug diagnostics
    if (q.get('debug') === '1') {
      try {
        const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
        const rows = Array.isArray(info?.results) ? info.results : [];
        const cols = rows.map((r) => String(r.name));
        const isLegacy =
          cols.includes('postId') &&
          cols.includes('approved') &&
          cols.includes('createdAt') &&
          !cols.includes('entity_type');
        return (0, api_middleware_1.createApiSuccess)({
          diag: { columns: cols, schema: isLegacy ? 'legacy' : 'modern' },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return (0, api_middleware_1.createApiError)('server_error', `debug-failed: ${msg}`);
      }
    }
    if (!entityType || entityIds.length === 0) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Missing entityType or entityId'
      );
    }
    // Detect legacy schema once
    const info = await dbBinding.prepare("PRAGMA table_info('comments')").all();
    const colsRows = Array.isArray(info?.results) ? info.results : [];
    const cols = new Set(colsRows.map((r) => String(r.name)));
    const isLegacy =
      cols.has('postId') &&
      cols.has('approved') &&
      cols.has('createdAt') &&
      !cols.has('entity_type');
    // Single id fast-path
    if (entityIds.length === 1) {
      if (!isLegacy) {
        const res = await db
          .select({ count: (0, drizzle_orm_1.count)() })
          .from(schema_1.comments)
          .where(
            (0, drizzle_orm_1.and)(
              (0, drizzle_orm_1.eq)(schema_1.comments.entityType, entityType),
              (0, drizzle_orm_1.eq)(schema_1.comments.entityId, entityIds[0]),
              (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved')
            )
          );
        const c = res[0]?.count || 0;
        return (0, api_middleware_1.createApiSuccess)({ entityId: entityIds[0], count: c });
      } else {
        // Legacy: entityType is ignored (only blog_post supported historically)
        const stmt = dbBinding
          .prepare('SELECT COUNT(*) as cnt FROM comments WHERE postId = ? AND approved = 1')
          .bind(entityIds[0]);
        const res = await stmt.all();
        const rrows = Array.isArray(res.results) ? res.results : [];
        const cnt = Number(rrows[0]?.cnt ?? 0);
        return (0, api_middleware_1.createApiSuccess)({ entityId: entityIds[0], count: cnt });
      }
    }
    // Batch
    if (!isLegacy) {
      const res = await db
        .select({ entityId: schema_1.comments.entityId, cnt: (0, drizzle_orm_1.count)() })
        .from(schema_1.comments)
        .where(
          (0, drizzle_orm_1.and)(
            (0, drizzle_orm_1.eq)(schema_1.comments.entityType, entityType),
            (0, drizzle_orm_1.inArray)(schema_1.comments.entityId, entityIds),
            (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved')
          )
        )
        .groupBy(schema_1.comments.entityId);
      const rows = res; // drizzle typed projection
      const map = Object.fromEntries(entityIds.map((id) => [id, 0]));
      for (const row of rows) map[row.entityId] = row.cnt || 0;
      return (0, api_middleware_1.createApiSuccess)({ counts: map });
    } else {
      // Legacy batch
      const placeholders = entityIds.map(() => '?').join(',');
      const stmt = dbBinding
        .prepare(
          `SELECT postId as entityId, COUNT(*) as cnt FROM comments WHERE postId IN (${placeholders}) AND approved = 1 GROUP BY postId`
        )
        .bind(...entityIds);
      const res = await stmt.all();
      const map = Object.fromEntries(entityIds.map((id) => [id, 0]));
      const lrows = Array.isArray(res.results) ? res.results : [];
      for (const row of lrows) {
        const eid = row.entityId;
        const cnt = row.cnt;
        map[String(eid ?? '')] = Number(cnt ?? 0);
      }
      return (0, api_middleware_1.createApiSuccess)({ counts: map });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
});
