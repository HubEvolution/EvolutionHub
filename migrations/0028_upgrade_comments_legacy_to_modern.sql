-- Migration 0028: Upgrade legacy comments schema to modern schema (guest-friendly)
-- Transforms legacy table shape: (id, postId, author, content, createdAt, approved)
-- Into modern shape with nullable author_id/author_email and entity scoping.

PRAGMA foreign_keys=OFF;

-- 1) Create modern comments table (author_id/author_email nullable for guests)
CREATE TABLE IF NOT EXISTS comments_new (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author_id INTEGER, -- nullable for guests
  author_name TEXT NOT NULL,
  author_email TEXT, -- nullable for guests
  parent_id TEXT, -- replies
  entity_type TEXT NOT NULL CHECK (entity_type IN ('blog_post', 'project', 'general')),
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged','hidden')),
  is_edited INTEGER DEFAULT 0,
  edited_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2) Copy/transform from legacy comments if present
-- Legacy columns expected: id, postId, author, content, createdAt, approved
INSERT INTO comments_new (
  id, content, author_id, author_name, author_email, parent_id, entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at
)
SELECT
  id AS id,
  content AS content,
  NULL AS author_id,
  CASE WHEN author IS NULL OR author = '' THEN 'Anonymous' ELSE author END AS author_name,
  NULL AS author_email,
  NULL AS parent_id,
  'blog_post' AS entity_type,
  postId AS entity_id,
  CASE approved WHEN 1 THEN 'approved' ELSE 'pending' END AS status,
  0 AS is_edited,
  NULL AS edited_at,
  CAST(strftime('%s', createdAt) AS INTEGER) AS created_at,
  CAST(strftime('%s', createdAt) AS INTEGER) AS updated_at
FROM comments;

-- 3) Replace legacy table
DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- 4) Create supporting tables if missing
CREATE TABLE IF NOT EXISTS comment_moderation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  moderator_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('approve','reject','flag','hide','unhide')),
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comment_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id TEXT NOT NULL,
  reporter_id INTEGER,
  reporter_email TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','off_topic','other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  reviewed_at INTEGER,
  reviewed_by INTEGER,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5) Indexes and trigger
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_moderation_comment ON comment_moderation(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_moderation_moderator ON comment_moderation(moderator_id);
CREATE INDEX IF NOT EXISTS idx_comment_moderation_created_at ON comment_moderation(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
AFTER UPDATE ON comments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE comments SET updated_at = strftime('%s','now') WHERE id = NEW.id;
END;

PRAGMA foreign_keys=ON;
