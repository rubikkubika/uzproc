-- Add fields for purchase request ID and creation date from Excel
ALTER TABLE purchase_requests
    ADD COLUMN id_purchase_request BIGINT,
    ADD COLUMN purchase_request_creation_date TIMESTAMP;

-- Create index on purchase request ID for faster lookups
CREATE INDEX idx_purchase_requests_id_purchase_request ON purchase_requests(id_purchase_request);

