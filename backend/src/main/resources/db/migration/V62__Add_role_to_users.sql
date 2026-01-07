-- Add role field to users table
ALTER TABLE users
    ADD COLUMN role VARCHAR(50) DEFAULT 'user';

-- Update existing users: if email or username contains 'admin', set role to 'admin'
UPDATE users
SET role = 'admin'
WHERE (email IS NOT NULL AND LOWER(email) LIKE '%admin%')
   OR (username IS NOT NULL AND LOWER(username) LIKE '%admin%');

-- Set NOT NULL constraint after updating existing data
ALTER TABLE users
    ALTER COLUMN role SET NOT NULL;

-- Create index on role for faster queries
CREATE INDEX idx_users_role ON users(role);

