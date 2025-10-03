import { eq, and, desc, count, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { generateId } from '../utils/id-generator';
import { rateLimit } from '../rate-limiter';
import { validateCsrfToken } from '../security/csrf';
import { comments, commentModeration, commentReports, commentAuditLogs, users } from '../db/schema';
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
  CommentAuditLog,
  AuditLogFilters,
  AuditLogListResponse,
  AuditAction,
} from '../types/comments';

export class CommentService {
  private db: ReturnType<typeof drizzle>;

  constructor(db: D1Database) {
    this.db = drizzle(db);
  }

  /**
   * Create a new comment with validation and rate limiting
   */
  async createComment(
    request: CreateCommentRequest,
    userId?: number,
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

    // Basic spam detection
    const spamKeywords = ['spam', 'click here', 'buy now'];
    const lowerContent = request.content.toLowerCase();
    if (spamKeywords.some((keyword) => lowerContent.includes(keyword))) {
      throw new Error('Comment contains prohibited content');
    }

    const now = Math.floor(Date.now() / 1000);
    const commentId = generateId();

    // Get user info if authenticated
    let authorName = request.authorName || 'Anonymous';
    let authorEmail = request.authorEmail || '';

    if (userId) {
      const user = await this.db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length > 0) {
        authorName = user[0].name;
        authorEmail = user[0].email;
      }
    }

    // Insert comment
    await this.db.insert(comments).values({
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
  async updateComment(
    commentId: string,
    request: UpdateCommentRequest,
    userId: number,
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

    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);

    // Update comment
    await this.db
      .update(comments)
      .set({
        content: request.content.trim(),
        isEdited: true,
        editedAt: now,
        updatedAt: now,
      })
      .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)));

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
  async deleteComment(commentId: string, userId: number, csrfToken: string): Promise<void> {
    // CSRF validation
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      throw new Error('Invalid CSRF token');
    }

    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);

    // Delete comment (soft delete by hiding)
    await this.db
      .update(comments)
      .set({
        status: 'hidden',
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)));

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
      })
      .from(comments)
      .leftJoin(commentReports, eq(commentReports.commentId, comments.id))
      .where(eq(comments.id, commentId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Comment not found');
    }

    const { comment, reportCount } = result[0];
    return {
      ...comment,
      reportCount: reportCount || 0,
    } as Comment;
  }

  /**
   * List comments with filtering and pagination
   */
  async listComments(filters: CommentFilters = {}): Promise<CommentListResponse> {
    const {
      status,
      entityType,
      entityId,
      authorId,
      limit = 20,
      offset = 0,
      includeReplies = true,
    } = filters;

    let whereConditions = [];

    if (status) {
      whereConditions.push(eq(comments.status, status));
    }

    if (entityType && entityId) {
      whereConditions.push(
        and(eq(comments.entityType, entityType), eq(comments.entityId, entityId))
      );
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
      })
      .from(comments)
      .where(baseWhere)
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);

    const commentsWithReports = commentResults.map(({ comment, reportCount }) => ({
      ...comment,
      reportCount: reportCount || 0,
    })) as Comment[];

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
  private async getCommentReplies(parentId: string): Promise<Comment[]> {
    const replyResults = await this.db
      .select({
        comment: comments,
        reportCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${commentReports}
          WHERE ${commentReports.commentId} = ${comments.id}
          AND ${commentReports.status} IN ('pending', 'reviewed')
        )`,
      })
      .from(comments)
      .where(and(eq(comments.parentId, parentId), eq(comments.status, 'approved')))
      .orderBy(comments.createdAt);

    return replyResults.map(({ comment, reportCount }) => ({
      ...comment,
      reportCount: reportCount || 0,
    })) as Comment[];
  }

  /**
   * Moderate a comment (approve, reject, flag, hide)
   */
  async moderateComment(
    commentId: string,
    request: ModerateCommentRequest,
    moderatorId: number
  ): Promise<CommentModeration> {
    const now = Math.floor(Date.now() / 1000);

    // Get current comment for audit log
    const currentComment = await this.getCommentById(commentId);

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

    return moderationResult[0] as CommentModeration;
  }

  /**
   * Report a comment
   */
  async reportComment(
    commentId: string,
    request: ReportCommentRequest,
    reporterId?: number
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
        reports: sql<CommentReport[]>`(
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
        latestModeration: sql<CommentModeration>`(
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
      .where(eq(comments.status, 'flagged'))
      .orderBy(desc(comments.createdAt));

    return flaggedComments.map(({ comment, reports, latestModeration }) => ({
      comment,
      reports: JSON.parse(reports || '[]'),
      latestModeration: latestModeration ? JSON.parse(latestModeration) : undefined,
      priority: this.calculatePriority(comment, JSON.parse(reports || '[]')),
    }));
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

  /**
   * Create an audit log entry
   */
  private async createAuditLog(
    commentId: string,
    userId: number | undefined,
    action: AuditAction,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.insert(commentAuditLogs).values({
      commentId,
      userId: userId || null,
      action,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      reason,
      ipAddress: metadata?.ipAddress || null,
      userAgent: metadata?.userAgent ? metadata.userAgent.substring(0, 500) : null, // Truncate for storage
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
    const { commentId, userId, action, limit = 50, offset = 0, startDate, endDate } = filters;

    let whereConditions = [];

    if (commentId) {
      whereConditions.push(eq(commentAuditLogs.commentId, commentId));
    }

    if (userId) {
      whereConditions.push(eq(commentAuditLogs.userId, userId));
    }

    if (action) {
      whereConditions.push(eq(commentAuditLogs.action, action));
    }

    if (startDate) {
      whereConditions.push(sql`${commentAuditLogs.createdAt} >= ${startDate}`);
    }

    if (endDate) {
      whereConditions.push(sql`${commentAuditLogs.createdAt} <= ${endDate}`);
    }

    const baseWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const totalResult = await this.db
      .select({ count: count() })
      .from(commentAuditLogs)
      .where(baseWhere);

    const total = totalResult[0]?.count || 0;

    // Get audit logs
    const logResults = await this.db
      .select()
      .from(commentAuditLogs)
      .where(baseWhere)
      .orderBy(desc(commentAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const logs: CommentAuditLog[] = logResults.map((log) => ({
      id: log.id,
      commentId: log.commentId,
      userId: log.userId || undefined,
      action: log.action as AuditAction,
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
  async getCommentAuditLogs(commentId: string): Promise<CommentAuditLog[]> {
    const logs = await this.getAuditLogs({ commentId, limit: 100 });
    return logs.logs;
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: number): Promise<CommentAuditLog[]> {
    const logs = await this.getAuditLogs({ userId, limit: 100 });
    return logs.logs;
  }
}
