-- Migration 0009: Adjust ai_jobs for guest ownership support
-- - Make user_id nullable
-- - Add owner_type ("user" | "guest") and owner_ref (stable owner identifier)
-- - Preserve existing data (map existing rows to owner_type='user', owner_ref=user_id)
-- - Recreate helpful indexes including owner-based quota lookup

-- Rename old table
ALTER TABLE ai_jobs RENAME TO ai_jobs_old;

-- Create new table with updated schema and constraints
CREATE TABLE IF NOT EXISTS ai_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- now nullable to support guest ownership
  owner_type TEXT NOT NULL, -- 'user' | 'guest'
  owner_ref TEXT NOT NULL,  -- user.id or guest cookie id
  provider TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_job_id TEXT,
  input_r2_key TEXT,
  input_content_type TEXT,
  input_size INTEGER,
  output_r2_key TEXT,
  params_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_ai_jobs_status CHECK (status IN ('queued','processing','succeeded','failed','canceled')),
  CONSTRAINT chk_ai_jobs_owner_type CHECK (owner_type IN ('user','guest')),
  -- Ensure consistency between owner_type and user_id
  CONSTRAINT chk_ai_jobs_owner_consistency CHECK (
    (owner_type = 'user' AND user_id IS NOT NULL) OR
    (owner_type = 'guest' AND user_id IS NULL)
  )
);

-- Migrate data from old table
INSERT INTO ai_jobs (
  id, user_id, owner_type, owner_ref, provider, model, status, provider_job_id,
  input_r2_key, input_content_type, input_size, output_r2_key, params_json, error_message,
  created_at, updated_at
)
SELECT
  id,
  user_id,
  'user' AS owner_type,
  user_id AS owner_ref,
  provider,
  model,
  status,
  provider_job_id,
  input_r2_key,
  input_content_type,
  input_size,
  output_r2_key,
  params_json,
  error_message,
  created_at,
  updated_at
FROM ai_jobs_old;

-- Drop old table
DROP TABLE ai_jobs_old;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created_at ON ai_jobs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_owner_created_at ON ai_jobs (owner_type, owner_ref, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider_job_id ON ai_jobs (provider_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs (created_at);
