-- Migration: Create comment audit logs table
-- Description: Adds comprehensive audit logging for all comment-related actions

CREATE TABLE comment_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'moderate', 'report', 'view')),
    old_values TEXT, -- JSON string of previous state (for updates)
    new_values TEXT, -- JSON string of new state (for updates)
    reason TEXT, -- Reason for the action (especially for moderation)
    ip_address TEXT, -- Anonymized IP address
    user_agent TEXT, -- User agent string (truncated)
    metadata TEXT, -- Additional context data as JSON
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for efficient querying by comment
CREATE INDEX idx_comment_audit_logs_comment_id ON comment_audit_logs(comment_id);

-- Index for efficient querying by user
CREATE INDEX idx_comment_audit_logs_user_id ON comment_audit_logs(user_id);

-- Index for efficient querying by action type
CREATE INDEX idx_comment_audit_logs_action ON comment_audit_logs(action);

-- Index for efficient querying by timestamp
CREATE INDEX idx_comment_audit_logs_created_at ON comment_audit_logs(created_at);

-- Composite index for common queries (comment + action)
CREATE INDEX idx_comment_audit_logs_comment_action ON comment_audit_logs(comment_id, action);

-- Composite index for common queries (user + action)
CREATE INDEX idx_comment_audit_logs_user_action ON comment_audit_logs(user_id, action);