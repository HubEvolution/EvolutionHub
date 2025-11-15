-- Migration 0033: Create discount codes management tables
-- - discount_codes: stores discount code definitions and limits
-- - discount_code_usages: tracks individual usage per user/order

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  max_uses INTEGER NULL CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from INTEGER NULL,
  valid_until INTEGER NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'expired')) DEFAULT 'active',
  description TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_code_usages (
  id TEXT PRIMARY KEY,
  discount_code_id TEXT NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT,
  discount_amount INTEGER NOT NULL,
  used_at INTEGER NOT NULL,
  UNIQUE (discount_code_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes (code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_status ON discount_codes (status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_until ON discount_codes (valid_until);
CREATE INDEX IF NOT EXISTS idx_discount_code_usages_code ON discount_code_usages (discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usages_user ON discount_code_usages (user_id);
