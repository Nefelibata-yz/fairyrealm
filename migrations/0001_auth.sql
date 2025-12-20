-- Migration number: 0001 	 2023-12-20T22:56:00.000Z

-- Add password and guest fields to users
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0; -- 0 for user, 1 for guest
ALTER TABLE users ADD COLUMN guest_id TEXT; -- For tracking unauthenticated users

-- Ensure email is unique for registered users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE is_guest = 0;
