-- Add new fields to purchase_requests table
ALTER TABLE purchase_requests
    ADD COLUMN purchase_plan_year INTEGER,
    ADD COLUMN company VARCHAR(255),
    ADD COLUMN cfo VARCHAR(255),
    ADD COLUMN mcc VARCHAR(255),
    ADD COLUMN purchase_initiator VARCHAR(255),
    ADD COLUMN purchase_subject VARCHAR(500),
    ADD COLUMN budget_amount NUMERIC(15, 2),
    ADD COLUMN cost_type VARCHAR(255),
    ADD COLUMN contract_type VARCHAR(255),
    ADD COLUMN contract_duration_months INTEGER,
    ADD COLUMN is_planned BOOLEAN DEFAULT FALSE;

-- Create indexes for frequently queried fields
CREATE INDEX idx_purchase_requests_year ON purchase_requests(purchase_plan_year);
CREATE INDEX idx_purchase_requests_company ON purchase_requests(company);
CREATE INDEX idx_purchase_requests_cfo ON purchase_requests(cfo);
CREATE INDEX idx_purchase_requests_initiator ON purchase_requests(purchase_initiator);

