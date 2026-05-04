ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS customer_organization VARCHAR(50);
