-- Migration: Create performance indexes and optimizations
-- Description: Adds optimized indexes for better query performance and scalability
-- Date: 2025-10-01

-- Performance indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_post_status_created ON comments(post_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_post_parent_status ON comments(post_id, parent_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_author_status ON comments(author_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_status_created ON comments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_likes_dislikes ON comments(likes, dislikes);
CREATE INDEX IF NOT EXISTS idx_comments_updated_at ON comments(updated_at DESC);

-- Performance indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Performance indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created ON notifications(type, created_at DESC);

-- Performance indexes for data export jobs
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_user_status ON data_export_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status_created ON data_export_jobs(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_expires_at ON data_export_jobs(expires_at);

-- Performance indexes for backup jobs
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status_completed ON backup_jobs(status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type_status ON backup_jobs(type, status);

-- Performance indexes for system maintenance
CREATE INDEX IF NOT EXISTS idx_system_maintenance_status_started ON system_maintenance(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_type_status ON system_maintenance(type, status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments(content, status, created_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(post_id, parent_id, created_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_comments_author_thread ON comments(author_id, post_id, parent_id, created_at);

-- Partial indexes for better performance on specific queries
CREATE INDEX IF NOT EXISTS idx_comments_approved_recent ON comments(created_at DESC, post_id) WHERE status = 'approved' AND created_at > (strftime('%s', 'now', '-30 days') * 1000);
CREATE INDEX IF NOT EXISTS idx_comments_pending_moderation ON comments(created_at ASC) WHERE status = 'pending';

-- Indexes for pagination performance
CREATE INDEX IF NOT EXISTS idx_comments_pagination ON comments(post_id, status, created_at DESC, id) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_comments_parent_pagination ON comments(parent_id, status, created_at DESC, id) WHERE status = 'approved';

-- Full-text search index (if supported by SQLite)
-- Note: FTS5 would need to be enabled in SQLite for this to work
-- CREATE VIRTUAL TABLE IF NOT EXISTS comments_fts USING fts5(content, tokenize = 'porter ascii');

-- Performance monitoring table for query analytics
CREATE TABLE IF NOT EXISTS query_performance_logs (
    id TEXT PRIMARY KEY,
    query_type TEXT NOT NULL,
    table_name TEXT,
    execution_time INTEGER NOT NULL,
    rows_affected INTEGER,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    query_hash TEXT,
    slow_query BOOLEAN DEFAULT FALSE
);

-- Index for performance logs
CREATE INDEX IF NOT EXISTS idx_query_performance_timestamp ON query_performance_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_slow ON query_performance_logs(slow_query, timestamp DESC) WHERE slow_query = TRUE;
CREATE INDEX IF NOT EXISTS idx_query_performance_type ON query_performance_logs(query_type, execution_time DESC);

-- Cache statistics table
CREATE TABLE IF NOT EXISTS cache_statistics (
    id TEXT PRIMARY KEY,
    cache_type TEXT NOT NULL,
    hits INTEGER DEFAULT 0,
    misses INTEGER DEFAULT 0,
    evictions INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    max_size_bytes INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Index for cache statistics
CREATE INDEX IF NOT EXISTS idx_cache_statistics_timestamp ON cache_statistics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_type ON cache_statistics(cache_type, timestamp DESC);

-- Insert default cache configuration
INSERT OR IGNORE INTO settings (key, value, description, created_at, updated_at)
VALUES
(
    'performance_config',
    '{
        "cache": {
            "enabled": true,
            "ttl": 300000,
            "maxSize": 104857600,
            "strategy": "memory"
        },
        "pagination": {
            "defaultLimit": 20,
            "maxLimit": 100,
            "maxDepth": 5
        },
        "lazyLoading": {
            "threshold": 100,
            "rootMargin": "50px",
            "enabled": true,
            "batchSize": 10
        },
        "database": {
            "queryTimeout": 5000,
            "slowQueryThreshold": 1000
        }
    }',
    'Performance configuration settings',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
),
(
    'cdn_config',
    '{
        "enabled": false,
        "baseUrl": null,
        "fallbackUrl": null,
        "cacheHeaders": {
            "Cache-Control": "public, max-age=31536000",
            "CDN-Cache-Control": "max-age=86400"
        },
        "optimization": {
            "imageResize": true,
            "imageFormat": "webp",
            "lazyLoading": true
        }
    }',
    'CDN configuration for static assets',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);

-- Create view for comment statistics (materialized for performance)
CREATE VIEW IF NOT EXISTS comment_statistics AS
SELECT
    post_id,
    COUNT(*) as total_comments,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_comments,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_comments,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_comments,
    COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_comments,
    COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as reply_comments,
    AVG(likes) as avg_likes,
    MAX(created_at) as last_comment_at,
    MIN(created_at) as first_comment_at
FROM comments
GROUP BY post_id;

-- Create view for performance metrics
CREATE VIEW IF NOT EXISTS performance_metrics AS
SELECT
    strftime('%Y-%m-%d %H:00:00', datetime(timestamp/1000, 'unixepoch')) as hour,
    query_type,
    COUNT(*) as query_count,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    SUM(CASE WHEN slow_query THEN 1 ELSE 0 END) as slow_queries
FROM query_performance_logs
WHERE timestamp > (strftime('%s', 'now', '-24 hours') * 1000)
GROUP BY hour, query_type;

-- Trigger for automatic performance logging (simplified version)
-- Note: In a real implementation, this would be handled by the application layer

-- Insert sample performance data for testing
INSERT OR IGNORE INTO cache_statistics (id, cache_type, hits, misses, size_bytes, max_size_bytes)
VALUES
(
    'initial_stats',
    'comments',
    0,
    0,
    0,
    104857600
);