ALTER TABLE purchase_requests RENAME COLUMN mcc TO purchase_method;
ALTER TABLE purchases RENAME COLUMN mcc TO purchase_method;
ALTER TABLE contracts RENAME COLUMN mcc TO purchase_method;
