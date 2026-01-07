-- Fix user roles to match enum values (USER, ADMIN instead of user, admin)
-- Update existing 'user' values to 'USER'
UPDATE users
SET role = 'USER'
WHERE role = 'user' OR role IS NULL;

-- Update existing 'admin' values to 'ADMIN'
UPDATE users
SET role = 'ADMIN'
WHERE role = 'admin';

-- Ensure all roles are uppercase enum values
UPDATE users
SET role = UPPER(role)
WHERE role IS NOT NULL AND role != UPPER(role);

