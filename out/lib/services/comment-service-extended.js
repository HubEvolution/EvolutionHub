'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommentService = void 0;
const drizzle_orm_1 = require('drizzle-orm');
const d1_1 = require('drizzle-orm/d1');
const id_generator_1 = require('../utils/id-generator');
const rate_limiter_1 = require('../rate-limiter');
const csrf_1 = require('../security/csrf');
const schema_1 = require('../db/schema');
class CommentService {
  constructor(db) {
    this.db = (0, d1_1.drizzle)(db);
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
    // Basic spam detection
    const spamKeywords = ['spam', 'click here', 'buy now'];
    const lowerContent = request.content.toLowerCase();
    if (spamKeywords.some((keyword) => lowerContent.includes(keyword))) {
      throw new Error('Comment contains prohibited content');
    }
    const now = Math.floor(Date.now() / 1000);
    const commentId = (0, id_generator_1.generateId)();
    // Get user info if authenticated
    let authorName = request.authorName || 'Anonymous';
    let authorEmail = request.authorEmail || '';
    if (userId) {
      const user = await this.db
        .select({ name: schema_1.users.name, email: schema_1.users.email })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
        .limit(1);
      if (user.length > 0) {
        authorName = user[0].name;
        authorEmail = user[0].email;
      }
    }
    // Insert comment
    await this.db.insert(schema_1.comments).values({
      id: commentId,
      content: request.content.trim(),
      authorId: userId || 0, // 0 for guest users
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
    // Create audit log for comment creation
    await this.createAuditLog(commentId, userId, 'create', undefined, {
      content: request.content.trim(),
      authorId: userId || 0,
      authorName,
      authorEmail,
      parentId: request.parentId,
      entityType: request.entityType,
      entityId: request.entityId,
      status: userId ? 'approved' : 'pending',
    });
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
    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);
    // Update comment
    await this.db
      .update(schema_1.comments)
      .set({
        content: request.content.trim(),
        isEdited: true,
        editedAt: now,
        updatedAt: now,
      })
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId),
          (0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId)
        )
      );
    // Create audit log for comment update
    await this.createAuditLog(
      commentId,
      userId,
      'update',
      {
        content: currentComment.content,
        isEdited: currentComment.isEdited,
        editedAt: currentComment.editedAt,
      },
      {
        content: request.content.trim(),
        isEdited: true,
        editedAt: now,
      }
    );
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
    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);
    // Delete comment (soft delete by hiding)
    await this.db
      .update(schema_1.comments)
      .set({
        status: 'hidden',
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.id, commentId),
          (0, drizzle_orm_1.eq)(schema_1.comments.authorId, userId)
        )
      );
    // Create audit log for comment deletion
    await this.createAuditLog(
      commentId,
      userId,
      'delete',
      {
        status: currentComment.status,
      },
      {
        status: 'hidden',
      }
    );
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
    const { comment, reportCount } = result[0];
    return {
      ...comment,
      reportCount: reportCount || 0,
    };
  }
  /**
   * List comments with filtering and pagination
   */
  async listComments(filters = {}) {
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
      whereConditions.push(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.entityType, entityType),
          (0, drizzle_orm_1.eq)(schema_1.comments.entityId, entityId)
        )
      );
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
      })
      .from(schema_1.comments)
      .where(baseWhere)
      .orderBy((0, drizzle_orm_1.desc)(schema_1.comments.createdAt))
      .limit(limit)
      .offset(offset);
    const commentsWithReports = commentResults.map((row) => ({
      ...row.comment,
      reportCount: row.reportCount || 0,
    }));
    // Fetch replies if requested
    if (includeReplies) {
      for (const comment of commentsWithReports) {
        comment.replies = await this.getCommentReplies(comment.id);
      }
    }
    return {
      comments: commentsWithReports,
      total,
      hasMore: offset + limit < total,
    };
  }
  /**
   * Get replies for a comment
   */
  async getCommentReplies(parentId) {
    const replyResults = await this.db
      .select({
        comment: schema_1.comments,
        reportCount: (0, drizzle_orm_1.sql)`(
          SELECT COUNT(*)
          FROM ${schema_1.commentReports}
          WHERE ${schema_1.commentReports.commentId} = ${schema_1.comments.id}
          AND ${schema_1.commentReports.status} IN ('pending', 'reviewed')
        )`,
      })
      .from(schema_1.comments)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.comments.parentId, parentId),
          (0, drizzle_orm_1.eq)(schema_1.comments.status, 'approved')
        )
      )
      .orderBy(schema_1.comments.createdAt);
    return replyResults.map((row) => ({
      ...row.comment,
      reportCount: row.reportCount || 0,
    }));
  }
  /**
   * Moderate a comment (approve, reject, flag, hide)
   */
  async moderateComment(commentId, request, moderatorId) {
    const now = Math.floor(Date.now() / 1000);
    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);
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
    // Create audit log for moderation
    await this.createAuditLog(
      commentId,
      moderatorId,
      'moderate',
      {
        status: currentComment.status,
      },
      {
        status: newStatus,
      },
      request.reason,
      {
        moderationAction: request.action,
      }
    );
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
    // Create audit log for report
    await this.createAuditLog(
      commentId,
      reporterId,
      'report',
      undefined,
      undefined,
      `${request.reason}: ${request.description || 'No description'}`,
      {
        reporterEmail: request.reporterEmail,
        reportReason: request.reason,
      }
    );
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
      .where((0, drizzle_orm_1.eq)(schema_1.comments.status, 'flagged'))
      .orderBy((0, drizzle_orm_1.desc)(schema_1.comments.createdAt));
    return flaggedComments.map((row) => ({
      comment: row.comment,
      reports: JSON.parse(row.reports || '[]'),
      latestModeration: row.latestModeration ? JSON.parse(row.latestModeration) : undefined,
      priority: this.calculatePriority(row.comment, JSON.parse(row.reports || '[]')),
    }));
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
  /**
   * Create an audit log entry
   */
  async createAuditLog(commentId, userId, action, oldValues, newValues, reason, metadata) {
    const now = Math.floor(Date.now() / 1000);
    const ipAddr = metadata && typeof metadata.ipAddress === 'string' ? metadata.ipAddress : null;
    const ua =
      metadata && typeof metadata.userAgent === 'string'
        ? metadata.userAgent.substring(0, 500)
        : null;
    await this.db.insert(schema_1.commentAuditLogs).values({
      commentId,
      userId: userId || null,
      action,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason,
      ipAddress: ipAddr,
      userAgent: ua, // Truncate for storage
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    });
  }
  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}) {
    const { commentId, userId, action, limit = 50, offset = 0, startDate, endDate } = filters;
    const whereConditions = [];
    if (commentId) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.commentAuditLogs.commentId, commentId));
    }
    if (userId) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.commentAuditLogs.userId, userId));
    }
    if (action) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.commentAuditLogs.action, action));
    }
    if (startDate) {
      whereConditions.push(
        (0, drizzle_orm_1.sql)`${schema_1.commentAuditLogs.createdAt} >= ${startDate}`
      );
    }
    if (endDate) {
      whereConditions.push(
        (0, drizzle_orm_1.sql)`${schema_1.commentAuditLogs.createdAt} <= ${endDate}`
      );
    }
    const baseWhere =
      whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
    // Get total count
    const totalResult = await this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.commentAuditLogs)
      .where(baseWhere);
    const total = totalResult[0]?.count || 0;
    // Get audit logs
    const logResults = await this.db
      .select()
      .from(schema_1.commentAuditLogs)
      .where(baseWhere)
      .orderBy((0, drizzle_orm_1.desc)(schema_1.commentAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    const logs = logResults.map((log) => ({
      id: log.id,
      commentId: log.commentId,
      userId: log.userId || undefined,
      action: log.action,
      oldValues: log.oldValues || undefined,
      newValues: log.newValues || undefined,
      reason: log.reason || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      metadata: log.metadata || undefined,
      createdAt: log.createdAt,
    }));
    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }
  /**
   * Get audit logs for a specific comment
   */
  async getCommentAuditLogs(commentId) {
    const logs = await this.getAuditLogs({ commentId, limit: 100 });
    return logs.logs;
  }
  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId) {
    const logs = await this.getAuditLogs({ userId: String(userId), limit: 100 });
    return logs.logs;
  }
}
exports.CommentService = CommentService;
