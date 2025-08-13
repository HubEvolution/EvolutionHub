-- Add email verification functionality to users table
-- This migration implements the Double-Opt-in email verification system

-- Step 1: Add email verification columns to users table
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0; -- Using INTEGER for boolean (0 for false, 1 for true)
ALTER TABLE users ADD COLUMN email_verified_at INTEGER NULL; -- Unix timestamp when email was verified

-- Step 2: Create email verification tokens table
-- This table stores temporary tokens for email verification (similar to password_reset_tokens)
CREATE TABLE email_verification_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- Store email for validation
    created_at INTEGER NOT NULL, -- Unix timestamp
    expires_at INTEGER NOT NULL, -- Unix timestamp (created_at + 24 hours)
    used_at INTEGER NULL -- Unix timestamp when token was used (null if not used yet)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX idx_email_verification_tokens_email ON email_verification_tokens(email);

-- Step 4: Mark all existing users as verified (backward compatibility)
-- This ensures existing users can continue to log in without email verification
UPDATE users SET 
    email_verified = 1, 
    email_verified_at = strftime('%s', 'now') 
WHERE email_verified = 0;

-- Step 5: Add comment for documentation
-- This migration enables Double-Opt-in email verification for new user registrations
-- Existing users are automatically marked as verified for backward compatibility
