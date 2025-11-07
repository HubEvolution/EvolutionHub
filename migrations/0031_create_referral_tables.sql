-- Ensure foreign keys are enforced
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS referral_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  default_campaign TEXT DEFAULT 'default',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (length(referral_code) BETWEEN 6 AND 64)
);

CREATE TABLE IF NOT EXISTS referral_events (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'paid', 'cancelled')),
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (referral_code) REFERENCES referral_profiles(referral_code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS referral_events_owner_status_idx
  ON referral_events(owner_user_id, status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS referral_events_owner_created_idx
  ON referral_events(owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS referral_events_code_idx
  ON referral_events(referral_code);

-- Seed referral_profiles for existing users without a profile.
INSERT INTO referral_profiles (user_id, referral_code, default_campaign, created_at, updated_at)
SELECT
  u.id,
  substr(replace(u.id, '-', ''), 1, 16) AS referral_code,
  'default',
  CAST(strftime('%s', 'now') * 1000 AS INTEGER) AS created_at,
  CAST(strftime('%s', 'now') * 1000 AS INTEGER) AS updated_at
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM referral_profiles rp WHERE rp.user_id = u.id
);
