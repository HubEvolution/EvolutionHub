-- Migration: Comments performance indexes aligned with current schema
-- Date: 2025-10-01
-- Note: Adds composite indexes for efficient pagination and entity-scoped queries.

-- Composite index for entity-scoped pagination by newest first
CREATE INDEX IF NOT EXISTS idx_comments_entity_pagination
ON comments(entity_type, entity_id, status, created_at DESC, id);

-- Composite index for replies pagination within a thread
CREATE INDEX IF NOT EXISTS idx_comments_parent_pagination
ON comments(parent_id, status, created_at DESC, id);

-- Composite index to accelerate entity + created_at lookups (non-status constrained)
CREATE INDEX IF NOT EXISTS idx_comments_entity_created
ON comments(entity_type, entity_id, created_at DESC);
