'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
// Named export for GET /api/comments (required by file-based router)
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding missing');
    const hasPrepare = typeof dbUnknown.prepare === 'function';
    if (!hasPrepare)
      return (0, api_middleware_1.createApiError)('server_error', 'Database binding invalid');
    const db = dbUnknown;
    const url = new URL(context.request.url);
    const q = url.searchParams;
    // Debug diagnostics (non-sensitive) to help verify schema in staging/testing
    if (q.get('debug') === '1') {
      try {
        const info = await db.prepare("PRAGMA table_info('comments')").all();
        const rows = Array.isArray(info?.results) ? info.results : [];
        const cols = rows.map((r) => String(r.name));
        const isLegacy =
          cols.includes('postId') &&
          cols.includes('approved') &&
          cols.includes('createdAt') &&
          !cols.includes('entity_type');
        const tablesRaw = await db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all();
        const trows = Array.isArray(tablesRaw?.results) ? tablesRaw.results : [];
        const tables = trows.map((r) => String(r.name));
        return (0, api_middleware_1.createApiSuccess)({
          diag: { columns: cols, schema: isLegacy ? 'legacy' : 'modern', tables },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return (0, api_middleware_1.createApiError)('server_error', `debug-failed: ${msg}`);
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
    const filters = {
      status,
      entityType,
      entityId: q.get('entityId') ?? undefined,
      authorId: q.get('authorId') ?? undefined,
      limit: q.get('limit') ? Number(q.get('limit')) : 20,
      offset: q.get('offset') ? Number(q.get('offset')) : 0,
      includeReplies: q.get('includeReplies') !== 'false',
    };
    const kv = env?.KV_COMMENTS || context.locals?.env?.KV_COMMENTS;
    // Dynamic import to avoid loading heavy/transitive modules (notifications etc.) in debug path
    const { CommentService } = await Promise.resolve().then(() =>
      require('@/lib/services/comment-service')
    );
    const service = new CommentService(db, kv);
    const result = await service.listComments(filters);
    return (0, api_middleware_1.createApiSuccess)(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (0, api_middleware_1.createApiError)('server_error', msg);
  }
});
// Note: no default export; named handlers are used by the router
