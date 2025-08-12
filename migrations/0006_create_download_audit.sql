-- Create audit table for lead magnet downloads
-- Tracks download attempts and outcomes for R2/public delivery

CREATE TABLE IF NOT EXISTS download_audit (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip TEXT,
  user_id TEXT,
  asset_key TEXT NOT NULL,
  status TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0
);

-- Helpful indexes for querying by time, asset and status
CREATE INDEX IF NOT EXISTS idx_download_audit_created_at ON download_audit (created_at);
CREATE INDEX IF NOT EXISTS idx_download_audit_asset_key ON download_audit (asset_key);
CREATE INDEX IF NOT EXISTS idx_download_audit_status ON download_audit (status);
