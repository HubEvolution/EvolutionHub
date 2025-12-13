import { withAuthApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { requireModerator } from '@/lib/auth-helpers';

type CommentRow = {
  id: string;
  content: string;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  created_at: number;
  updated_at: number;
  user_email: string | null;
  user_name: string | null;
  reports_total?: number | null;
  reports_pending?: number | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const GET = withAuthApiMiddleware(async (context: APIContext) => {
  const env = (context.locals?.runtime?.env || {}) as { DB?: D1Database };
  const db = env.DB as D1Database | undefined;
  if (!db) return createApiError('server_error', 'Database unavailable');
  // Require moderator or admin
  try {
    await requireModerator({
      req: { header: (n: string) => context.request.headers.get(n) || undefined },
      request: context.request,
      env: { DB: db },
    });
  } catch {
    return createApiError('forbidden', 'Insufficient permissions');
  }
  // Narrow DB for use in nested functions (TypeScript doesn't keep the narrow across closures)
  const database = db as D1Database;

  const url = new URL(context.request.url);
  const limit = clamp(Number(url.searchParams.get('limit') ?? '12') || 12, 1, 100);
  const offset = clamp(Number(url.searchParams.get('offset') ?? '0') || 0, 0, 100_000_000);
  const statusParam = (url.searchParams.get('status') || 'all').toLowerCase();
  const entityType = (url.searchParams.get('entityType') || '').trim();
  const entityId = (url.searchParams.get('entityId') || '').trim();
  const searchQuery = (url.searchParams.get('q') || '').trim();
  const includeReports =
    (url.searchParams.get('includeReports') || 'false').toLowerCase() === 'true';

  const allowedStatuses = new Set(['pending', 'approved', 'rejected', 'flagged', 'hidden', 'all']);
  const status = allowedStatuses.has(statusParam) ? statusParam : 'all';

  const whereParts: string[] = [];
  const binds: unknown[] = [];
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
  if (searchQuery) {
    // Simple substring search on content and author fields
    whereParts.push(
      '(c.content LIKE ? OR c.author_name LIKE ? OR c.author_email LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'
    );
    const pattern = `%${searchQuery}%`;
    binds.push(pattern, pattern, pattern, pattern, pattern);
  }
  const whereSql = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

  const statsWhereParts: string[] = [];
  const statsParams: unknown[] = [];
  if (entityType) {
    statsWhereParts.push('c.entity_type = ?');
    statsParams.push(entityType);
  }
  if (entityId) {
    statsWhereParts.push('c.entity_id = ?');
    statsParams.push(entityId);
  }
  if (searchQuery) {
    // Stats only have access to comments table (no join), so search comment text + stored author fields
    statsWhereParts.push('(c.content LIKE ? OR c.author_name LIKE ? OR c.author_email LIKE ?)');
    const pattern = `%${searchQuery}%`;
    statsParams.push(pattern, pattern, pattern);
  }
  const statsWhereSql = statsWhereParts.length ? 'WHERE ' + statsWhereParts.join(' AND ') : '';
  const statsSql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN c.status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN c.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN c.status = 'flagged' THEN 1 ELSE 0 END) as flagged,
      SUM(CASE WHEN c.status = 'hidden' THEN 1 ELSE 0 END) as hidden
    FROM comments c
    ${statsWhereSql}`;

  const statsRow = await database
    .prepare(statsSql)
    .bind(...statsParams)
    .first<{
      total: number | null;
      pending: number | null;
      approved: number | null;
      rejected: number | null;
      flagged: number | null;
      hidden: number | null;
    }>();

  const total = statsRow?.total ?? 0;
  const pending = statsRow?.pending ?? 0;
  const approved = statsRow?.approved ?? 0;
  const rejected = statsRow?.rejected ?? 0;
  const flagged = statsRow?.flagged ?? 0;
  const hidden = statsRow?.hidden ?? 0;

  const baseListSql = `
    SELECT c.id, c.content, c.author_id, c.author_email, c.author_name, c.entity_type, c.entity_id,
           c.status, c.created_at, c.updated_at,
           u.email as user_email, u.name as user_name
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id
    ${whereSql}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?`;

  const listResult = await database
    .prepare(baseListSql)
    .bind(...binds, limit, offset)
    .all<CommentRow>();

  const rows = (listResult.results || []) as CommentRow[];

  type ReportAggRow = {
    comment_id: string;
    reports_total: number | null;
    reports_pending: number | null;
  };

  const reportsByCommentId = new Map<string, { total: number; pending: number }>();

  if (includeReports && rows.length > 0) {
    const idParams = rows.map((r) => r.id);
    const placeholders = idParams.map(() => '?').join(', ');
    const reportsSql = `
      SELECT comment_id,
             COUNT(*) as reports_total,
             SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as reports_pending
      FROM comment_reports
      WHERE comment_id IN (${placeholders})
      GROUP BY comment_id`;

    const reportsResult = await database
      .prepare(reportsSql)
      .bind(...idParams)
      .all<ReportAggRow>();

    const reportRows = (reportsResult.results || []) as ReportAggRow[];
    for (const r of reportRows) {
      reportsByCommentId.set(r.comment_id, {
        total: r.reports_total ?? 0,
        pending: r.reports_pending ?? 0,
      });
    }
  }

  const toIso = (t?: number | null) => {
    if (!t || Number.isNaN(t)) return undefined;
    const ms = t < 1_000_000_000_000 ? t * 1000 : t;
    return new Date(ms).toISOString();
  };

  const comments = (rows || []).map((r) => {
    const agg = includeReports ? reportsByCommentId.get(r.id) : undefined;
    return {
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
        ? {
            reports: {
              total: agg?.total ?? 0,
              pending: agg?.pending ?? 0,
            },
          }
        : {}),
    };
  });

  const resp = createApiSuccess({
    comments,
    stats: { total, pending, approved, rejected, flagged, hidden },
    pagination: { limit, offset, count: comments.length },
    filters: { status, entityType: entityType || undefined, entityId: entityId || undefined },
  });
  try {
    resp.headers.set('Server-Timing', `query;desc=admin-comments;dur=${comments.length}`);
  } catch {}
  return resp;
});
