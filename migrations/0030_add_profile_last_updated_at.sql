-- Migration: Add profile change cooldown tracking
-- Adds a timestamp column to enforce cooldown between profile updates.

ALTER TABLE users ADD COLUMN profile_last_updated_at INTEGER;

-- Note: INTEGER holds epoch milliseconds; null means no prior update (no cooldown).
