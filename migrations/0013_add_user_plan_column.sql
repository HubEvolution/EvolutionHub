-- Migration 0013: Add plan column to users table
-- Adds a simple TEXT column with default 'free' to avoid complex table recreation in SQLite/D1.
-- Webhook and API will rely on this column to resolve the user's current plan.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
