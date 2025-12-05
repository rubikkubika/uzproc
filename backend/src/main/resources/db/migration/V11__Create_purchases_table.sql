-- Create purchases table
CREATE TABLE purchases (
    id BIGSERIAL PRIMARY KEY,
    guid UUID UNIQUE,
    purchase_number BIGINT,
    purchase_creation_date TIMESTAMP,
    inner_id VARCHAR(255),
    name VARCHAR(500),
    title VARCHAR(500),
    cfo VARCHAR(255),
    mcc VARCHAR(255),
    purchase_initiator VARCHAR(255),
    purchase_subject VARCHAR(500),
    budget_amount NUMERIC(15, 2),
    cost_type VARCHAR(255),
    contract_type VARCHAR(255),
    contract_duration_months INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_number ON purchases(purchase_number);
CREATE INDEX idx_purchases_creation_date ON purchases(purchase_creation_date);
CREATE INDEX idx_purchases_cfo ON purchases(cfo);





