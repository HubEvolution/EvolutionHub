-- Migration: Create comment system with moderation features
-- Created: 2025-10-01
-- Description: Creates tables for comments, moderation, and reporting

-- Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  parent_id TEXT, -- For nested comments (replies)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('blog_post', 'project', 'general')),
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged', 'hidden')),
  is_edited INTEGER DEFAULT 0,
  edited_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Comment moderation table
CREATE TABLE comment_moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  moderator_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'hide', 'unhide')),
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Comment reports table
CREATE TABLE comment_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  reporter_id INTEGER,
  reporter_email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'off_topic', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  reviewed_at INTEGER,
  reviewed_by INTEGER,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

CREATE INDEX idx_comment_moderation_comment ON comment_moderation(comment_id);
CREATE INDEX idx_comment_moderation_moderator ON comment_moderation(moderator_id);
CREATE INDEX idx_comment_moderation_created_at ON comment_moderation(created_at DESC);

CREATE INDEX idx_comment_reports_comment ON comment_reports(comment_id);
CREATE INDEX idx_comment_reports_status ON comment_reports(status);
CREATE INDEX idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_comments_updated_at
  AFTER UPDATE ON comments
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE comments SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;