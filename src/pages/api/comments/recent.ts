import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { recentCommentsQuerySchema, formatZodError } from '@/lib/validation';

type Env = {
  DB: D1Database;
  KV_COMMENTS?: KVNamespace;
};

type RecentCommentItem = {
  id: string;
  excerpt: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'hidden';
  createdAt: string; // ISO
  entityType: string;
  entityId: string;
  url: string;
};

function toNumberId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function toExcerpt(input: string, max = 140): string {
  const trimmed = input.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + '…';
}

export const GET = withAuthApiMiddleware(
  async (context) => {
    const { locals, request } = context;
    const env = (locals.runtime?.env ?? {}) as Partial<Env>;

    const user = locals.user;
    if (!user) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const db = env.DB;
    if (!db) {
      return createApiError('server_error', 'Database unavailable');
    }

    const kv = env.KV_COMMENTS;

    const url = new URL(request.url);
    const queryObject = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = recentCommentsQuerySchema.safeParse(queryObject);
    if (!parsedQuery.success) {
      return createApiError('validation_error', 'Invalid query parameters', {
        details: formatZodError(parsedQuery.error),
      });
    }
    const { limit } = parsedQuery.data;

    const numericUserId = toNumberId(String(user.id));
    const authorId = numericUserId !== null ? String(numericUserId) : undefined;

    if (authorId) {
      // Preferred path: use service with authorId
      const svc = new CommentService(db, kv);
      const list = await svc.listComments({
        authorId,
        limit,
        offset: 0,
        includeReplies: false,
      });
      const items: RecentCommentItem[] = (list.comments || []).map((c) => {
        const createdIso = new Date(
          (c.createdAt || Math.floor(Date.now() / 1000)) * 1000
        ).toISOString();
        const url =
          c.entityType === 'blog_post'
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
      return createApiSuccess(items);
    }

    // Fallback: string-based IDs – query by authorEmail directly (modern schema)
    try {
      const { results = [] } = await db
        .prepare(
          `SELECT id, content, status, createdAt, entityType, entityId
           FROM comments
           WHERE authorEmail = ?1
           ORDER BY createdAt DESC
           LIMIT ?2`
        )
        .bind(String(user.email || ''), limit)
        .all<{
          id: string;
          content: string;
          status: RecentCommentItem['status'];
          createdAt: number | string;
          entityType: string;
          entityId: string;
        }>();

      const items: RecentCommentItem[] = results.map((r) => {
        const createdEpoch =
          typeof r.createdAt === 'number' ? r.createdAt : Math.floor(Date.now() / 1000);
        const createdIso = new Date(createdEpoch * 1000).toISOString();
        const url =
          r.entityType === 'blog_post'
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

      return createApiSuccess(items);
    } catch {
      // As a last resort, return an empty list
      return createApiSuccess<RecentCommentItem[]>([]);
    }
  },
  {
    logMetadata: { action: 'recent_comments_accessed' },
  }
);
