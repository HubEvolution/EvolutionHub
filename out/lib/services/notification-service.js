'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NotificationService = void 0;
const drizzle_orm_1 = require('drizzle-orm');
const d1_1 = require('drizzle-orm/d1');
const id_generator_1 = require('../utils/id-generator');
const rate_limiter_1 = require('../rate-limiter');
const schema_1 = require('../db/schema');
class NotificationService {
  constructor(db) {
    this.db = (0, d1_1.drizzle)(db);
  }
  /**
   * Create a new notification
   */
  async createNotification(request) {
    const now = Math.floor(Date.now() / 1000);
    const notificationId = (0, id_generator_1.generateId)();
    // Check if user has notifications enabled for this type
    const userSettings = await this.getUserNotificationSettings(request.userId);
    const isEnabled = this.isNotificationTypeEnabled(userSettings, request.type, 'in_app');
    if (!isEnabled) {
      throw new Error('Notifications are disabled for this user and type');
    }
    // Rate limiting: 10 notifications per minute per user
    await (0, rate_limiter_1.rateLimit)(`notification:${request.userId}:create`, 10, 60);
    // Insert notification
    await this.db.insert(schema_1.notifications).values({
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
  async createCommentNotification(context, type, commentData) {
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
      system: {
        de: {
          title: 'Systemnachricht',
          message: 'Es gibt eine neue Systembenachrichtigung',
        },
        en: {
          title: 'System message',
          message: 'There is a new system notification',
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
  async getNotificationById(notificationId) {
    const result = await this.db
      .select()
      .from(schema_1.notifications)
      .where((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId))
      .limit(1);
    if (result.length === 0) {
      throw new Error('Notification not found');
    }
    return result[0];
  }
  /**
   * List notifications for a user
   */
  async listNotifications(userId, filters = {}) {
    const { type, isRead, priority, limit = 20, offset = 0, startDate, endDate } = filters;
    const whereConditions = [(0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)];
    if (type) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.type, type));
    }
    if (typeof isRead === 'boolean') {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.isRead, isRead));
    }
    if (priority) {
      whereConditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.priority, priority));
    }
    if (startDate) {
      whereConditions.push((0, drizzle_orm_1.gte)(schema_1.notifications.createdAt, startDate));
    }
    if (endDate) {
      whereConditions.push((0, drizzle_orm_1.lte)(schema_1.notifications.createdAt, endDate));
    }
    // Exclude expired notifications
    const now = Math.floor(Date.now() / 1000);
    whereConditions.push(
      (0, drizzle_orm_1.or)(
        (0, drizzle_orm_1.sql)`${schema_1.notifications.expiresAt} IS NULL`,
        (0, drizzle_orm_1.gte)(schema_1.notifications.expiresAt, now)
      )
    );
    const baseWhere = (0, drizzle_orm_1.and)(...whereConditions);
    // Get total count
    const totalQuery = this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.notifications);
    const totalResult = await (baseWhere ? totalQuery.where(baseWhere) : totalQuery);
    const total = totalResult[0]?.count || 0;
    // Get unread count
    const unreadResult = await this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.notifications)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId),
          (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false),
          (0, drizzle_orm_1.or)(
            (0, drizzle_orm_1.sql)`${schema_1.notifications.expiresAt} IS NULL`,
            (0, drizzle_orm_1.gte)(schema_1.notifications.expiresAt, now)
          )
        )
      );
    const unreadCount = unreadResult[0]?.count || 0;
    // Get notifications
    const notificationResults = await this.db
      .select()
      .from(schema_1.notifications)
      .where(baseWhere)
      .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
      .limit(limit)
      .offset(offset);
    const notificationsList = notificationResults.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data || undefined,
      isRead: Boolean(n.isRead),
      readAt: n.readAt || undefined,
      priority: n.priority,
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
  async markAsRead(notificationId, userId) {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .update(schema_1.notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId),
          (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)
        )
      );
    return this.getNotificationById(notificationId);
  }
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .update(schema_1.notifications)
      .set({
        isRead: true,
        readAt: now,
      })
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId),
          (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false)
        )
      );
  }
  /**
   * Delete a notification
   */
  async deleteNotification(notificationId, userId) {
    await this.db
      .delete(schema_1.notifications)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId),
          (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)
        )
      );
  }
  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications() {
    const now = Math.floor(Date.now() / 1000);
    const whereExpr = (0, drizzle_orm_1.and)(
      (0, drizzle_orm_1.sql)`${schema_1.notifications.expiresAt} IS NOT NULL`,
      (0, drizzle_orm_1.lte)(schema_1.notifications.expiresAt, now)
    );
    const toDelete = await this.db
      .select({ count: (0, drizzle_orm_1.count)() })
      .from(schema_1.notifications)
      .where(whereExpr);
    await this.db.delete(schema_1.notifications).where(whereExpr);
    return toDelete[0]?.count || 0;
  }
  /**
   * Get user notification settings
   */
  async getUserNotificationSettings(userId) {
    const settings = await this.db
      .select()
      .from(schema_1.notificationSettings)
      .where((0, drizzle_orm_1.eq)(schema_1.notificationSettings.userId, userId));
    return settings.map((s) => ({
      id: s.id,
      userId: s.userId,
      type: s.type,
      channel: s.channel,
      enabled: Boolean(s.enabled),
      frequency: s.frequency,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }
  /**
   * Update user notification settings
   */
  async updateNotificationSettings(userId, request) {
    const now = Math.floor(Date.now() / 1000);
    // Check if setting exists
    const existing = await this.db
      .select()
      .from(schema_1.notificationSettings)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.userId, userId),
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.type, request.type),
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.channel, request.channel)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      // Update existing setting
      await this.db
        .update(schema_1.notificationSettings)
        .set({
          enabled: request.enabled,
          frequency: request.frequency || 'immediate',
          updatedAt: now,
        })
        .where(
          (0, drizzle_orm_1.and)(
            (0, drizzle_orm_1.eq)(schema_1.notificationSettings.userId, userId),
            (0, drizzle_orm_1.eq)(schema_1.notificationSettings.type, request.type),
            (0, drizzle_orm_1.eq)(schema_1.notificationSettings.channel, request.channel)
          )
        );
    } else {
      // Create new setting
      await this.db.insert(schema_1.notificationSettings).values({
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
      .from(schema_1.notificationSettings)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.userId, userId),
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.type, request.type),
          (0, drizzle_orm_1.eq)(schema_1.notificationSettings.channel, request.channel)
        )
      )
      .limit(1);
    return updated[0];
  }
  /**
   * Initialize default notification settings for a new user
   */
  async initializeDefaultSettings(userId) {
    const now = Math.floor(Date.now() / 1000);
    const defaultTypes = [
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
        channel: channel,
        enabled: type === 'comment_reply' || type === 'comment_mention',
        frequency: 'immediate',
        createdAt: now,
        updatedAt: now,
      }))
    );
    await this.db.insert(schema_1.notificationSettings).values(defaultSettings);
  }
  /**
   * Check if notification type is enabled for user
   */
  isNotificationTypeEnabled(settings, type, channel) {
    const setting = settings.find((s) => s.type === type && s.channel === channel);
    return setting?.enabled ?? false;
  }
  /**
   * Create email template
   */
  async createEmailTemplate(template) {
    const now = Math.floor(Date.now() / 1000);
    const templateId = (0, id_generator_1.generateId)();
    await this.db.insert(schema_1.emailTemplates).values({
      id: templateId,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: template.variables,
      isActive: template.isActive,
      locale: template.locale,
      createdAt: new Date(now * 1000),
      updatedAt: new Date(now * 1000),
    });
    return this.getEmailTemplateById(templateId);
  }
  /**
   * Get email template by ID
   */
  async getEmailTemplateById(templateId) {
    const result = await this.db
      .select()
      .from(schema_1.emailTemplates)
      .where((0, drizzle_orm_1.eq)(schema_1.emailTemplates.id, templateId))
      .limit(1);
    if (result.length === 0) {
      throw new Error('Email template not found');
    }
    const r = result[0];
    return {
      id: r.id,
      name: r.name,
      subject: r.subject,
      htmlContent: r.htmlContent,
      textContent: r.textContent,
      variables: r.variables || undefined,
      isActive: Boolean(r.isActive),
      locale: r.locale,
      createdAt: Math.floor(r.createdAt.getTime() / 1000),
      updatedAt: Math.floor(r.updatedAt.getTime() / 1000),
    };
  }
  /**
   * Get email template by name and locale
   */
  async getEmailTemplateByName(name, locale = 'de') {
    const result = await this.db
      .select()
      .from(schema_1.emailTemplates)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.emailTemplates.name, name),
          (0, drizzle_orm_1.eq)(schema_1.emailTemplates.locale, locale),
          (0, drizzle_orm_1.eq)(schema_1.emailTemplates.isActive, true)
        )
      )
      .limit(1);
    if (result.length === 0) return null;
    const r = result[0];
    return {
      id: r.id,
      name: r.name,
      subject: r.subject,
      htmlContent: r.htmlContent,
      textContent: r.textContent,
      variables: r.variables || undefined,
      isActive: Boolean(r.isActive),
      locale: r.locale,
      createdAt: Math.floor(r.createdAt.getTime() / 1000),
      updatedAt: Math.floor(r.updatedAt.getTime() / 1000),
    };
  }
  /**
   * Send email notification
   */
  async sendEmail(request) {
    const now = Math.floor(Date.now() / 1000);
    const emailId = (0, id_generator_1.generateId)();
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
    await this.db.insert(schema_1.emailQueue).values({
      id: emailId,
      to: request.to,
      templateId: template.id,
      variables: JSON.stringify(request.variables),
      status: 'pending',
      priority: request.priority || 0,
      scheduledFor: new Date((request.scheduledFor || now) * 1000),
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(now * 1000),
    });
    return this.getEmailQueueItemById(emailId);
  }
  /**
   * Get user notification settings from email (for email queue processing)
   */
  async getUserNotificationSettingsFromEmail(email) {
    const userResult = await this.db
      .select()
      .from(schema_1.users)
      .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
      .limit(1);
    if (userResult.length === 0) {
      return [];
    }
    return this.getUserNotificationSettings(userResult[0].id);
  }
  /**
   * Get email queue item by ID
   */
  async getEmailQueueItemById(emailId) {
    const result = await this.db
      .select()
      .from(schema_1.emailQueue)
      .where((0, drizzle_orm_1.eq)(schema_1.emailQueue.id, emailId))
      .limit(1);
    if (result.length === 0) {
      throw new Error('Email queue item not found');
    }
    const r = result[0];
    return {
      id: r.id,
      to: r.to,
      templateId: r.templateId,
      variables: r.variables,
      status: r.status,
      priority: Number(r.priority ?? 0),
      scheduledFor: Math.floor(
        (r.scheduledFor.getTime?.() ?? new Date(r.scheduledFor).getTime()) / 1000
      ),
      attempts: Number(r.attempts ?? 0),
      maxAttempts: Number(r.maxAttempts ?? 0),
      lastError: r.lastError || undefined,
      sentAt: r.sentAt
        ? Math.floor((r.sentAt.getTime?.() ?? new Date(r.sentAt).getTime()) / 1000)
        : undefined,
      createdAt: Math.floor((r.createdAt.getTime?.() ?? new Date(r.createdAt).getTime()) / 1000),
    };
  }
  /**
   * Get pending emails for processing
   */
  async getPendingEmails(limit = 10) {
    const now = Math.floor(Date.now() / 1000);
    const results = await this.db
      .select()
      .from(schema_1.emailQueue)
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.emailQueue.status, 'pending'),
          (0, drizzle_orm_1.lte)(schema_1.emailQueue.scheduledFor, new Date(now * 1000))
        )
      )
      .orderBy((0, drizzle_orm_1.desc)(schema_1.emailQueue.priority), schema_1.emailQueue.createdAt)
      .limit(limit);
    return results.map((e) => ({
      id: e.id,
      to: e.to,
      templateId: e.templateId,
      variables: e.variables,
      status: e.status,
      priority: Number(e.priority ?? 0),
      scheduledFor: Math.floor(
        (e.scheduledFor.getTime?.() ?? new Date(e.scheduledFor).getTime()) / 1000
      ),
      attempts: Number(e.attempts ?? 0),
      maxAttempts: Number(e.maxAttempts ?? 0),
      lastError: e.lastError || undefined,
      sentAt: e.sentAt
        ? Math.floor((e.sentAt.getTime?.() ?? new Date(e.sentAt).getTime()) / 1000)
        : undefined,
      createdAt: Math.floor((e.createdAt.getTime?.() ?? new Date(e.createdAt).getTime()) / 1000),
    }));
  }
  /**
   * Mark email as sent
   */
  async markEmailAsSent(emailId) {
    const now = Math.floor(Date.now() / 1000);
    await this.db
      .update(schema_1.emailQueue)
      .set({
        status: 'sent',
        sentAt: new Date(now * 1000),
      })
      .where((0, drizzle_orm_1.eq)(schema_1.emailQueue.id, emailId));
  }
  /**
   * Mark email as failed
   */
  async markEmailAsFailed(emailId, error) {
    await this.db
      .update(schema_1.emailQueue)
      .set({
        status: 'failed',
        attempts: (0, drizzle_orm_1.sql)`${schema_1.emailQueue.attempts} + 1`,
        lastError: error,
      })
      .where((0, drizzle_orm_1.eq)(schema_1.emailQueue.id, emailId));
  }
  /**
   * Get notification statistics
   */
  async getNotificationStats(userId) {
    const baseWhere = userId
      ? (0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)
      : undefined;
    let statsQuery = this.db
      .select({
        type: schema_1.notifications.type,
        priority: schema_1.notifications.priority,
        isRead: schema_1.notifications.isRead,
        count: (0, drizzle_orm_1.count)(),
      })
      .from(schema_1.notifications);
    if (baseWhere) {
      statsQuery = statsQuery.where(baseWhere);
    }
    const stats = await statsQuery.groupBy(
      schema_1.notifications.type,
      schema_1.notifications.priority,
      schema_1.notifications.isRead
    );
    const result = {
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
        result.byType[stat.type] += count;
      }
      // Count by priority
      const pri = stat.priority ?? 'normal';
      if (pri in result.byPriority) {
        result.byPriority[pri] += count;
      }
    }
    return result;
  }
  /**
   * Process email queue (mark old pending emails as failed)
   */
  async processEmailQueue() {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    // Mark old pending emails as failed
    await this.db
      .update(schema_1.emailQueue)
      .set({
        status: 'failed',
        lastError: 'Email processing timeout',
      })
      .where(
        (0, drizzle_orm_1.and)(
          (0, drizzle_orm_1.eq)(schema_1.emailQueue.status, 'pending'),
          (0, drizzle_orm_1.lte)(schema_1.emailQueue.createdAt, new Date((now - maxAge) * 1000))
        )
      );
  }
}
exports.NotificationService = NotificationService;
