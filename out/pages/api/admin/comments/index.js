'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.GET = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const auth_helpers_1 = require('@/lib/auth-helpers');
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
exports.GET = (0, api_middleware_1.withAuthApiMiddleware)(async (context) => {
  const env = context.locals?.runtime?.env || {};
  const db = env.DB;
  if (!db) return (0, api_middleware_1.createApiError)('server_error', 'Database unavailable');
  // Require moderator or admin
  try {
    await (0, auth_helpers_1.requireModerator)({
      req: { header: (n) => context.request.headers.get(n) || undefined },
      request: context.request,
      env: { DB: db },
    });
  } catch {
    return (0, api_middleware_1.createApiError)('forbidden', 'Insufficient permissions');
  }
  // Narrow DB for use in nested functions (TypeScript doesn't keep the narrow across closures)
  const database = db;
  const url = new URL(context.request.url);
  const limit = clamp(Number(url.searchParams.get('limit') ?? '12') || 12, 1, 100);
  const offset = clamp(Number(url.searchParams.get('offset') ?? '0') || 0, 0, 100_000_000);
  const statusParam = (url.searchParams.get('status') || 'all').toLowerCase();
  const entityType = (url.searchParams.get('entityType') || '').trim();
  const entityId = (url.searchParams.get('entityId') || '').trim();
  const includeReports =
    (url.searchParams.get('includeReports') || 'false').toLowerCase() === 'true';
  const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'flagged', 'hidden', 'all']);
  const status = allowedStatuses.has(statusParam) ? statusParam : 'all';
  const whereParts = [];
  const binds = [];
  if (status !== 'all') {
    whereParts.push('c.status = ?');
    binds.push(status);
  }
  if (entityType) {
    whereParts.push('c.entity_type = ?');
    binds.push(entityType);
  }
  if (entityId) {
    whereParts.push('c.entity_id = ?');
    binds.push(entityId);
  }
  const whereSql = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';
  async function countByStatus(s) {
    const parts = [];
    const params = [];
    if (s) {
      parts.push('c.status = ?');
      params.push(s);
    }
    if (entityType) {
      parts.push('c.entity_type = ?');
      params.push(entityType);
    }
    if (entityId) {
      parts.push('c.entity_id = ?');
      params.push(entityId);
    }
    const sql = `SELECT COUNT(*) as v FROM comments c ${parts.length ? 'WHERE ' + parts.join(' AND ') : ''}`;
    const row = await database
      .prepare(sql)
      .bind(...params)
      .first();
    return row?.v ?? 0;
  }
  const [total, pending, approved, rejected, flagged] = await Promise.all([
    countByStatus(undefined),
    countByStatus('pending'),
    countByStatus('approved'),
    countByStatus('rejected'),
    countByStatus('flagged'),
  ]);
  const reportsJoin = includeReports
    ? `LEFT JOIN (
         SELECT comment_id,
                COUNT(*) as reports_total,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as reports_pending
         FROM comment_reports
         GROUP BY comment_id
       ) r ON r.comment_id = c.id`
    : '';
  const listSql = `
    SELECT c.id, c.content, c.author_id, c.author_email, c.author_name, c.entity_type, c.entity_id,
           c.status, c.created_at, c.updated_at,
           u.email as user_email, u.name as user_name
           ${includeReports ? ', r.reports_total, r.reports_pending' : ''}
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id
    ${reportsJoin}
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?`;
  const rows = (
    await database
      .prepare(listSql)
      .bind(...binds, limit, offset)
      .all()
  ).results;
  const toIso = (t) => {
    if (!t || Number.isNaN(t)) return undefined;
    const ms = t < 1_000_000_000_000 ? t * 1000 : t;
    return new Date(ms).toISOString();
  };
  const comments = (rows || []).map((r) => ({
    id: r.id,
    content: r.content,
    author: {
      id: r.author_id || undefined,
      email: r.author_email || r.user_email || undefined,
      name: r.author_name || r.user_name || undefined,
    },
    entityType: r.entity_type,
    entityId: r.entity_id,
    status: r.status,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
    ...(includeReports
      ? { reports: { total: r.reports_total ?? 0, pending: r.reports_pending ?? 0 } }
      : {}),
  }));
  const resp = (0, api_middleware_1.createApiSuccess)({
    comments,
    stats: { total, pending, approved, rejected, flagged },
    pagination: { limit, offset, count: comments.length },
    filters: { status, entityType: entityType || undefined, entityId: entityId || undefined },
  });
  try {
    resp.headers.set('Server-Timing', `query;desc=admin-comments;dur=${comments.length}`);
  } catch {}
  return resp;
});
