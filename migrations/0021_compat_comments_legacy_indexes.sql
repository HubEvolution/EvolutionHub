-- Migration: Compatibility performance indexes for legacy comments schema
-- Date: 2025-10-01
-- For environments where comments has columns: postId, approved, createdAt

-- Accelerate fetching comments by post and createdAt
CREATE INDEX IF NOT EXISTS idx_legacy_comments_post_created
ON comments(postId, createdAt DESC, id);

-- Accelerate approved-only queries
CREATE INDEX IF NOT EXISTS idx_legacy_comments_post_approved_created
ON comments(postId, approved, createdAt DESC, id);
