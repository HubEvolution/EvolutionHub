-- Migration: Create data management and backup tables
-- Description: Adds tables for GDPR-compliant data export, deletion requests, and backup management
-- Date: 2025-10-01

-- Data export jobs table for tracking user data exports
CREATE TABLE IF NOT EXISTS data_export_jobs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('user_data', 'comments', 'notifications', 'full_export')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'xml')),
    file_path TEXT,
    file_size INTEGER,
    download_url TEXT,
    expires_at INTEGER,
    error_message TEXT,
    requested_at INTEGER NOT NULL,
    completed_at INTEGER,
    download_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Data deletion requests table for GDPR compliance
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('account_deletion', 'data_export', 'right_to_erasure')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    reason TEXT,
    admin_notes TEXT,
    verification_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    processed_at INTEGER,
    processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Backup jobs table for tracking system backups
CREATE TABLE IF NOT EXISTS backup_jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('full', 'comments', 'users', 'incremental')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    file_path TEXT,
    file_size INTEGER,
    checksum TEXT,
    tables_included TEXT, -- JSON array of table names
    record_count INTEGER,
    error_message TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_automated BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- System maintenance jobs table for tracking maintenance operations
CREATE TABLE IF NOT EXISTS system_maintenance (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('cleanup', 'optimization', 'migration', 'repair')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    description TEXT NOT NULL,
    affected_tables TEXT, -- JSON array of table names
    parameters TEXT, -- JSON object with operation parameters
    log_output TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_automated BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_user_id ON data_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_type ON data_export_jobs(type);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_expires_at ON data_export_jobs(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_token ON data_deletion_requests(verification_token);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_expires_at ON data_deletion_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type ON backup_jobs(type);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_automated ON backup_jobs(is_automated);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_completed_at ON backup_jobs(completed_at);

CREATE INDEX IF NOT EXISTS idx_system_maintenance_status ON system_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_type ON system_maintenance(type);
CREATE INDEX IF NOT EXISTS idx_system_maintenance_automated ON system_maintenance(is_automated);

-- Insert default email templates for data export notifications
INSERT OR IGNORE INTO email_templates (id, name, subject, html_content, text_content, variables, created_at)
VALUES (
    'data-export-ready',
    'Data Export Ready',
    'Ihre Datenexport-Datei ist bereit zum Download',
    '<h2>Ihre Datenexport-Datei ist bereit</h2><p>Hallo,</p><p>Ihre angeforderte Datenexport-Datei ist jetzt zum Download bereit. Die Datei enthält alle Ihre Daten entsprechend Ihrer Anfrage.</p><p><strong>Download-Link:</strong> <a href="{{downloadUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Jetzt herunterladen</a></p><p><strong>Wichtig:</strong> Dieser Link läuft am {{expiresAt}} ab und kann nur einmal verwendet werden.</p><p>Mit freundlichen Grüßen,<br>Ihr {{siteName}}-Team</p>',
    'Hallo,\n\nIhre angeforderte Datenexport-Datei ist jetzt zum Download bereit. Die Datei enthält alle Ihre Daten entsprechend Ihrer Anfrage.\n\nDownload-Link: {{downloadUrl}}\n\nWichtig: Dieser Link läuft am {{expiresAt}} ab und kann nur einmal verwendet werden.\n\nMit freundlichen Grüßen,\nIhr {{siteName}}-Team',
    '["downloadUrl", "expiresAt", "siteName"]',
    strftime('%s', 'now') * 1000
),
(
    'data-deletion-confirmation',
    'Data Deletion Request Confirmation',
    'Bestätigung Ihrer Datenlösch-Anfrage',
    '<h2>Datenlösch-Anfrage erhalten</h2><p>Hallo,</p><p>wir haben Ihre Anfrage zur Löschung Ihrer Daten erhalten. Bevor wir mit der Löschung fortfahren, müssen wir diese Anfrage verifizieren.</p><p><strong>Verifikations-Link:</strong> <a href="{{verificationUrl}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Löschung bestätigen</a></p><p><strong>Wichtig:</strong> Dieser Link läuft am {{expiresAt}} ab. Nach der Bestätigung werden alle Ihre Daten unwiderruflich gelöscht.</p><p>Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail einfach ignorieren.</p><p>Mit freundlichen Grüßen,<br>Ihr {{siteName}}-Team</p>',
    'Hallo,\n\nwir haben Ihre Anfrage zur Löschung Ihrer Daten erhalten. Bevor wir mit der Löschung fortfahren, müssen wir diese Anfrage verifizieren.\n\nVerifikations-Link: {{verificationUrl}}\n\nWichtig: Dieser Link läuft am {{expiresAt}} ab. Nach der Bestätigung werden alle Ihre Daten unwiderruflich gelöscht.\n\nWenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail einfach ignorieren.\n\nMit freundlichen Grüßen,\nIhr {{siteName}}-Team',
    '["verificationUrl", "expiresAt", "siteName"]',
    strftime('%s', 'now') * 1000
);

-- Insert default GDPR compliance information
INSERT OR IGNORE INTO settings (key, value, description, created_at, updated_at)
VALUES
(
    'gdpr_compliance_info',
    '{
        "dataCategories": ["Account information (email, name)", "Comments and posts", "Notifications and preferences", "Usage statistics and analytics"],
        "retentionPeriods": {
            "Account data": "Until account deletion or 3 years after last activity",
            "Comments": "Until account deletion or manual removal",
            "Notifications": "90 days after being read",
            "Analytics": "2 years for aggregated data"
        },
        "thirdPartyTransfers": ["Cloudflare (hosting and CDN)", "Email service provider (notifications)", "Analytics service (usage statistics)"],
        "securityMeasures": ["End-to-end encryption for sensitive data", "Regular security audits", "Access controls and authentication", "Data backup and disaster recovery"],
        "dataProcessingPurposes": ["Providing commenting functionality", "Sending notifications", "Improving user experience", "Complying with legal obligations"],
        "userRights": ["Right to access your data", "Right to data portability", "Right to rectification", "Right to erasure", "Right to restrict processing", "Right to object to processing"]
    }',
    'GDPR compliance information for data export requests',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
);