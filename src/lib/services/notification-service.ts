import { eq, and, desc, count, sql, gte, lte, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { generateId } from '../utils/id-generator';
import { rateLimit } from '../rate-limiter';
import {
  notifications,
  notificationSettings,
  emailTemplates,
  emailQueue,
  users,
  comments,
} from '../db/schema';
import type {
  Notification,
  NotificationSetting,
  EmailTemplate,
  EmailQueueItem,
  CreateNotificationRequest,
  UpdateNotificationSettingsRequest,
  SendEmailRequest,
  NotificationListResponse,
  NotificationFilters,
  NotificationStats,
  NotificationContext,
  CommentNotificationData,
  EmailTemplateVariables,
  NotificationType,
  NotificationChannel,
  NotificationFrequency,
} from '../types/notifications';

export class NotificationService {
  private db: ReturnType<typeof drizzle>;

  constructor(db: D1Database) {
    this.db = drizzle(db);
  }

  /**
   * Create a new notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const now = Math.floor(Date.now() / 1000);
    const notificationId = generateId();

    // Check if user has notifications enabled for this type
    const userSettings = await this.getUserNotificationSettings(request.userId);
    const isEnabled = this.isNotificationTypeEnabled(userSettings, request.type, 'in_app');

    if (!isEnabled) {
      throw new Error('Notifications are disabled for this user and type');
    }

    // Rate limiting: 10 notifications per minute per user
    await rateLimit(`notification:${request.userId}:create`, 10, 60);

    // Insert notification
    await this.db.insert(notifications).values({
      id: notificationId,
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      data: request.data ? JSON.stringify(request.data) : null,
      isRead: false,
      priority: request.priority || 'normal',
      expiresAt: request.expiresAt,
      createdAt: now,
    });

    return this.getNotificationById(notificationId);
  }

  /**
   * Create a comment-specific notification
   */
  async createCommentNotification(
    context: NotificationContext,
    type: NotificationType,
    commentData: CommentNotificationData
  ): Promise<Notification> {
    const templates = {
      comment_reply: {
        de: {
          title: 'Neue Antwort auf Ihren Kommentar',
          message: `${commentData.authorName} hat auf Ihren Kommentar geantwortet`,
        },
        en: {
          title: 'New reply to your comment',
          message: `${commentData.authorName} replied to your comment`,
        },
      },
      comment_mention: {
        de: {
          title: 'Sie wurden in einem Kommentar erwähnt',
          message: `${commentData.authorName} hat Sie in einem Kommentar erwähnt`,
        },
        en: {
          title: 'You were mentioned in a comment',
          message: `${commentData.authorName} mentioned you in a comment`,
        },
      },
      comment_approved: {
        de: {
          title: 'Ihr Kommentar wurde freigegeben',
          message: 'Ihr Kommentar wurde von einem Moderator freigegeben',
        },
        en: {
          title: 'Your comment was approved',
          message: 'Your comment was approved by a moderator',
        },
      },
      comment_rejected: {
        de: {
          title: 'Ihr Kommentar wurde abgelehnt',
          message: 'Ihr Kommentar wurde von einem Moderator abgelehnt',
        },
        en: {
          title: 'Your comment was rejected',
          message: 'Your comment was rejected by a moderator',
        },
      },
    };

    const template = templates[type]?.[context.locale] || templates[type]?.de;

    return this.createNotification({
      userId: context.userId,
      type,
      title: template.title,
      message: template.message,
      data: commentData,
      priority: type === 'comment_reply' ? 'high' : 'normal',
    });
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string): Promise<Notification> {
    const result = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Notification not found');
    }

    return result[0] as Notification;
  }

  /**
   * List notifications for a user
   */
  async listNotifications(
    userId: number,
    filters: NotificationFilters = {}
  ): Promise<NotificationListResponse> {
    const { type, isRead, priority, limit = 20, offset = 0, startDate, endDate } = filters;

    let whereConditions = [eq(notifications.userId, userId)];

    if (type) {
      whereConditions.push(eq(notifications.type, type));
    }

    if (typeof isRead === 'boolean') {
      whereConditions.push(eq(notifications.isRead, isRead));
    }

    if (priority) {
      whereConditions.push(eq(notifications.priority, priority));
    }

    if (startDate) {
      whereConditions.push(gte(notifications.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(notifications.createdAt, endDate));
    }

    // Exclude expired notifications
    const now = Math.floor(Date.now() / 1000);
    whereConditions.push(
      or(sql`${notifications.expiresAt} IS NULL`, gte(notifications.expiresAt, now))
    );

    const baseWhere = and(...whereConditions);

    // Get total count
    const totalResult = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(baseWhere);

    const total = totalResult[0]?.count || 0;

    // Get unread count
    const unreadResult = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          or(sql`${notifications.expiresAt} IS NULL`, gte(notifications.expiresAt, now))
        )
      );

    const unreadCount = unreadResult[0]?.count || 0;

    // Get notifications
    const notificationResults = await this.db
      .select()
      .from(notifications)
      .where(baseWhere)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const notificationsList: Notification[] = notificationResults.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      data: n.data || undefined,
      isRead: Boolean(n.isRead),
      readAt: n.readAt || undefined,
      priority: n.priority as any,
      expiresAt: n.expiresAt || undefined,
      createdAt: n.createdAt,
    }));

    return {
      notifications: notificationsList,
      total,
      hasMore: offset + limit < total,
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: number): Promise<Notification> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    return this.getNotificationById(notificationId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: number): Promise<void> {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);

    const result = await this.db
      .delete(notifications)
      .where(and(sql`${notifications.expiresAt} IS NOT NULL`, lte(notifications.expiresAt, now)));

    return result.changes || 0;
  }

  /**
   * Get user notification settings
   */
  async getUserNotificationSettings(userId: number): Promise<NotificationSetting[]> {
    const settings = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));

    return settings.map((s) => ({
      id: s.id,
      userId: s.userId,
      type: s.type as any,
      channel: s.channel as NotificationChannel,
      enabled: Boolean(s.enabled),
      frequency: s.frequency as NotificationFrequency,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Update user notification settings
   */
  async updateNotificationSettings(
    userId: number,
    request: UpdateNotificationSettingsRequest
  ): Promise<NotificationSetting> {
    const now = Math.floor(Date.now() / 1000);

    // Check if setting exists
    const existing = await this.db
      .select()
      .from(notificationSettings)
      .where(
        and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.type, request.type),
          eq(notificationSettings.channel, request.channel)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await this.db
        .update(notificationSettings)
        .set({
          enabled: request.enabled,
          frequency: request.frequency || 'immediate',
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationSettings.userId, userId),
            eq(notificationSettings.type, request.type),
            eq(notificationSettings.channel, request.channel)
          )
        );
    } else {
      // Create new setting
      await this.db.insert(notificationSettings).values({
        userId,
        type: request.type,
        channel: request.channel,
        enabled: request.enabled,
        frequency: request.frequency || 'immediate',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Return updated setting
    const updated = await this.db
      .select()
      .from(notificationSettings)
      .where(
        and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.type, request.type),
          eq(notificationSettings.channel, request.channel)
        )
      )
      .limit(1);

    return updated[0] as NotificationSetting;
  }

  /**
   * Initialize default notification settings for a new user
   */
  async initializeDefaultSettings(userId: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const defaultTypes: (NotificationType | 'email_digest')[] = [
      'comment_reply',
      'comment_mention',
      'comment_approved',
      'comment_rejected',
      'email_digest',
    ];

    const defaultSettings = defaultTypes.flatMap((type) =>
      ['in_app', 'email'].map((channel) => ({
        userId,
        type,
        channel: channel as NotificationChannel,
        enabled: type === 'comment_reply' || type === 'comment_mention',
        frequency: 'immediate' as NotificationFrequency,
        createdAt: now,
        updatedAt: now,
      }))
    );

    await this.db.insert(notificationSettings).values(defaultSettings);
  }

  /**
   * Check if notification type is enabled for user
   */
  private isNotificationTypeEnabled(
    settings: NotificationSetting[],
    type: NotificationType,
    channel: NotificationChannel
  ): boolean {
    const setting = settings.find((s) => s.type === type && s.channel === channel);
    return setting?.enabled ?? false;
  }

  /**
   * Create email template
   */
  async createEmailTemplate(
    template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EmailTemplate> {
    const now = Math.floor(Date.now() / 1000);
    const templateId = generateId();

    await this.db.insert(emailTemplates).values({
      id: templateId,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: template.variables,
      isActive: template.isActive,
      locale: template.locale,
      createdAt: now,
      updatedAt: now,
    });

    return this.getEmailTemplateById(templateId);
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplateById(templateId: string): Promise<EmailTemplate> {
    const result = await this.db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Email template not found');
    }

    return result[0] as EmailTemplate;
  }

  /**
   * Get email template by name and locale
   */
  async getEmailTemplateByName(
    name: string,
    locale: 'de' | 'en' = 'de'
  ): Promise<EmailTemplate | null> {
    const result = await this.db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.name, name),
          eq(emailTemplates.locale, locale),
          eq(emailTemplates.isActive, true)
        )
      )
      .limit(1);

    return result.length > 0 ? (result[0] as EmailTemplate) : null;
  }

  /**
   * Send email notification
   */
  async sendEmail(request: SendEmailRequest): Promise<EmailQueueItem> {
    const now = Math.floor(Date.now() / 1000);
    const emailId = generateId();

    // Get template
    const template = await this.getEmailTemplateByName(request.templateName);
    if (!template) {
      throw new Error(`Email template '${request.templateName}' not found`);
    }

    // Check if user has email notifications enabled for this template's semantic type
    const userSettings = await this.getUserNotificationSettingsFromEmail(request.to);
    if (userSettings.length === 0) {
      throw new Error('Email notifications are disabled for this user');
    }
    // Map templateName -> allowed types
    let allowed = false;
    if (request.templateName === 'reply-notification') {
      allowed = this.isNotificationTypeEnabled(userSettings, 'comment_reply', 'email');
    } else if (request.templateName === 'moderation-decision') {
      allowed =
        this.isNotificationTypeEnabled(userSettings, 'comment_approved', 'email') ||
        this.isNotificationTypeEnabled(userSettings, 'comment_rejected', 'email');
    } else {
      // Unknown template: allow by default (fallback)
      allowed = true;
    }
    if (!allowed) {
      throw new Error('Email notifications are disabled for this user');
    }

    // Add to email queue
    await this.db.insert(emailQueue).values({
      id: emailId,
      to: request.to,
      templateId: template.id,
      variables: JSON.stringify(request.variables),
      status: 'pending',
      priority: request.priority || 0,
      scheduledFor: request.scheduledFor || now,
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
    });

    return this.getEmailQueueItemById(emailId);
  }

  /**
   * Get user notification settings from email (for email queue processing)
   */
  private async getUserNotificationSettingsFromEmail(
    email: string
  ): Promise<NotificationSetting[]> {
    const userResult = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userResult.length === 0) {
      return [];
    }

    return this.getUserNotificationSettings(userResult[0].id);
  }

  /**
   * Get email queue item by ID
   */
  async getEmailQueueItemById(emailId: string): Promise<EmailQueueItem> {
    const result = await this.db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.id, emailId))
      .limit(1);

    if (result.length === 0) {
      throw new Error('Email queue item not found');
    }

    return result[0] as EmailQueueItem;
  }

  /**
   * Get pending emails for processing
   */
  async getPendingEmails(limit: number = 10): Promise<EmailQueueItem[]> {
    const now = Math.floor(Date.now() / 1000);

    const results = await this.db
      .select()
      .from(emailQueue)
      .where(and(eq(emailQueue.status, 'pending'), lte(emailQueue.scheduledFor, now)))
      .orderBy(desc(emailQueue.priority), emailQueue.createdAt)
      .limit(limit);

    return results.map((e) => ({
      id: e.id,
      to: e.to,
      templateId: e.templateId,
      variables: e.variables,
      status: e.status as any,
      priority: e.priority,
      scheduledFor: e.scheduledFor,
      attempts: e.attempts,
      maxAttempts: e.maxAttempts,
      lastError: e.lastError || undefined,
      sentAt: e.sentAt || undefined,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Mark email as sent
   */
  async markEmailAsSent(emailId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .update(emailQueue)
      .set({
        status: 'sent',
        sentAt: now,
      })
      .where(eq(emailQueue.id, emailId));
  }

  /**
   * Mark email as failed
   */
  async markEmailAsFailed(emailId: string, error: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .update(emailQueue)
      .set({
        status: 'failed',
        attempts: sql`${emailQueue.attempts} + 1`,
        lastError: error,
      })
      .where(eq(emailQueue.id, emailId));
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: number): Promise<NotificationStats> {
    const baseWhere = userId ? eq(notifications.userId, userId) : undefined;

    const stats = await this.db
      .select({
        type: notifications.type,
        priority: notifications.priority,
        isRead: notifications.isRead,
        count: count(),
      })
      .from(notifications)
      .where(baseWhere)
      .groupBy(notifications.type, notifications.priority, notifications.isRead);

    const result: NotificationStats = {
      total: 0,
      unread: 0,
      byType: {
        comment_reply: 0,
        comment_mention: 0,
        comment_approved: 0,
        comment_rejected: 0,
        system: 0,
      },
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        urgent: 0,
      },
    };

    for (const stat of stats) {
      const count = stat.count;
      result.total += count;

      if (!stat.isRead) {
        result.unread += count;
      }

      // Count by type
      if (stat.type in result.byType) {
        result.byType[stat.type as NotificationType] += count;
      }

      // Count by priority
      if (stat.priority in result.byPriority) {
        result.byPriority[stat.priority as keyof typeof result.byPriority] += count;
      }
    }

    return result;
  }

  /**
   * Process email queue (mark old pending emails as failed)
   */
  async processEmailQueue(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours

    // Mark old pending emails as failed
    await this.db
      .update(emailQueue)
      .set({
        status: 'failed',
        lastError: 'Email processing timeout',
      })
      .where(and(eq(emailQueue.status, 'pending'), lte(emailQueue.createdAt, now - maxAge)));
  }
}
