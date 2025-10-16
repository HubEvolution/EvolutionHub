-- Migration 0025: Convert comment-related FKs to TEXT user IDs
-- Tables: comment_moderation, comment_reports, comment_audit_logs

BEGIN TRANSACTION;

-- comment_moderation
CREATE TABLE IF NOT EXISTS comment_moderation_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  moderator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approve','reject','flag','hide','unhide')),
  reason TEXT,
  created_at INTEGER NOT NULL
);

INSERT INTO comment_moderation_v2 (id, comment_id, moderator_id, action, reason, created_at)
SELECT id, comment_id,
       CASE WHEN moderator_id IS NULL THEN NULL ELSE CAST(moderator_id AS TEXT) END,
       action, reason, created_at
FROM comment_moderation;

DROP TABLE comment_moderation;
ALTER TABLE comment_moderation_v2 RENAME TO comment_moderation;

-- comment_reports
CREATE TABLE IF NOT EXISTS comment_reports_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reporter_email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','off_topic','other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO comment_reports_v2 (id, comment_id, reporter_id, reporter_email, reason, description, status, created_at, reviewed_at, reviewed_by)
SELECT id, comment_id,
       CASE WHEN reporter_id IS NULL THEN NULL ELSE CAST(reporter_id AS TEXT) END,
       reporter_email, reason, description, status, created_at, reviewed_at,
       CASE WHEN reviewed_by IS NULL THEN NULL ELSE CAST(reviewed_by AS TEXT) END
FROM comment_reports;

DROP TABLE comment_reports;
ALTER TABLE comment_reports_v2 RENAME TO comment_reports;

-- comment_audit_logs
CREATE TABLE IF NOT EXISTS comment_audit_logs_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','moderate','report','view')),
  old_values TEXT,
  new_values TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

INSERT INTO comment_audit_logs_v2 (id, comment_id, user_id, action, old_values, new_values, reason, ip_address, user_agent, metadata, created_at)
SELECT id, comment_id,
       CASE WHEN user_id IS NULL THEN NULL ELSE CAST(user_id AS TEXT) END,
       action, old_values, new_values, reason, ip_address, user_agent, metadata, created_at
FROM comment_audit_logs;

DROP TABLE comment_audit_logs;
ALTER TABLE comment_audit_logs_v2 RENAME TO comment_audit_logs;

COMMIT;
