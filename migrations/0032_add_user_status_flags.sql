-- Migration: Add user status lifecycle columns
-- Adds status tracking, ban/delete timestamps, and optional Stytch user mapping.

ALTER TABLE users
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'banned', 'deleted'));

ALTER TABLE users
  ADD COLUMN banned_at INTEGER;

ALTER TABLE users
  ADD COLUMN deleted_at INTEGER;

ALTER TABLE users
  ADD COLUMN deleted_by TEXT;

ALTER TABLE users
  ADD COLUMN stytch_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_banned_at ON users(banned_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stytch_user_id ON users(stytch_user_id);
