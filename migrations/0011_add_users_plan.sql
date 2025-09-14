-- Migration 0011: Add plan to users for plan-based entitlements
-- Plans control daily AI Image Enhancer quotas and features

ALTER TABLE users
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free','pro','premium','enterprise'));
