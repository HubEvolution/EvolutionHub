-- Add password_hash column to users table
-- Note: SQLite does not support conditional execution in plain SQL migrations.
-- Idempotency is ensured in setup-local-dev.ts by checking existing columns
-- before applying this migration multiple times locally.
ALTER TABLE users ADD COLUMN password_hash TEXT;