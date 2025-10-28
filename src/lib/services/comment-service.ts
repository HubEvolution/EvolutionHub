import { eq, and, desc, count, sql, inArray, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { generateId } from '@/lib/utils/id-generator';
import { rateLimit } from '@/lib/rate-limiter';
import { validateCsrfToken } from '@/lib/security/csrf';
import { checkSpam } from '@/lib/spam-detection';
import { comments, commentModeration, commentReports } from '@/lib/db/schema';
import type { NotificationContext, CommentNotificationData } from '../types/notifications';
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentModeration,
  CommentReport,
  CommentFilters,
  CommentListResponse,
  CommentStats,
  ModerateCommentRequest,
  ReportCommentRequest,
  ModerationQueueItem,
} from '../types/comments';

export class CommentService {
  private db: ReturnType<typeof drizzle>;
  private rawDb: D1Database;
  private kv?: KVNamespace;
  private cacheTTLSeconds: number;
  private schemaDetection?: { isLegacy: boolean };

  constructor(db: D1Database, kv?: KVNamespace, options?: { cacheTTLSeconds?: number }) {
    this.rawDb = db;
    this.db = drizzle(db);
    this.kv = kv;
    this.cacheTTLSeconds = options?.cacheTTLSeconds ?? 300;
    this.schemaDetection = undefined;
  }

  // Minimal interface to avoid importing implementation at typecheck time
  private async getNotificationService(): Promise<{
    createCommentNotification: (
      context: NotificationContext,
      type: string,
      data: CommentNotificationData
    ) => Promise<unknown>;
    sendEmail: (req: { to: string; templateName: string; variables: Record<string, unknown> }) => Promise<unknown>;
  }> {
    const mod = await import('./' + 'notification-service');
    const svc = new mod.NotificationService(this.rawDb);
    return svc as unknown as {
      createCommentNotification: (
        context: NotificationContext,
        type: string,
        data: CommentNotificationData
      ) => Promise<unknown>;
      sendEmail: (req: { to: string; templateName: string; variables: Record<string, unknown> }) => Promise<unknown>;
    };
  }

  /**
   * Detect if the deployed DB uses the older, legacy comments schema
   * with columns: postId, author, approved, createdAt (TEXT), etc.
   */
  private async isLegacyCommentsSchema(): Promise<boolean> {
    if (this.schemaDetection) return this.schemaDetection.isLegacy;
    try {
      const info = await this.rawDb.prepare("PRAGMA table_info('comments')").all();
      // D1 returns rows with a 'name' field for column name
      const cols = new Set<string>(
        (Array.isArray(info?.results)
          ? info!.results.map((r) => String((r as { name?: unknown }).name))
          : [])
      );
      const legacy =
        cols.has('postId') &&
        cols.has('approved') &&
        cols.has('createdAt') &&
        !cols.has('entity_type');
      this.schemaDetection = { isLegacy: legacy };
      return legacy;
    } catch {
      // If PRAGMA fails, assume modern schema and let errors surface
      this.schemaDetection = { isLegacy: false };
      return false;
    }
  }

  /**
   * Legacy fallback for listing comments using the old schema shape.
   */
  private async listCommentsLegacy(filters: CommentFilters = {}): Promise<CommentListResponse> {
    const { entityId, limit = 20, offset = 0, authorId } = filters;

    // Legacy table only supported blog posts via postId; if missing, return empty
    if (!entityId) {
      return { comments: [], total: 0, hasMore: false };
    }

    // Build WHERE
    // Only approved when not author scoped (legacy had boolean approved)
    const whereParts: string[] = ['postId = ?']; // entityType ignored in legacy
    const params: unknown[] = [entityId];
    if (!authorId) {
      whereParts.push('approved = 1');
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // Total count
    const totalStmt = this.rawDb
      .prepare(`SELECT COUNT(*) as cnt FROM comments ${whereSql}`)
      .bind(...params);
    const totalRes = await totalStmt.all();
    const totalArr = Array.isArray(totalRes.results) ? totalRes.results : [];
    const total = Number(((totalArr[0] as { cnt?: unknown })?.cnt ?? 0));

    // Page results
    const pageStmt = this.rawDb
      .prepare(
        `SELECT 
            id,
            content,
            NULL as authorId,
            author as authorName,
            '' as authorEmail,
            NULL as parentId,
            'blog_post' as entityType,
            postId as entityId,
            CASE approved WHEN 1 THEN 'approved' ELSE 'pending' END as status,
            0 as isEdited,
            NULL as editedAt,
            -- legacy createdAt stored as TEXT timestamp; try to coerce to epoch seconds if numeric, else leave as-is
            CAST(strftime('%s', createdAt) AS INTEGER) as createdAt,
            CAST(strftime('%s', createdAt) AS INTEGER) as updatedAt
         FROM comments 
         ${whereSql}
         ORDER BY createdAt DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset);
    const pageRes = await pageStmt.all();
    const rows = (Array.isArray(pageRes.results) ? pageRes.results : []) as Array<Record<string, unknown>>;

    const items = rows.map((r) => ({
      id: String(r.id),
      content: String(r.content),
      authorId: r.authorId == null ? null : String(r.authorId),
      authorName: String(r.authorName || 'Anonymous'),
      authorEmail: String(r.authorEmail || ''),
      parentId: r.parentId ? String(r.parentId) : null,
      entityType: 'blog_post',
      entityId: String(r.entityId),
      status: ((typeof r.status === 'string' ? r.status : 'approved') as Comment['status']),
      isEdited: Boolean(r.isEdited),
      editedAt: r.editedAt ? Number(r.editedAt) : null,
      createdAt: r.createdAt ? Number(r.createdAt) : Math.floor(Date.now() / 1000),
      updatedAt: r.updatedAt ? Number(r.updatedAt) : Math.floor(Date.now() / 1000),
      reportCount: 0,
      replies: [],
    })) as Comment[];

    return {
      comments: items,
      total,
      hasMore: offset + limit < total,
    };
  }

  private cacheKeyForList(filters: CommentFilters = {}): string | null {
    const {
      entityType,
      entityId,
      limit = 20,
      offset = 0,
      includeReplies = true,
      status,
    } = filters;
    if (!entityType || !entityId) return null;
    return `comments:list:${entityType}:${entityId}:l=${limit}:o=${offset}:r=${includeReplies ? 1 : 0}:s=${status ?? 'any'}`;
  }

  private async tryGetCache<T>(key: string): Promise<T | null> {
    if (!this.kv) return null;
    try {
      const raw = await this.kv.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async setCache<T>(key: string, value: T): Promise<void> {
    if (!this.kv) return;
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: this.cacheTTLSeconds });
    } catch {
      // ignore cache write errors
    }
  }

  private async invalidateEntityCache(
    entityType: string | undefined,
    entityId: string | undefined
  ): Promise<void> {
    if (!this.kv || !entityType || !entityId) return;
    try {
      const prefix = `comments:list:${entityType}:${entityId}:`;
      const list = await this.kv.list({ prefix });
      await Promise.all(list.keys.map((k) => this.kv!.delete(k.name)));
    } catch {
      // ignore cache invalidation errors
    }
  }

  /**
   * Create a new comment with validation and rate limiting
   */
  async createComment(
    request: CreateCommentRequest,
    userId?: string,
    csrfToken?: string
  ): Promise<Comment> {
    // CSRF validation for authenticated users
    if (userId && csrfToken) {
      const isValidCsrf = await validateCsrfToken(csrfToken);
      if (!isValidCsrf) {
        throw new Error('Invalid CSRF token');
      }
    }

    // Rate limiting: 5 comments per minute per IP/user
    await rateLimit(`comment:${userId || 'guest'}:create`, 5, 60);

    // Validate content
    if (!request.content || request.content.trim().length < 3) {
      throw new Error('Comment content must be at least 3 characters long');
    }

    if (request.content.length > 2000) {
      throw new Error('Comment content must be less than 2000 characters');
    }

    // Enhanced spam detection
    const spamCheck = checkSpam(request.content, { strictness: 'medium' });
    if (spamCheck.isSpam) {
      throw new Error(
        `Comment rejected due to spam detection. Reasons: ${spamCheck.reasons.slice(0, 2).join(', ')}`
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const commentId = generateId();

    // Get user info if authenticated
    let authorName = request.authorName || 'Anonymous';
    let authorEmail = request.authorEmail || '';

    if (userId) {
      try {
        const res = await this.rawDb
          .prepare('SELECT name, email FROM users WHERE id = ? LIMIT 1')
          .bind(userId)
          .first<{ name: string; email: string }>();
        if (res) {
          authorName = res.name;
          authorEmail = res.email;
        }
      } catch {}
    }

    // Sanitize content to prevent XSS attacks (lazy import to avoid DOM dependency in Workers for GET routes)
    const sanitizedContent = await (async () => {
      try {
        const mod = await import('@/lib/security/sanitize');
        const maybe = mod as { sanitizeCommentContent?: (s: string) => string };
        if (typeof maybe.sanitizeCommentContent === 'function') {
          return maybe.sanitizeCommentContent(request.content.trim());
        }
        return request.content
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      } catch {
        return request.content
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
    })();

    // Insert comment
    await this.db.insert(comments).values({
      id: commentId,
      content: sanitizedContent,
      authorId: userId ?? null, // null for guest users
      authorName,
      authorEmail,
      parentId: request.parentId,
      entityType: request.entityType,
      entityId: request.entityId,
      status: userId ? 'approved' : 'pending', // Auto-approve authenticated users
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    });

    // Notifications: if this is a reply, notify parent author (in-app + email queue)
    try {
      if (request.parentId) {
        // Load parent comment to get recipient info
        const parent = await this.getCommentById(request.parentId);
        if (parent && parent.authorId && parent.authorEmail) {
          const notificationService = await this.getNotificationService();
          const context = ({
            userId: parent.authorId,
            locale: 'de',
            baseUrl: '',
          } as unknown) as NotificationContext;
          const data: CommentNotificationData = {
            commentId,
            commentContent: sanitizedContent,
            authorName,
            entityType: request.entityType,
            entityId: request.entityId,
            parentCommentId: parent.id,
            parentAuthorName: parent.authorName,
          };

          // In-app notification (ignore if disabled)
          try {
            await notificationService.createCommentNotification(context, 'comment_reply', data);
          } catch {}

          // Email queue (ignore if disabled)
          try {
            await notificationService.sendEmail({
              to: parent.authorEmail,
              templateName: 'reply-notification',
              variables: {
                userName: parent.authorName || 'User',
                baseUrl: '',
                notification: data,
              },
            });
          } catch {}
        }
      }
    } catch {
      // Do not block comment creation on notification errors
    }

    // Invalidate cache for the entity
    await this.invalidateEntityCache(request.entityType, request.entityId);

    // Fetch and return the created comment
    return this.getCommentById(commentId);
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    commentId: string,
    request: UpdateCommentRequest,
    userId: string,
    csrfToken: string
  ): Promise<Comment> {
    // CSRF validation
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      throw new Error('Invalid CSRF token');
    }

    // Validate content
    if (!request.content || request.content.trim().length < 3) {
      throw new Error('Comment content must be at least 3 characters long');
    }

    if (request.content.length > 2000) {
      throw new Error('Comment content must be less than 2000 characters');
    }

    const now = Math.floor(Date.now() / 1000);

    // Sanitize content to prevent XSS attacks (lazy import to avoid DOM dependency)
    const sanitizedContent = await (async () => {
      try {
        const mod = await import('@/lib/security/sanitize');
        const maybe = mod as { sanitizeCommentContent?: (s: string) => string };
        if (typeof maybe.sanitizeCommentContent === 'function') {
          return maybe.sanitizeCommentContent(request.content.trim());
        }
        return request.content
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      } catch {
        return request.content
          .trim()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }
    })();

    // Update comment
    let isAdmin = false;
    try {
      const actor = await this.rawDb
        .prepare('SELECT email, role FROM users WHERE id = ? LIMIT 1')
        .bind(userId)
        .first<{ email: string; role?: string }>();
      isAdmin = !!actor && (actor.email === 'admin@hub-evolution.com' || actor.role === 'admin');
    } catch {}

    const whereCond = isAdmin
      ? eq(comments.id, commentId)
      : and(eq(comments.id, commentId), eq(comments.authorId, userId));

    await this.db
      .update(comments)
      .set({
        content: sanitizedContent,
        isEdited: true,
        editedAt: now,
        updatedAt: now,
      })
      .where(whereCond);

    return this.getCommentById(commentId);
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string, csrfToken: string): Promise<void> {
    // CSRF validation
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      throw new Error('Invalid CSRF token');
    }

    // Delete comment (soft delete by hiding)
    let isAdmin = false;
    try {
      const actor = await this.rawDb
        .prepare('SELECT email, role FROM users WHERE id = ? LIMIT 1')
        .bind(userId)
        .first<{ email: string; role?: string }>();
      isAdmin = !!actor && (actor.email === 'admin@hub-evolution.com' || actor.role === 'admin');
    } catch {}

    const whereCond = isAdmin
      ? eq(comments.id, commentId)
      : and(eq(comments.id, commentId), eq(comments.authorId, userId));

    await this.db
      .update(comments)
      .set({
        status: 'hidden',
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(whereCond);

    try {
      const updated = await this.getCommentById(commentId);
      await this.invalidateEntityCache(updated.entityType, updated.entityId);
    } catch {}
  }

  /**
   * Get a comment by ID with moderation history
   */
  async getCommentById(commentId: string): Promise<Comment> {
    const result = await this.db
      .select({
        comment: comments,
        reportCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${commentReports}
          WHERE ${commentReports.commentId} = ${comments.id}
          AND ${commentReports.status} IN ('pending', 'reviewed')
        )`,
        authorImage: sql<string>`(
          SELECT image FROM users WHERE users.id = ${comments.authorId} LIMIT 1
        )`,
      })
      .from(comments)
      .leftJoin(commentReports, eq(commentReports.commentId, comments.id))
      .where(eq(comments.id, commentId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Comment not found');
    }

    const row0 = result[0] as { comment: Comment; reportCount: number; authorImage: string | null };
    const { comment, reportCount, authorImage } = row0;
    return {
      ...comment,
      reportCount: reportCount || 0,
      authorImage: authorImage || null,
    } as Comment;
  }

  /**
   * List comments with filtering and pagination
   */
  async listComments(filters: CommentFilters = {}): Promise<CommentListResponse> {
    // Compatibility: use legacy path if old columns are present
    if (await this.isLegacyCommentsSchema()) {
      return this.listCommentsLegacy(filters);
    }
    const {
      status,
      entityType,
      entityId,
      authorId,
      limit = 20,
      offset = 0,
      includeReplies = true,
    } = filters;

    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(comments.status, status));
    }

    if (entityType && entityId) {
      whereConditions.push(eq(comments.entityType, entityType));
      whereConditions.push(eq(comments.entityId, entityId));
    }

    if (authorId) {
      whereConditions.push(eq(comments.authorId, authorId));
    }

    // Only show approved comments to non-admin users
    // (In a real app, you'd check user permissions here)
    if (!authorId) {
      whereConditions.push(eq(comments.status, 'approved'));
    }

    const baseWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // KV cache (optional): only cache entity-scoped lists with small pages
    const canCache = !!this.kv && !!entityType && !!entityId && limit <= 50 && offset <= 100;
    const cacheKey = this.cacheKeyForList({
      status,
      entityType,
      entityId,
      authorId,
      limit,
      offset,
      includeReplies,
    });
    if (canCache && cacheKey) {
      const cached = await this.tryGetCache<CommentListResponse>(cacheKey);
      if (cached) return cached;
    }

    // Get total count
    const totalResult = await this.db.select({ count: count() }).from(comments).where(baseWhere);

    const total = totalResult[0]?.count || 0;

    // Get comments
    const commentResults = await this.db
      .select({
        comment: comments,
        reportCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${commentReports}
          WHERE ${commentReports.commentId} = ${comments.id}
          AND ${commentReports.status} IN ('pending', 'reviewed')
        )`,
        authorImage: sql<string>`(
          SELECT image FROM users WHERE users.id = ${comments.authorId} LIMIT 1
        )`,
      })
      .from(comments)
      .where(baseWhere ? and(baseWhere, isNull(comments.parentId)) : isNull(comments.parentId))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    const commentsWithReports = commentResults.map((row: { comment: Comment; reportCount: number; authorImage: string | null }) => {
      const { comment, reportCount, authorImage } = row as {
        comment: Comment;
        reportCount: number;
        authorImage: string | null;
      };
      return {
        ...comment,
        reportCount: reportCount || 0,
        authorImage: authorImage || null,
      } as Comment;
    });

    // Fetch replies if requested (batch-load to avoid N+1 problem)
    if (includeReplies && commentsWithReports.length > 0) {
      const parentIds = commentsWithReports.map((c: Comment) => c.id);

      // Load all replies in a single query
      const allRepliesResults = await this.db
        .select({
          comment: comments,
          reportCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${commentReports}
            WHERE ${commentReports.commentId} = ${comments.id}
            AND ${commentReports.status} IN ('pending', 'reviewed')
          )`,
          authorImage: sql<string>`(
            SELECT image FROM users WHERE users.id = ${comments.authorId} LIMIT 1
          )`,
        })
        .from(comments)
        .where(and(inArray(comments.parentId, parentIds), eq(comments.status, 'approved')))
        .orderBy(comments.createdAt);

      // Group replies by parent ID
      const repliesByParent = new Map<string, Comment[]>();
      allRepliesResults.forEach((row: { comment: Comment; reportCount: number; authorImage: string | null }) => {
        const { comment, reportCount, authorImage } = row as {
          comment: Comment;
          reportCount: number;
          authorImage: string | null;
        };
        const parentId = comment.parentId!;
        if (!repliesByParent.has(parentId)) {
          repliesByParent.set(parentId, []);
        }
        repliesByParent.get(parentId)!.push({
          ...comment,
          reportCount: reportCount || 0,
          authorImage: authorImage || null,
        } as Comment);
      });

      // Attach replies to their parent comments
      for (const comment of commentsWithReports) {
        comment.replies = repliesByParent.get(comment.id) || [];
      }
    }

    const response: CommentListResponse = {
      comments: commentsWithReports,
      total,
      hasMore: offset + limit < total,
    };

    if (canCache && cacheKey) {
      await this.setCache<CommentListResponse>(cacheKey, response);
    }

    return response;
  }

  /**
   * Get replies for a comment
   */
  // removed unused getCommentReplies (was private and not referenced)

  /**
   * Moderate a comment (approve, reject, flag, hide)
   */
  async moderateComment(
    commentId: string,
    request: ModerateCommentRequest,
    moderatorId: string
  ): Promise<CommentModeration> {
    const now = Math.floor(Date.now() / 1000);

    // Insert moderation record
    const moderationResult = await this.db
      .insert(commentModeration)
      .values({
        commentId,
        moderatorId,
        action: request.action,
        reason: request.reason,
        createdAt: now,
      })
      .returning();

    // Update comment status based on action
    const newStatus = this.getStatusFromAction(request.action);
    if (newStatus) {
      await this.db
        .update(comments)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(comments.id, commentId));
    }

    // After status update, notify comment author (approved/rejected)
    try {
      const updatedComment = await this.getCommentById(commentId);
      if (updatedComment && updatedComment.authorId && updatedComment.authorEmail) {
        const notificationService = await this.getNotificationService();
        const context = ({
          userId: updatedComment.authorId,
          locale: 'de',
          baseUrl: '',
        } as unknown) as NotificationContext;
        const actionType =
          request.action === 'approve'
            ? 'comment_approved'
            : request.action === 'reject'
              ? 'comment_rejected'
              : null;
        if (actionType) {
          const data: CommentNotificationData = {
            commentId: updatedComment.id,
            commentContent: updatedComment.content,
            authorName: String(moderatorId),
            entityType: updatedComment.entityType,
            entityId: updatedComment.entityId,
          };
          // In-app
          try {
            await notificationService.createCommentNotification(context, actionType, data);
          } catch {}
          // Email
          try {
            await notificationService.sendEmail({
              to: updatedComment.authorEmail,
              templateName:
                actionType === 'comment_approved' ? 'moderation-decision' : 'moderation-decision',
              variables: {
                userName: updatedComment.authorName || 'User',
                baseUrl: '',
                notification: data,
              },
            });
          } catch {}
        }
      }
    } catch {
      // ignore notification errors
    }

    try {
      const updated = await this.getCommentById(commentId);
      await this.invalidateEntityCache(updated.entityType, updated.entityId);
    } catch {}

    return moderationResult[0] as CommentModeration;
  }

  /**
   * Report a comment
   */
  async reportComment(
    commentId: string,
    request: ReportCommentRequest,
    reporterId?: string
  ): Promise<CommentReport> {
    const now = Math.floor(Date.now() / 1000);

    const reportResult = await this.db
      .insert(commentReports)
      .values({
        commentId,
        reporterId: reporterId || null,
        reporterEmail: request.reporterEmail,
        reason: request.reason,
        description: request.description,
        status: 'pending',
        createdAt: now,
      })
      .returning();

    // Auto-flag comment if it has multiple reports
    const reportCount = await this.getCommentReportCount(commentId);
    if (reportCount >= 3) {
      await this.db
        .update(comments)
        .set({
          status: 'flagged',
          updatedAt: now,
        })
        .where(eq(comments.id, commentId));
    }

    try {
      const updated = await this.getCommentById(commentId);
      await this.invalidateEntityCache(updated.entityType, updated.entityId);
    } catch {}

    return reportResult[0] as CommentReport;
  }

  /**
   * Get comment statistics
   */
  async getCommentStats(): Promise<CommentStats> {
    const stats = await this.db
      .select({
        status: comments.status,
        count: count(),
      })
      .from(comments)
      .groupBy(comments.status);

    const result: CommentStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      hidden: 0,
    };

    for (const stat of stats) {
      const count = stat.count;
      result.total += count;

      switch (stat.status) {
        case 'pending':
          result.pending = count;
          break;
        case 'approved':
          result.approved = count;
          break;
        case 'rejected':
          result.rejected = count;
          break;
        case 'flagged':
          result.flagged = count;
          break;
        case 'hidden':
          result.hidden = count;
          break;
      }
    }

    return result;
  }

  /**
   * Get moderation queue
   */
  async getModerationQueue(): Promise<ModerationQueueItem[]> {
    const flaggedComments = await this.db
      .select({
        comment: comments,
        reports: sql<string>`(
          SELECT json_group_array(
            json_object(
              'id', ${commentReports.id},
              'reason', ${commentReports.reason},
              'description', ${commentReports.description},
              'status', ${commentReports.status},
              'createdAt', ${commentReports.createdAt}
            )
          )
          FROM ${commentReports}
          WHERE ${commentReports.commentId} = ${comments.id}
          AND ${commentReports.status} IN ('pending', 'reviewed')
        )`,
        latestModeration: sql<string>`(
          SELECT json_object(
            'id', ${commentModeration.id},
            'action', ${commentModeration.action},
            'reason', ${commentModeration.reason},
            'createdAt', ${commentModeration.createdAt}
          )
          FROM ${commentModeration}
          WHERE ${commentModeration.commentId} = ${comments.id}
          ORDER BY ${commentModeration.createdAt} DESC
          LIMIT 1
        )`,
      })
      .from(comments)
      .where(eq(comments.status, 'flagged'));

    return flaggedComments.map(
      ({
        comment,
        reports,
        latestModeration,
      }: {
        comment: typeof comments.$inferSelect;
        reports: string | null;
        latestModeration: string | null;
      }) => {
        const reportsArr: CommentReport[] = (() => {
          try {
            return JSON.parse((reports as unknown as string) || '[]') as CommentReport[];
          } catch {
            return [];
          }
        })();
        const latest: CommentModeration | undefined = (() => {
          try {
            return latestModeration
              ? ((JSON.parse(latestModeration as unknown as string) as unknown) as CommentModeration)
              : undefined;
          } catch {
            return undefined;
          }
        })();
        const baseComment = comment as unknown as Comment;
        const normalizedComment: Comment = {
          ...baseComment,
          isEdited: Boolean((comment as unknown as { isEdited?: unknown }).isEdited),
        } as Comment;
        return {
          comment: normalizedComment,
          reports: reportsArr,
          latestModeration: latest,
          priority: this.calculatePriority(normalizedComment, reportsArr),
        };
      }
    );
  }

  /**
   * Get report count for a comment
   */
  private async getCommentReportCount(commentId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(commentReports)
      .where(and(eq(commentReports.commentId, commentId), eq(commentReports.status, 'pending')));

    return result[0]?.count || 0;
  }

  /**
   * Calculate priority for moderation queue
   */
  private calculatePriority(comment: Comment, reports: CommentReport[]): 'high' | 'medium' | 'low' {
    const reportCount = reports.length;
    const ageInHours = (Date.now() / 1000 - comment.createdAt) / 3600;

    if (reportCount >= 5 || ageInHours < 1) {
      return 'high';
    } else if (reportCount >= 2 || ageInHours < 6) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get status from moderation action
   */
  private getStatusFromAction(action: string): Comment['status'] | null {
    switch (action) {
      case 'approve':
        return 'approved';
      case 'reject':
        return 'rejected';
      case 'flag':
        return 'flagged';
      case 'hide':
        return 'hidden';
      case 'unhide':
        return 'approved';
      default:
        return null;
    }
  }
}
