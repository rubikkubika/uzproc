-- Create purchase_requests table
CREATE TABLE purchase_requests (
    id BIGSERIAL PRIMARY KEY,
    guid UUID UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on guid
CREATE INDEX idx_purchase_requests_guid ON purchase_requests(guid);

