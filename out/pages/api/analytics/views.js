"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const validation_1 = require("@/lib/validation");
// Table will be created lazily if it doesn't exist
const ensureTableSql = `
CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
`;
async function getDb(context) {
    const env = (context.locals?.runtime?.env || {});
    const dbUnknown = env?.DB || context.locals?.env?.DB;
    if (!dbUnknown)
        throw Object.assign(new Error('Database binding missing'), {
            apiErrorType: 'server_error',
        });
    if (typeof dbUnknown.prepare !== 'function') {
        throw Object.assign(new Error('Database binding invalid'), {
            apiErrorType: 'server_error',
        });
    }
    return dbUnknown;
}
const querySchema = validation_1.z.object({ slug: validation_1.z.string().min(1).max(200) }).strict();
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    try {
        const db = await getDb(context);
        await db.exec(ensureTableSql);
        const url = new URL(context.request.url);
        const parsed = querySchema.safeParse({ slug: url.searchParams.get('slug') || '' });
        if (!parsed.success) {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid request');
        }
        const { slug } = parsed.data;
        const now = Date.now();
        const row = await db
            .prepare('SELECT count FROM page_views WHERE id = ?')
            .bind(slug)
            .first();
        const count = row?.count ?? 0;
        return (0, api_middleware_1.createApiSuccess)({ slug, count, ts: now });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
});
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    try {
        const db = await getDb(context);
        await db.exec(ensureTableSql);
        const body = await context.request.json().catch(() => ({}));
        const parsed = querySchema.safeParse({ slug: body?.slug || '' });
        if (!parsed.success) {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid request');
        }
        const { slug } = parsed.data;
        const now = Date.now();
        // Upsert counter
        await db
            .prepare('INSERT INTO page_views (id, count, updated_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at')
            .bind(slug, now)
            .run();
        const row = await db
            .prepare('SELECT count FROM page_views WHERE id = ?')
            .bind(slug)
            .first();
        const count = row?.count ?? 1;
        return (0, api_middleware_1.createApiSuccess)({ slug, count, ts: now });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return (0, api_middleware_1.createApiError)('server_error', msg);
    }
});
