-- Migration 0012: Create billing tables for Stripe integration
-- - stripe_customers: maps user -> stripe customer
-- - subscriptions: tracks subscription state and plan for user

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, -- stripe subscription id
  user_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free','pro','premium','enterprise')),
  status TEXT NOT NULL, -- e.g. active, canceled, past_due, trialing, incomplete, incomplete_expired, unpaid
  current_period_end INTEGER NULL, -- unix seconds
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
