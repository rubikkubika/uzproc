-- Add is_contractor column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_contractor BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.is_contractor IS 'Флаг, указывающий является ли пользователь договорником';
