-- Migration: Create notification system tables
-- Created: 2025-10-01
-- Description: Creates tables for notifications, notification settings, email templates, and email queue

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('comment_reply', 'comment_mention', 'comment_approved', 'comment_rejected', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT, -- JSON string with additional context
    is_read BOOLEAN DEFAULT FALSE,
    read_at INTEGER, -- Unix timestamp
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    expires_at INTEGER, -- Unix timestamp for auto-deletion
    created_at INTEGER NOT NULL -- Unix timestamp
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('comment_reply', 'comment_mention', 'comment_approved', 'comment_rejected', 'system', 'email_digest')),
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
    enabled BOOLEAN DEFAULT TRUE,
    frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'never')),
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_at INTEGER NOT NULL, -- Unix timestamp
    UNIQUE(user_id, type, channel)
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    variables TEXT, -- JSON array of available template variables
    is_active BOOLEAN DEFAULT TRUE,
    locale TEXT DEFAULT 'de' CHECK (locale IN ('de', 'en')),
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_at INTEGER NOT NULL -- Unix timestamp
);

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    template_id TEXT NOT NULL REFERENCES email_templates(id),
    variables TEXT NOT NULL, -- JSON object with template variable values
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    scheduled_for INTEGER NOT NULL, -- Unix timestamp
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    sent_at INTEGER, -- Unix timestamp
    created_at INTEGER NOT NULL -- Unix timestamp
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(type);

CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_locale ON email_templates(locale);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);

-- Insert default email templates
INSERT OR IGNORE INTO email_templates (id, name, subject, html_content, text_content, variables, locale, created_at, updated_at) VALUES
-- German templates
('comment-reply-de', 'comment_reply', 'Neue Antwort auf Ihren Kommentar',
'<html><body><h2>Neue Antwort auf Ihren Kommentar</h2><p>Hallo {{userName}},</p><p><strong>{{notification.authorName}}</strong> hat auf Ihren Kommentar geantwortet:</p><blockquote>{{notification.commentContent}}</blockquote><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comment-{{notification.commentId}}">Zum Kommentar</a></p><p>Mit freundlichen Grüßen,<br>Ihr Team</p></body></html>',
'Hallo {{userName}},\n\n{{notification.authorName}} hat auf Ihren Kommentar geantwortet:\n\n"{{notification.commentContent}}"\n\nZum Kommentar: {{baseUrl}}/blog/{{notification.entityId}}#comment-{{notification.commentId}}\n\nMit freundlichen Grüßen,\nIhr Team',
'["userName", "baseUrl", "notification.authorName", "notification.commentContent", "notification.entityId", "notification.commentId"]',
'de', strftime('%s', 'now'), strftime('%s', 'now')),

('comment-mention-de', 'comment_mention', 'Sie wurden in einem Kommentar erwähnt',
'<html><body><h2>Sie wurden erwähnt</h2><p>Hallo {{userName}},</p><p><strong>{{notification.authorName}}</strong> hat Sie in einem Kommentar erwähnt:</p><blockquote>{{notification.commentContent}}</blockquote><p><a href="{{baseUrl}}/blog/{{notification.entityId}}#comment-{{notification.commentId}}">Zum Kommentar</a></p><p>Mit freundlichen Grüßen,<br>Ihr Team</p></body></html>',
'Hallo {{userName}},\n\n{{notification.authorName}} hat Sie in einem Kommentar erwähnt:\n\n"{{notification.commentContent}}"\n\nZum Kommentar: {{baseUrl}}/blog/{{notification.entityId}}#comment-{{notification.commentId}}\n\nMit freundlichen Grüßen,\nIhr Team',
'["userName", "baseUrl", "notification.authorName", "notification.commentContent", "notification.entityId", "notification.commentId"]',
'de', strftime('%s', 'now'), strftime('%s', 'now')),

-- English templates
('comment-reply-en', 'comment_reply', 'New reply to your comment',
'<html><body><h2>New reply to your comment</h2><p>Hello {{userName}},</p><p><strong>{{notification.authorName}}</strong> replied to your comment:</p><blockquote>{{notification.commentContent}}</blockquote><p><a href="{{baseUrl}}/en/blog/{{notification.entityId}}#comment-{{notification.commentId}}">View comment</a></p><p>Best regards,<br>Your team</p></body></html>',
'Hello {{userName}},\n\n{{notification.authorName}} replied to your comment:\n\n"{{notification.commentContent}}"\n\nView comment: {{baseUrl}}/en/blog/{{notification.entityId}}#comment-{{notification.commentId}}\n\nBest regards,\nYour team',
'["userName", "baseUrl", "notification.authorName", "notification.commentContent", "notification.entityId", "notification.commentId"]',
'en', strftime('%s', 'now'), strftime('%s', 'now')),

('comment-mention-en', 'comment_mention', 'You were mentioned in a comment',
'<html><body><h2>You were mentioned</h2><p>Hello {{userName}},</p><p><strong>{{notification.authorName}}</strong> mentioned you in a comment:</p><blockquote>{{notification.commentContent}}</blockquote><p><a href="{{baseUrl}}/en/blog/{{notification.entityId}}#comment-{{notification.commentId}}">View comment</a></p><p>Best regards,<br>Your team</p></body></html>',
'Hello {{userName}},\n\n{{notification.authorName}} mentioned you in a comment:\n\n"{{notification.commentContent}}"\n\nView comment: {{baseUrl}}/en/blog/{{notification.entityId}}#comment-{{notification.commentId}}\n\nBest regards,\nYour team',
'["userName", "baseUrl", "notification.authorName", "notification.commentContent", "notification.entityId", "notification.commentId"]',
'en', strftime('%s', 'now'), strftime('%s', 'now'));