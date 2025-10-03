-- Create scraping_jobs table for Webscraper Tool
-- Tracks scraping jobs, results, and status lifecycle

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_scraping_jobs_status CHECK (status IN ('pending','processing','succeeded','failed'))
);

-- Helpful indexes for querying quotas and status
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_user_created_at ON scraping_jobs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs (status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_url ON scraping_jobs (url);
