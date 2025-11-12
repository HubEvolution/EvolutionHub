'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommentService = void 0;
const drizzle_orm_1 = require('drizzle-orm');
const d1_1 = require('drizzle-orm/d1');
const id_generator_1 = require('@/lib/utils/id-generator');
const rate_limiter_1 = require('@/lib/rate-limiter');
const csrf_1 = require('@/lib/security/csrf');
const spam_detection_1 = require('@/lib/spam-detection');
const schema_1 = require('@/lib/db/schema');
class CommentService {
  constructor(db, kv, options) {
    this.rawDb = db;
    this.db = (0, d1_1.drizzle)(db);
    this.kv = kv;
    this.cacheTTLSeconds = options?.cacheTTLSeconds ?? 300;
    this.schemaDetection = undefined;
  }
  // Minimal interface to avoid importing implementation at typecheck time
  async getNotificationService() {
    const mod = await Promise.resolve(`${'./' + 'notification-service'}`).then((s) => require(s));
    const svc = new mod.NotificationService(this.rawDb);
    return svc;
  }
  /**
   * Detect if the deployed DB uses the older, legacy comments schema
   * with columns: postId, author, approved, createdAt (TEXT), etc.
   */
  async isLegacyCommentsSchema() {
    if (this.schemaDetection) return this.schemaDetection.isLegacy;
    try {
      const info = await this.rawDb.prepare("PRAGMA table_info('comments')").all();
      // D1 returns rows with a 'name' field for column name
      const cols = new Set(
        Array.isArray(info?.results) ? info.results.map((r) => String(r.name)) : []
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
  async listCommentsLegacy(filters = {}) {
    const { entityId, limit = 20, offset = 0, authorId } = filters;
    // Legacy table only supported blog posts via postId; if missing, return empty
    if (!entityId) {
      return { comments: [], total: 0, hasMore: false };
    }
    // Build WHERE
    // Only approved when not author scoped (legacy had boolean approved)
    const whereParts = ['postId = ?']; // entityType ignored in legacy
    const params = [entityId];
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
    const total = Number(totalArr[0]?.cnt ?? 0);
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
    const rows = Array.isArray(pageRes.results) ? pageRes.results : [];
    const items = rows.map((r) => ({
      id: String(r.id),
      content: String(r.content),
      authorId: r.authorId == null ? null : String(r.authorId),
      authorName: String(r.authorName || 'Anonymous'),
      authorEmail: String(r.authorEmail || ''),
      parentId: r.parentId ? String(r.parentId) : null,
      entityType: 'blog_post',
      entityId: String(r.entityId),
      status: typeof r.status === 'string' ? r.status : 'approved',
      isEdited: Boolean(r.isEdited),
      editedAt: r.editedAt ? Number(r.editedAt) : null,
      createdAt: r.createdAt ? Number(r.createdAt) : Math.floor(Date.now() / 1000),
      updatedAt: r.updatedAt ? Number(r.updatedAt) : Math.floor(Date.now() / 1000),
      reportCount: 0,
      replies: [],
    }));
    return {
      comments: items,
      total,
      hasMore: offset + limit < total,
    };
  }
  cacheKeyForList(filters = {}) {
    const { entityType, entityId, limit = 20, offset = 0, includeReplies = true, status } = filters;
    if (!entityType || !entityId) return null;
    return `comments:list:${entityType}:${entityId}:l=${limit}:o=${offset}:r=${includeReplies ? 1 : 0}:s=${status ?? 'any'}`;
  }
  async tryGetCache(key) {
    if (!this.kv) return null;
    try {
      const raw = await this.kv.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  async setCache(key, value) {
    if (!this.kv) return;
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: this.cacheTTLSeconds });
    } catch {
      // ignore cache write errors
    }
  }
  async invalidateEntityCache(entityType, entityId) {
    if (!this.kv || !entityType || !entityId) return;
    try {
      const prefix = `comments:list:${entityType}:${entityId}:`;
      const list = await this.kv.list({ prefix });
      await Promise.all(list.keys.map((k) => this.kv.delete(k.name)));
    } catch {
      // ignore cache invalidation errors
    }
  }
  /**
   * Create a new comment with validation and rate limiting
   */
  async createComment(request, userId, csrfToken) {
    // CSRF validation for authenticated users
    if (userId && csrfToken) {
      const isValidCsrf = await (0, csrf_1.validateCsrfToken)(csrfToken);
      if (!isValidCsrf) {
        throw new Error('Invalid CSRF token');
      }
    }
    // Rate limiting: 5 comments per minute per IP/user
    await (0, rate_limiter_1.rateLimit)(`comment:${userId || 'guest'}:create`, 5, 60);
    // Validate content
    if (!request.content || request.content.trim().length < 3) {
      throw new Error('Comment content must be at least 3 characters long');
    }
    if (request.content.length > 2000) {
      throw new Error('Comment content must be less than 2000 characters');
    }
    // Enhanced spam detection
    const spamCheck = (0, spam_detection_1.checkSpam)(request.content, { strictness: 'medium' });
    if (spamCheck.isSpam) {
      throw new Error(
        `Comment rejected due to spam detection. Reasons: ${spamCheck.reasons.slice(0, 2).join(', ')}`
      );
    }
    const now = Math.floor(Date.now() / 1000);
    const commentId = (0, id_generator_1.generateId)();
    // Get user info if authenticated
    let authorName = request.authorName || 'Anonymous';
    let authorEmail = request.authorEmail || '';
    if (userId) {
      try {
        const res = await this.rawDb
          .prepare('SELECT name, email FROM users WHERE id = ? LIMIT 1')
          .bind(userId)
          .first();
        if (res) {
          authorName = res.name;
          authorEmail = res.email;
        }
      } catch {}
    }
    // Sanitize content to prevent XSS attacks (lazy import to avoid DOM dependency in Workers for GET routes)
    const sanitizedContent = await (async () => {
      try {
        const mod = await Promise.resolve().then(() => require('@/lib/security/sanitize'));
        const maybe = mod;
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
    await this.db.insert(schema_1.comments).values({
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
          const context = {
            userId: parent.authorId,
            locale: 'de',
            baseUrl: '',
          };
          const data = {
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
  async updateComment(commentId, request, userId, csrfToken) {
    // CSRF validation
    const isValidCsrf = await (0, csrf_1.validateCsrfToken)(csrfToken);
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
        const mod = await Promise.resolve().then(() => require('@/lib/security/sanitize'));
        const maybe = mod;
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
        .first();
      isAdmin = !!actor && (actor.email === 'admin@hub-evolution.com' || actor.role === 'admin');
    } catch {}
    const whereCond = isAdmin
      ? (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId)
      : (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId),
          (0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId)
        );
    await this.db
      .update(schema_1.comments)
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
  async deleteComment(commentId, userId, csrfToken) {
    // CSRF validation
    const isValidCsrf = await (0, csrf_1.validateCsrfToken)(csrfToken);
    if (!isValidCsrf) {
      throw new Error('Invalid CSRF token');
    }
    // Delete comment (soft delete by hiding)
    let isAdmin = false;
    try {
      const actor = await this.rawDb
        .prepare('SELECT email, role FROM users WHERE id = ? LIMIT 1')
        .bind(userId)
        .first();
      isAdmin = !!actor && (actor.email === 'admin@hub-evolution.com' || actor.role === 'admin');
    } catch {}
    const whereCond = isAdmin
      ? (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId)
      : (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId),
          (0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId)
        );
    await this.db
      .update(schema_1.comments)
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
  async getCommentById(commentId) {
    const result = await this.db
      .select({
        comment: schema_1.comments,
        reportCount: (0, drizzle_orm_1.sql)`(
          SELECT COUNT(*)
          FROM ${schema_1.commentReports}
          WHERE ${schema_1.commentReports.commentId} = ${schema_1.comments.id}
          AND ${schema_1.commentReports.status} IN ('pending', 'reviewed')
        )`,
        authorImage: (0, drizzle_orm_1.sql)`(
          SELECT image FROM users WHERE users.id = ${schema_1.comments.authorId} LIMIT 1
        )`,
      })
      .from(schema_1.comments)
      .leftJoin(
        schema_1.commentReports,
        (0, drizzle_orm_1.eq)(schema_1.commentReports.commentId, schema_1.comments.id)
      )
      .where((0, drizzle_orm_1.eq)(schema_1.comments.id, commentId))
      .limit(1);
    if (result.length === 0) {
      throw new Error('Comment not found');
    }
    const row0 = result[0];
    const { comment, reportCount, authorImage } = row0;
    return {
      ...comment,
      reportCount: reportCount || 0,
      authorImage: authorImage || null,
    };
  }
  /**
   * List comments with filtering and pagination
   */
  async listComments(filters = {}) {
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
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.status, status));
    }
    if (entityType && entityId) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.entityType, entityType));
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.entityId, entityId));
    }
    if (authorId) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.authorId, authorId));
    }
    // Only show approved comments to non-admin users
    // (In a real app, you'd check user permissions here)
    if (!authorId) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved'));
    }
    const baseWhere =
      whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
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
      const cached = await this.tryGetCache(cacheKey);
      if (cached) return cached;
    }
    // Get total count
    const totalResult = await this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.comments)
      .where(baseWhere);
    const total = totalResult[0]?.count || 0;
    // Get comments
    const commentResults = await this.db
      .select({
        comment: schema_1.comments,
        reportCount: (0, drizzle_orm_1.sql)`(
          SELECT COUNT(*)
          FROM ${schema_1.commentReports}
          WHERE ${schema_1.commentReports.commentId} = ${schema_1.comments.id}
          AND ${schema_1.commentReports.status} IN ('pending', 'reviewed')
        )`,
        authorImage: (0, drizzle_orm_1.sql)`(
          SELECT image FROM users WHERE users.id = ${schema_1.comments.authorId} LIMIT 1
        )`,
      })
      .from(schema_1.comments)
      .where(
        baseWhere
          ? (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.isNull)(schema_1.comments.parentId))
          : (0, drizzle_orm_1.isNull)(schema_1.comments.parentId)
      )
      .orderBy((0, drizzle_orm_1.desc)(schema_1.comments.createdAt))
      .limit(limit)
      .offset(offset);
    const commentsWithReports = commentResults.map((row) => {
      const { comment, reportCount, authorImage } = row;
      return {
        ...comment,
        reportCount: reportCount || 0,
        authorImage: authorImage || null,
      };
    });
    // Fetch replies if requested (batch-load to avoid N+1 problem)
    if (includeReplies && commentsWithReports.length > 0) {
      const parentIds = commentsWithReports.map((c) => c.id);
      // Load all replies in a single query
      const allRepliesResults = await this.db
        .select({
          comment: schema_1.comments,
          reportCount: (0, drizzle_orm_1.sql)`(
            SELECT COUNT(*)
            FROM ${schema_1.commentReports}
            WHERE ${schema_1.commentReports.commentId} = ${schema_1.comments.id}
            AND ${schema_1.commentReports.status} IN ('pending', 'reviewed')
          )`,
          authorImage: (0, drizzle_orm_1.sql)`(
            SELECT image FROM users WHERE users.id = ${schema_1.comments.authorId} LIMIT 1
          )`,
        })
        .from(schema_1.comments)
        .where(
          (0, drizzle_orm_1.and)(
            (0, drizzle_orm_1.inArray)(schema_1.comments.parentId, parentIds),
            (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved')
          )
        )
        .orderBy(schema_1.comments.createdAt);
      // Group replies by parent ID
      const repliesByParent = new Map();
      allRepliesResults.forEach((row) => {
        const { comment, reportCount, authorImage } = row;
        const parentId = comment.parentId;
        if (!repliesByParent.has(parentId)) {
          repliesByParent.set(parentId, []);
        }
        repliesByParent.get(parentId).push({
          ...comment,
          reportCount: reportCount || 0,
          authorImage: authorImage || null,
        });
      });
      // Attach replies to their parent comments
      for (const comment of commentsWithReports) {
        comment.replies = repliesByParent.get(comment.id) || [];
      }
    }
    const response = {
      comments: commentsWithReports,
      total,
      hasMore: offset + limit < total,
    };
    if (canCache && cacheKey) {
      await this.setCache(cacheKey, response);
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
  async moderateComment(commentId, request, moderatorId) {
    const now = Math.floor(Date.now() / 1000);
    // Insert moderation record
    const moderationResult = await this.db
      .insert(schema_1.commentModeration)
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
        .update(schema_1.comments)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where((0, drizzle_orm_1.eq)(schema_1.comments.id, commentId));
    }
    // After status update, notify comment author (approved/rejected)
    try {
      const updatedComment = await this.getCommentById(commentId);
      if (updatedComment && updatedComment.authorId && updatedComment.authorEmail) {
        const notificationService = await this.getNotificationService();
        const context = {
          userId: updatedComment.authorId,
          locale: 'de',
          baseUrl: '',
        };
        const actionType =
          request.action === 'approve'
            ? 'comment_approved'
            : request.action === 'reject'
              ? 'comment_rejected'
              : null;
        if (actionType) {
          const data = {
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
    return moderationResult[0];
  }
  /**
   * Report a comment
   */
  async reportComment(commentId, request, reporterId) {
    const now = Math.floor(Date.now() / 1000);
    const reportResult = await this.db
      .insert(schema_1.commentReports)
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
        .update(schema_1.comments)
        .set({
          status: 'flagged',
          updatedAt: now,
        })
        .where((0, drizzle_orm_1.eq)(schema_1.comments.id, commentId));
    }
    try {
      const updated = await this.getCommentById(commentId);
      await this.invalidateEntityCache(updated.entityType, updated.entityId);
    } catch {}
    return reportResult[0];
  }
  /**
   * Get comment statistics
   */
  async getCommentStats() {
    const stats = await this.db
      .select({
        status: schema_1.comments.status,
        count: (0, drizzle_orm_1.count)(),
      })
      .from(schema_1.comments)
      .groupBy(schema_1.comments.status);
    const result = {
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
  async getModerationQueue() {
    const flaggedComments = await this.db
      .select({
        comment: schema_1.comments,
        reports: (0, drizzle_orm_1.sql)`(
          SELECT json_group_array(
            json_object(
              'id', ${schema_1.commentReports.id},
              'reason', ${schema_1.commentReports.reason},
              'description', ${schema_1.commentReports.description},
              'status', ${schema_1.commentReports.status},
              'createdAt', ${schema_1.commentReports.createdAt}
            )
          )
          FROM ${schema_1.commentReports}
          WHERE ${schema_1.commentReports.commentId} = ${schema_1.comments.id}
          AND ${schema_1.commentReports.status} IN ('pending', 'reviewed')
        )`,
        latestModeration: (0, drizzle_orm_1.sql)`(
          SELECT json_object(
            'id', ${schema_1.commentModeration.id},
            'action', ${schema_1.commentModeration.action},
            'reason', ${schema_1.commentModeration.reason},
            'createdAt', ${schema_1.commentModeration.createdAt}
          )
          FROM ${schema_1.commentModeration}
          WHERE ${schema_1.commentModeration.commentId} = ${schema_1.comments.id}
          ORDER BY ${schema_1.commentModeration.createdAt} DESC
          LIMIT 1
        )`,
      })
      .from(schema_1.comments)
      .where((0, drizzle_orm_1.eq)(schema_1.comments.status, 'flagged'));
    return flaggedComments.map(({ comment, reports, latestModeration }) => {
      const reportsArr = (() => {
        try {
          return JSON.parse(reports || '[]');
        } catch {
          return [];
        }
      })();
      const latest = (() => {
        try {
          return latestModeration ? JSON.parse(latestModeration) : undefined;
        } catch {
          return undefined;
        }
      })();
      const baseComment = comment;
      const normalizedComment = {
        ...baseComment,
        isEdited: Boolean(comment.isEdited),
      };
      return {
        comment: normalizedComment,
        reports: reportsArr,
        latestModeration: latest,
        priority: this.calculatePriority(normalizedComment, reportsArr),
      };
    });
  }
  /**
   * Get report count for a comment
   */
  async getCommentReportCount(commentId) {
    const result = await this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.commentReports)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.commentReports.commentId, commentId),
          (0, drizzle_orm_1.eq)(schema_1.commentReports.status, 'pending')
        )
      );
    return result[0]?.count || 0;
  }
  /**
   * Calculate priority for moderation queue
   */
  calculatePriority(comment, reports) {
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
  getStatusFromAction(action) {
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
exports.CommentService = CommentService;
