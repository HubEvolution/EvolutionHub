-- Migration 0027: Relax NOT NULL constraints for guest comments
-- Context: Allow guest (unauthenticated) comments where author_id and author_email can be NULL
-- Strategy: Recreate comments table with nullable author_id/author_email, copy data, swap tables, recreate indexes/trigger

PRAGMA foreign_keys=OFF;

-- Create new table with relaxed nullability
CREATE TABLE IF NOT EXISTS comments_new (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author_id INTEGER, -- NULL allowed for guests
  author_name TEXT NOT NULL,
  author_email TEXT, -- NULL allowed for guests
  parent_id TEXT,
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

-- Copy data from existing table if it exists
INSERT INTO comments_new (id, content, author_id, author_name, author_email, parent_id, entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at)
SELECT id, content, author_id, author_name, CASE WHEN author_email = '' THEN NULL ELSE author_email END, parent_id, entity_type, entity_id, status, is_edited, edited_at, created_at, updated_at
FROM comments;

-- Replace old table
DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Recreate trigger to keep updated_at fresh on updates
CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
AFTER UPDATE ON comments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE comments SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

PRAGMA foreign_keys=ON;
