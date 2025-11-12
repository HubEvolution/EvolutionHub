'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.referralEvents =
  exports.referralProfiles =
  exports.settings =
  exports.systemMaintenance =
  exports.backupJobs =
  exports.dataDeletionRequests =
  exports.dataExportJobs =
  exports.emailQueue =
  exports.emailTemplates =
  exports.notificationSettings =
  exports.notifications =
  exports.commentAuditLogs =
  exports.commentReports =
  exports.commentModeration =
  exports.comments =
  exports.blogPosts =
  exports.users =
    void 0;
const sqlite_core_1 = require('drizzle-orm/sqlite-core');
// Base tables
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  name: (0, sqlite_core_1.text)('name').notNull(),
  email: (0, sqlite_core_1.text)('email').notNull().unique(),
  password: (0, sqlite_core_1.text)('password').notNull(),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
});
exports.blogPosts = (0, sqlite_core_1.sqliteTable)('blog_posts', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  title: (0, sqlite_core_1.text)('title').notNull(),
  slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
  body: (0, sqlite_core_1.text)('body').notNull(),
  lang: (0, sqlite_core_1.text)('lang', { enum: ['de', 'en'] }).notNull(),
  category: (0, sqlite_core_1.text)('category'),
  tags: (0, sqlite_core_1.text)('tags', { mode: 'json' }).$type(),
  pubDate: (0, sqlite_core_1.integer)('pub_date', { mode: 'timestamp' }).notNull(),
  updatedDate: (0, sqlite_core_1.integer)('updated_date', { mode: 'timestamp' }),
  author: (0, sqlite_core_1.text)('author'),
  description: (0, sqlite_core_1.text)('description'),
  featured: (0, sqlite_core_1.integer)('featured', { mode: 'boolean' }).default(false),
  draft: (0, sqlite_core_1.integer)('draft', { mode: 'boolean' }).default(false),
});
// Comment system tables - define comments first to avoid self-reference issues
const comments = (0, sqlite_core_1.sqliteTable)('comments', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  content: (0, sqlite_core_1.text)('content').notNull(),
  authorId: (0, sqlite_core_1.text)('author_id').references(() => exports.users.id, {
    onDelete: 'cascade',
  }),
  authorName: (0, sqlite_core_1.text)('author_name').notNull(),
  authorEmail: (0, sqlite_core_1.text)('author_email').notNull(),
  parentId: (0, sqlite_core_1.text)('parent_id'),
  entityType: (0, sqlite_core_1.text)('entity_type', {
    enum: ['blog_post', 'project', 'general'],
  }).notNull(),
  entityId: (0, sqlite_core_1.text)('entity_id').notNull(),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'approved', 'rejected', 'flagged', 'hidden'],
  })
    .notNull()
    .default('pending'),
  isEdited: (0, sqlite_core_1.integer)('is_edited', { mode: 'boolean' }).default(false),
  editedAt: (0, sqlite_core_1.integer)('edited_at', { mode: 'number' }),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'number' }).notNull(),
});
exports.comments = comments;
exports.commentModeration = (0, sqlite_core_1.sqliteTable)('comment_moderation', {
  id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: (0, sqlite_core_1.text)('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  moderatorId: (0, sqlite_core_1.text)('moderator_id').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  action: (0, sqlite_core_1.text)('action', {
    enum: ['approve', 'reject', 'flag', 'hide', 'unhide'],
  }).notNull(),
  reason: (0, sqlite_core_1.text)('reason'),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
});
exports.commentReports = (0, sqlite_core_1.sqliteTable)('comment_reports', {
  id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: (0, sqlite_core_1.text)('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  reporterId: (0, sqlite_core_1.text)('reporter_id').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  reporterEmail: (0, sqlite_core_1.text)('reporter_email'),
  reason: (0, sqlite_core_1.text)('reason', {
    enum: ['spam', 'harassment', 'inappropriate', 'off_topic', 'other'],
  }).notNull(),
  description: (0, sqlite_core_1.text)('description'),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
  })
    .notNull()
    .default('pending'),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
  reviewedAt: (0, sqlite_core_1.integer)('reviewed_at', { mode: 'number' }),
  reviewedBy: (0, sqlite_core_1.text)('reviewed_by').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
});
exports.commentAuditLogs = (0, sqlite_core_1.sqliteTable)('comment_audit_logs', {
  id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  commentId: (0, sqlite_core_1.text)('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  userId: (0, sqlite_core_1.text)('user_id').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  action: (0, sqlite_core_1.text)('action', {
    enum: ['create', 'update', 'delete', 'moderate', 'report', 'view'],
  }).notNull(),
  oldValues: (0, sqlite_core_1.text)('old_values'), // JSON string of previous state (for updates)
  newValues: (0, sqlite_core_1.text)('new_values'), // JSON string of new state (for updates)
  reason: (0, sqlite_core_1.text)('reason'), // Reason for the action (especially for moderation)
  ipAddress: (0, sqlite_core_1.text)('ip_address'), // Anonymized IP address
  userAgent: (0, sqlite_core_1.text)('user_agent'), // User agent string (truncated)
  metadata: (0, sqlite_core_1.text)('metadata'), // Additional context data as JSON
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
});
// Notification system tables
exports.notifications = (0, sqlite_core_1.sqliteTable)('notifications', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  userId: (0, sqlite_core_1.text)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  type: (0, sqlite_core_1.text)('type', {
    enum: ['comment_reply', 'comment_mention', 'comment_approved', 'comment_rejected', 'system'],
  }).notNull(),
  title: (0, sqlite_core_1.text)('title').notNull(),
  message: (0, sqlite_core_1.text)('message').notNull(),
  data: (0, sqlite_core_1.text)('data'), // JSON string with additional context (comment_id, entity_type, etc.)
  isRead: (0, sqlite_core_1.integer)('is_read', { mode: 'boolean' }).default(false),
  readAt: (0, sqlite_core_1.integer)('read_at', { mode: 'number' }),
  priority: (0, sqlite_core_1.text)('priority', {
    enum: ['low', 'normal', 'high', 'urgent'],
  }).default('normal'),
  expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'number' }), // Auto-delete after this time
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
});
exports.notificationSettings = (0, sqlite_core_1.sqliteTable)('notification_settings', {
  id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: (0, sqlite_core_1.text)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  type: (0, sqlite_core_1.text)('type', {
    enum: [
      'comment_reply',
      'comment_mention',
      'comment_approved',
      'comment_rejected',
      'system',
      'email_digest',
    ],
  }).notNull(),
  channel: (0, sqlite_core_1.text)('channel', { enum: ['in_app', 'email', 'push'] }).notNull(),
  enabled: (0, sqlite_core_1.integer)('enabled', { mode: 'boolean' }).default(true),
  frequency: (0, sqlite_core_1.text)('frequency', {
    enum: ['immediate', 'daily', 'weekly', 'never'],
  }).default('immediate'),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'number' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'number' }).notNull(),
  // Unique constraint: one setting per user per type per channel
});
exports.emailTemplates = (0, sqlite_core_1.sqliteTable)('email_templates', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  name: (0, sqlite_core_1.text)('name').notNull().unique(),
  subject: (0, sqlite_core_1.text)('subject').notNull(),
  htmlContent: (0, sqlite_core_1.text)('html_content').notNull(),
  textContent: (0, sqlite_core_1.text)('text_content').notNull(),
  variables: (0, sqlite_core_1.text)('variables'), // JSON array of available template variables
  isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).default(true),
  locale: (0, sqlite_core_1.text)('locale', { enum: ['de', 'en'] }).default('de'),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull(),
});
exports.emailQueue = (0, sqlite_core_1.sqliteTable)('email_queue', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  to: (0, sqlite_core_1.text)('to').notNull(),
  templateId: (0, sqlite_core_1.text)('template_id')
    .notNull()
    .references(() => exports.emailTemplates.id),
  variables: (0, sqlite_core_1.text)('variables').notNull(), // JSON object with template variable values
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'],
  }).default('pending'),
  priority: (0, sqlite_core_1.integer)('priority').default(0), // Higher number = higher priority
  scheduledFor: (0, sqlite_core_1.integer)('scheduled_for', { mode: 'timestamp' }).notNull(),
  attempts: (0, sqlite_core_1.integer)('attempts').default(0),
  maxAttempts: (0, sqlite_core_1.integer)('max_attempts').default(3),
  lastError: (0, sqlite_core_1.text)('last_error'),
  sentAt: (0, sqlite_core_1.integer)('sent_at', { mode: 'timestamp' }),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
});
// Data export and backup system tables
exports.dataExportJobs = (0, sqlite_core_1.sqliteTable)('data_export_jobs', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  userId: (0, sqlite_core_1.text)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  type: (0, sqlite_core_1.text)('type', {
    enum: ['user_data', 'comments', 'notifications', 'full_export'],
  }).notNull(),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  format: (0, sqlite_core_1.text)('format', { enum: ['json', 'csv', 'xml'] }).default('json'),
  filePath: (0, sqlite_core_1.text)('file_path'), // Path in R2 storage
  fileSize: (0, sqlite_core_1.integer)('file_size'), // Size in bytes
  downloadUrl: (0, sqlite_core_1.text)('download_url'), // Temporary download URL
  expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }), // When download URL expires
  errorMessage: (0, sqlite_core_1.text)('error_message'),
  requestedAt: (0, sqlite_core_1.integer)('requested_at', { mode: 'timestamp' }).notNull(),
  completedAt: (0, sqlite_core_1.integer)('completed_at', { mode: 'timestamp' }),
  downloadCount: (0, sqlite_core_1.integer)('download_count').default(0),
});
exports.dataDeletionRequests = (0, sqlite_core_1.sqliteTable)('data_deletion_requests', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  userId: (0, sqlite_core_1.text)('user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  requestType: (0, sqlite_core_1.text)('request_type', {
    enum: ['account_deletion', 'data_export', 'right_to_erasure'],
  }).notNull(),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  reason: (0, sqlite_core_1.text)('reason'),
  adminNotes: (0, sqlite_core_1.text)('admin_notes'),
  verificationToken: (0, sqlite_core_1.text)('verification_token').notNull(),
  expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }).notNull(),
  processedAt: (0, sqlite_core_1.integer)('processed_at', { mode: 'timestamp' }),
  processedBy: (0, sqlite_core_1.text)('processed_by').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
});
exports.backupJobs = (0, sqlite_core_1.sqliteTable)('backup_jobs', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  type: (0, sqlite_core_1.text)('type', {
    enum: ['full', 'comments', 'users', 'incremental'],
  }).notNull(),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  filePath: (0, sqlite_core_1.text)('file_path'), // Path in R2 storage
  fileSize: (0, sqlite_core_1.integer)('file_size'), // Size in bytes
  checksum: (0, sqlite_core_1.text)('checksum'), // SHA-256 hash for integrity verification
  tablesIncluded: (0, sqlite_core_1.text)('tables_included'), // JSON array of backed up tables
  recordCount: (0, sqlite_core_1.integer)('record_count'), // Total number of records backed up
  errorMessage: (0, sqlite_core_1.text)('error_message'),
  startedAt: (0, sqlite_core_1.integer)('started_at', { mode: 'timestamp' }),
  completedAt: (0, sqlite_core_1.integer)('completed_at', { mode: 'timestamp' }),
  triggeredBy: (0, sqlite_core_1.text)('triggered_by').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  isAutomated: (0, sqlite_core_1.integer)('is_automated', { mode: 'boolean' }).default(false),
});
exports.systemMaintenance = (0, sqlite_core_1.sqliteTable)('system_maintenance', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  type: (0, sqlite_core_1.text)('type', {
    enum: ['cleanup', 'optimization', 'migration', 'repair'],
  }).notNull(),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).default('pending'),
  description: (0, sqlite_core_1.text)('description').notNull(),
  affectedTables: (0, sqlite_core_1.text)('affected_tables'), // JSON array of affected tables
  parameters: (0, sqlite_core_1.text)('parameters'), // JSON object with operation parameters
  logOutput: (0, sqlite_core_1.text)('log_output'), // Detailed log of the operation
  startedAt: (0, sqlite_core_1.integer)('started_at', { mode: 'timestamp' }),
  completedAt: (0, sqlite_core_1.integer)('completed_at', { mode: 'timestamp' }),
  triggeredBy: (0, sqlite_core_1.text)('triggered_by').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  isAutomated: (0, sqlite_core_1.integer)('is_automated', { mode: 'boolean' }).default(false),
});
// System settings table
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
  key: (0, sqlite_core_1.text)('key').primaryKey(),
  value: (0, sqlite_core_1.text)('value').notNull(),
  description: (0, sqlite_core_1.text)('description'),
  category: (0, sqlite_core_1.text)('category', {
    enum: ['general', 'comments', 'notifications', 'security', 'performance'],
  }).default('general'),
  isPublic: (0, sqlite_core_1.integer)('is_public', { mode: 'boolean' }).default(false),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull(),
});
exports.referralProfiles = (0, sqlite_core_1.sqliteTable)('referral_profiles', {
  userId: (0, sqlite_core_1.text)('user_id')
    .primaryKey()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  referralCode: (0, sqlite_core_1.text)('referral_code').notNull().unique(),
  defaultCampaign: (0, sqlite_core_1.text)('default_campaign').default('default'),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull(),
});
exports.referralEvents = (0, sqlite_core_1.sqliteTable)('referral_events', {
  id: (0, sqlite_core_1.text)('id').primaryKey(),
  ownerUserId: (0, sqlite_core_1.text)('owner_user_id')
    .notNull()
    .references(() => exports.users.id, { onDelete: 'cascade' }),
  referralCode: (0, sqlite_core_1.text)('referral_code')
    .notNull()
    .references(() => exports.referralProfiles.referralCode, { onDelete: 'cascade' }),
  referredUserId: (0, sqlite_core_1.text)('referred_user_id').references(() => exports.users.id, {
    onDelete: 'set null',
  }),
  status: (0, sqlite_core_1.text)('status', {
    enum: ['pending', 'verified', 'paid', 'cancelled'],
  }).notNull(),
  creditsAwarded: (0, sqlite_core_1.integer)('credits_awarded').notNull().default(0),
  metadata: (0, sqlite_core_1.text)('metadata'),
  occurredAt: (0, sqlite_core_1.integer)('occurred_at', { mode: 'timestamp' }).notNull(),
  createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull(),
});
