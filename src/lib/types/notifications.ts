// Notification system types

export type NotificationType =
  | 'comment_reply'
  | 'comment_mention'
  | 'comment_approved'
  | 'comment_rejected'
  | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly' | 'never';
export type EmailQueueStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface Notification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: string; // JSON string with additional context
  isRead: boolean;
  readAt?: number;
  priority: NotificationPriority;
  expiresAt?: number;
  createdAt: number;
}

export interface NotificationSetting {
  id: number;
  userId: number;
  type: NotificationType | 'email_digest';
  channel: NotificationChannel;
  enabled: boolean;
  frequency: NotificationFrequency;
  createdAt: number;
  updatedAt: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: string; // JSON array of available variables
  isActive: boolean;
  locale: 'de' | 'en';
  createdAt: number;
  updatedAt: number;
}

export interface EmailQueueItem {
  id: string;
  to: string;
  templateId: string;
  variables: string; // JSON object with template variable values
  status: EmailQueueStatus;
  priority: number;
  scheduledFor: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  sentAt?: number;
  createdAt: number;
}

// Request/Response types for API
export interface CreateNotificationRequest {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  expiresAt?: number;
}

export interface UpdateNotificationSettingsRequest {
  type: NotificationType | 'email_digest';
  channel: NotificationChannel;
  enabled: boolean;
  frequency?: NotificationFrequency;
}

export interface SendEmailRequest {
  to: string;
  templateName: string;
  variables: Record<string, any>;
  priority?: number;
  scheduledFor?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Template variable types
export interface CommentNotificationData {
  commentId: string;
  commentContent: string;
  authorName: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  parentCommentId?: string;
  parentAuthorName?: string;
}

export interface SystemNotificationData {
  action: string;
  details: string;
  link?: string;
}

// Email template variables interface
export interface EmailTemplateVariables {
  userName: string;
  baseUrl: string;
  notification: CommentNotificationData | SystemNotificationData;
  unsubscribeUrl?: string;
}

// Utility types for template rendering
export type TemplateVariableValue = string | number | boolean | null | undefined;
export type TemplateVariables = Record<string, TemplateVariableValue>;

// Notification creation helpers
export interface NotificationContext {
  userId: number;
  locale: 'de' | 'en';
  baseUrl: string;
  userName?: string;
  userEmail?: string;
}
