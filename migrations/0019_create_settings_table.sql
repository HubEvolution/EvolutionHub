-- Migration: Create system settings table
-- Created: 2025-10-01
-- Description: Creates table for storing system-wide configuration settings

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'comments', 'notifications', 'security', 'performance')),
    is_public INTEGER DEFAULT 0, -- 0 = internal only, 1 = can be exposed to frontend
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_public ON settings(is_public);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_settings_updated_at
  AFTER UPDATE ON settings
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE settings SET updated_at = strftime('%s', 'now') * 1000 WHERE key = NEW.key;
END;

-- Insert default settings for comment system
INSERT OR IGNORE INTO settings (key, value, description, category, is_public) VALUES
  ('comment_moderation_enabled', 'true', 'Enable comment moderation queue', 'comments', 0),
  ('comment_auto_approve_trusted', 'false', 'Auto-approve comments from trusted users', 'comments', 0),
  ('comment_max_length', '2000', 'Maximum comment length in characters', 'comments', 1),
  ('comment_min_length', '3', 'Minimum comment length in characters', 'comments', 1),
  ('comment_rate_limit', '5', 'Maximum comments per minute per user', 'comments', 0),
  ('spam_detection_enabled', 'true', 'Enable spam detection for comments', 'comments', 0),
  ('notification_batch_enabled', 'true', 'Enable batch notification delivery', 'notifications', 0),
  ('notification_email_enabled', 'true', 'Enable email notifications', 'notifications', 0);
