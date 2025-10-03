-- Migration: Add user roles for admin and moderator permissions
-- Created: 2025-10-01
-- Description: Adds role column to users table for access control

-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'moderator', 'admin'));

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have default role
-- Note: In production, you would manually set specific users as admin
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
