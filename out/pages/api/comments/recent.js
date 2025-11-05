"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const comment_service_1 = require("@/lib/services/comment-service");
function toNumberId(id) {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
}
function toExcerpt(input, max = 140) {
    const trimmed = input.trim();
    if (trimmed.length <= max)
        return trimmed;
    return trimmed.slice(0, max - 1) + '…';
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {});
    const user = locals.user;
    if (!user) {
        return (0, api_middleware_1.createApiError)('auth_error', 'Unauthorized');
    }
    const db = env.DB;
    if (!db) {
        return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
    }
    const kv = env.KV_COMMENTS;
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limitRaw = limitParam ? parseInt(limitParam, 10) : 5;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 5;
    const numericUserId = toNumberId(String(user.id));
    if (numericUserId !== null) {
        // Preferred path: use service with authorId
        const svc = new comment_service_1.CommentService(db, kv);
        const list = await svc.listComments({
            authorId: numericUserId,
            limit,
            offset: 0,
            includeReplies: false,
        });
        const items = (list.comments || []).map((c) => {
            const createdIso = new Date((c.createdAt || Math.floor(Date.now() / 1000)) * 1000).toISOString();
            const url = c.entityType === 'blog_post'
                ? `/blog/${c.entityId}#comments`
                : `/${c.entityType}/${c.entityId}#comments`;
            return {
                id: String(c.id),
                excerpt: toExcerpt(String(c.content || '')),
                status: c.status,
                createdAt: createdIso,
                entityType: String(c.entityType || ''),
                entityId: String(c.entityId || ''),
                url,
            };
        });
        return (0, api_middleware_1.createApiSuccess)(items);
    }
    // Fallback: string-based IDs – query by authorEmail directly (modern schema)
    try {
        const { results = [] } = await db
            .prepare(`SELECT id, content, status, createdAt, entityType, entityId
           FROM comments
           WHERE authorEmail = ?1
           ORDER BY createdAt DESC
           LIMIT ?2`)
            .bind(String(user.email || ''), limit)
            .all();
        const items = results.map((r) => {
            const createdEpoch = typeof r.createdAt === 'number' ? r.createdAt : Math.floor(Date.now() / 1000);
            const createdIso = new Date(createdEpoch * 1000).toISOString();
            const url = r.entityType === 'blog_post'
                ? `/blog/${r.entityId}#comments`
                : `/${r.entityType}/${r.entityId}#comments`;
            return {
                id: String(r.id),
                excerpt: toExcerpt(String(r.content || '')),
                status: r.status,
                createdAt: createdIso,
                entityType: String(r.entityType || ''),
                entityId: String(r.entityId || ''),
                url,
            };
        });
        return (0, api_middleware_1.createApiSuccess)(items);
    }
    catch {
        // As a last resort, return an empty list
        return (0, api_middleware_1.createApiSuccess)([]);
    }
}, {
    logMetadata: { action: 'recent_comments_accessed' },
});
