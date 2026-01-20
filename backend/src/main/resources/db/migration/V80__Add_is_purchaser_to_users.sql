-- Add is_purchaser column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_purchaser BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.is_purchaser IS 'Флаг, указывающий является ли пользователь закупщиком';
