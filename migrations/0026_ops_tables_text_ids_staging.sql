-- Staging-safe 0026: Convert ops tables' user FKs to TEXT user IDs (no explicit transaction)
-- Tables: data_export_jobs, data_deletion_requests, backup_jobs, system_maintenance

-- data_export_jobs
CREATE TABLE IF NOT EXISTS data_export_jobs_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('user_data','comments','notifications','full_export')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  format TEXT DEFAULT 'json' CHECK (format IN ('json','csv','xml')),
  file_path TEXT,
  file_size INTEGER,
  download_url TEXT,
  expires_at INTEGER,
  error_message TEXT,
  requested_at INTEGER NOT NULL,
  completed_at INTEGER,
  download_count INTEGER DEFAULT 0
);

INSERT INTO data_export_jobs_v2 (
  id, user_id, type, status, format, file_path, file_size, download_url, expires_at, error_message, requested_at, completed_at, download_count
)
SELECT
  id,
  CAST(user_id AS TEXT),
  type, status, format, file_path, file_size, download_url, expires_at, error_message, requested_at, completed_at, download_count
FROM data_export_jobs;

DROP TABLE data_export_jobs;
ALTER TABLE data_export_jobs_v2 RENAME TO data_export_jobs;

-- data_deletion_requests
CREATE TABLE IF NOT EXISTS data_deletion_requests_v2 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('account_deletion','data_export','right_to_erasure')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  reason TEXT,
  admin_notes TEXT,
  verification_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  processed_at INTEGER,
  processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO data_deletion_requests_v2 (
  id, user_id, request_type, status, reason, admin_notes, verification_token, expires_at, processed_at, processed_by, created_at
)
SELECT
  id,
  CAST(user_id AS TEXT),
  request_type, status, reason, admin_notes, verification_token, expires_at, processed_at,
  CASE WHEN processed_by IS NULL THEN NULL ELSE CAST(processed_by AS TEXT) END,
  created_at
FROM data_deletion_requests;

DROP TABLE data_deletion_requests;
ALTER TABLE data_deletion_requests_v2 RENAME TO data_deletion_requests;

-- backup_jobs
CREATE TABLE IF NOT EXISTS backup_jobs_v2 (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('full','comments','users','incremental')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  file_path TEXT,
  file_size INTEGER,
  checksum TEXT,
  tables_included TEXT,
  record_count INTEGER,
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  triggered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_automated INTEGER DEFAULT 0
);

INSERT INTO backup_jobs_v2 (
  id, type, status, file_path, file_size, checksum, tables_included, record_count, error_message, started_at, completed_at, triggered_by, is_automated
)
SELECT
  id, type, status, file_path, file_size, checksum, tables_included, record_count, error_message, started_at, completed_at,
  CASE WHEN triggered_by IS NULL THEN NULL ELSE CAST(triggered_by AS TEXT) END,
  is_automated
FROM backup_jobs;

DROP TABLE backup_jobs;
ALTER TABLE backup_jobs_v2 RENAME TO backup_jobs;

-- system_maintenance
CREATE TABLE IF NOT EXISTS system_maintenance_v2 (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cleanup','optimization','migration','repair')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  description TEXT NOT NULL,
  affected_tables TEXT,
  parameters TEXT,
  log_output TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  triggered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_automated INTEGER DEFAULT 0
);

INSERT INTO system_maintenance_v2 (
  id, type, status, description, affected_tables, parameters, log_output, started_at, completed_at, triggered_by, is_automated
)
SELECT
  id, type, status, description, affected_tables, parameters, log_output, started_at, completed_at,
  CASE WHEN triggered_by IS NULL THEN NULL ELSE CAST(triggered_by AS TEXT) END,
  is_automated
FROM system_maintenance;

DROP TABLE system_maintenance;
ALTER TABLE system_maintenance_v2 RENAME TO system_maintenance;
