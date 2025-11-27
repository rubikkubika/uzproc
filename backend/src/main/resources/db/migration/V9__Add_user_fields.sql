-- Add surname, name, department, position fields to users table
ALTER TABLE users
    ADD COLUMN surname VARCHAR(255),
    ADD COLUMN name VARCHAR(255),
    ADD COLUMN department VARCHAR(500),
    ADD COLUMN position VARCHAR(500);

