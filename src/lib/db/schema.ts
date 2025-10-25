import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Base tables
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  body: text('body').notNull(),
  lang: text('lang', { enum: ['de', 'en'] }).notNull(),
  category: text('category'),
  tags: text('tags', { mode: 'json' }).$type<string[] | null>(),
  pubDate: integer('pub_date', { mode: 'timestamp' }).notNull(),
  updatedDate: integer('updated_date', { mode: 'timestamp' }),
  author: text('author'),
  description: text('description'),
  featured: integer('featured', { mode: 'boolean' }).default(false),
  draft: integer('draft', { mode: 'boolean' }).default(false),
});

// Comment system tables - define comments first to avoid self-reference issues
const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull(),
  parentId: text('parent_id'),
  entityType: text('entity_type', { enum: ['blog_post', 'project', 'general'] }).notNull(),
  entityId: text('entity_id').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'flagged', 'hidden'] })
    .notNull()
    .default('pending'),
  isEdited: integer('is_edited', { mode: 'boolean' }).default(false),
  editedAt: integer('edited_at', { mode: 'number' }),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export { comments };

export const commentModeration = sqliteTable('comment_moderation', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: text('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  moderatorId: text('moderator_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action', { enum: ['approve', 'reject', 'flag', 'hide', 'unhide'] }).notNull(),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const commentReports = sqliteTable('comment_reports', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: text('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  reporterEmail: text('reporter_email'),
  reason: text('reason', {
    enum: ['spam', 'harassment', 'inappropriate', 'off_topic', 'other'],
  }).notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'reviewed', 'resolved', 'dismissed'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  reviewedAt: integer('reviewed_at', { mode: 'number' }),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
});

export const commentAuditLogs = sqliteTable('comment_audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: text('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action', {
    enum: ['create', 'update', 'delete', 'moderate', 'report', 'view'],
  }).notNull(),
  oldValues: text('old_values'), // JSON string of previous state (for updates)
  newValues: text('new_values'), // JSON string of new state (for updates)
  reason: text('reason'), // Reason for the action (especially for moderation)
  ipAddress: text('ip_address'), // Anonymized IP address
  userAgent: text('user_agent'), // User agent string (truncated)
  metadata: text('metadata'), // Additional context data as JSON
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

// Notification system tables
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['comment_reply', 'comment_mention', 'comment_approved', 'comment_rejected', 'system'],
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data'), // JSON string with additional context (comment_id, entity_type, etc.)
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: integer('read_at', { mode: 'number' }),
  priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] }).default('normal'),
  expiresAt: integer('expires_at', { mode: 'number' }), // Auto-delete after this time
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const notificationSettings = sqliteTable('notification_settings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: [
      'comment_reply',
      'comment_mention',
      'comment_approved',
      'comment_rejected',
      'system',
      'email_digest',
    ],
  }).notNull(),
  channel: text('channel', { enum: ['in_app', 'email', 'push'] }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  frequency: text('frequency', { enum: ['immediate', 'daily', 'weekly', 'never'] }).default(
    'immediate'
  ),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  // Unique constraint: one setting per user per type per channel
});

export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content').notNull(),
  variables: text('variables'), // JSON array of available template variables
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  locale: text('locale', { enum: ['de', 'en'] }).default('de'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const emailQueue = sqliteTable('email_queue', {
  id: text('id').primaryKey(),
  to: text('to').notNull(),
  templateId: text('template_id')
    .notNull()
    .references(() => emailTemplates.id),
  variables: text('variables').notNull(), // JSON object with template variable values
  status: text('status', { enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'] }).default(
    'pending'
  ),
  priority: integer('priority').default(0), // Higher number = higher priority
  scheduledFor: integer('scheduled_for', { mode: 'timestamp' }).notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  lastError: text('last_error'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Data export and backup system tables
export const dataExportJobs = sqliteTable('data_export_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['user_data', 'comments', 'notifications', 'full_export'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  format: text('format', { enum: ['json', 'csv', 'xml'] }).default('json'),
  filePath: text('file_path'), // Path in R2 storage
  fileSize: integer('file_size'), // Size in bytes
  downloadUrl: text('download_url'), // Temporary download URL
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // When download URL expires
  errorMessage: text('error_message'),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  downloadCount: integer('download_count').default(0),
});

export const dataDeletionRequests = sqliteTable('data_deletion_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  requestType: text('request_type', {
    enum: ['account_deletion', 'data_export', 'right_to_erasure'],
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  reason: text('reason'),
  adminNotes: text('admin_notes'),
  verificationToken: text('verification_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  processedBy: text('processed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const backupJobs = sqliteTable('backup_jobs', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['full', 'comments', 'users', 'incremental'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  filePath: text('file_path'), // Path in R2 storage
  fileSize: integer('file_size'), // Size in bytes
  checksum: text('checksum'), // SHA-256 hash for integrity verification
  tablesIncluded: text('tables_included'), // JSON array of backed up tables
  recordCount: integer('record_count'), // Total number of records backed up
  errorMessage: text('error_message'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  triggeredBy: text('triggered_by').references(() => users.id, { onDelete: 'set null' }),
  isAutomated: integer('is_automated', { mode: 'boolean' }).default(false),
});

export const systemMaintenance = sqliteTable('system_maintenance', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['cleanup', 'optimization', 'migration', 'repair'] }).notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  description: text('description').notNull(),
  affectedTables: text('affected_tables'), // JSON array of affected tables
  parameters: text('parameters'), // JSON object with operation parameters
  logOutput: text('log_output'), // Detailed log of the operation
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  triggeredBy: text('triggered_by').references(() => users.id, { onDelete: 'set null' }),
  isAutomated: integer('is_automated', { mode: 'boolean' }).default(false),
});

// System settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  category: text('category', {
    enum: ['general', 'comments', 'notifications', 'security', 'performance'],
  }).default('general'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
