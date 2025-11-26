-- Make guid nullable for planned purchase requests
ALTER TABLE purchase_requests
    ALTER COLUMN guid DROP NOT NULL;

