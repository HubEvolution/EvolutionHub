-- Create ai_jobs table for AI Image Enhancer
-- Tracks AI enhancement jobs, inputs/outputs in R2, provider linkage, and status lifecycle

CREATE TABLE IF NOT EXISTS ai_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  CONSTRAINT chk_ai_jobs_status CHECK (status IN ('queued','processing','succeeded','failed','canceled'))
);

-- Helpful indexes for querying quotas, status and provider mapping
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created_at ON ai_jobs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_provider_job_id ON ai_jobs (provider_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs (created_at);
