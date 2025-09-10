-- Migration 0010: Drop legacy password artifacts for Stytch-only auth
-- This migration removes users.password_hash and drops password_reset_tokens.
-- SQLite (D1) does not support DROP COLUMN, so we recreate the users table.

BEGIN TRANSACTION;

-- 1) Create new users table without password_hash
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verified INTEGER NOT NULL DEFAULT 0,
  email_verified_at INTEGER NULL
);

-- 2) Copy data from users to users_new, omitting password_hash
INSERT INTO users_new (
  id, name, username, full_name, email, image, created_at, email_verified, email_verified_at
)
SELECT 
  id, name, username, full_name, email, image, created_at,
  COALESCE(email_verified, 1) AS email_verified,
  email_verified_at
FROM users;

-- 3) Replace users table
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- 4) Drop password reset tokens table if exists
DROP TABLE IF EXISTS password_reset_tokens;

COMMIT;
