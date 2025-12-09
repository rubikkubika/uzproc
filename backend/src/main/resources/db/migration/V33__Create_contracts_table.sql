CREATE TABLE contracts (
    id BIGSERIAL PRIMARY KEY,
    guid UUID UNIQUE,
    inner_id VARCHAR(255),
    contract_creation_date TIMESTAMP,
    name VARCHAR(500),
    title VARCHAR(500),
    cfo VARCHAR(255),
    mcc VARCHAR(255),
    document_form VARCHAR(255),
    budget_amount NUMERIC(15, 2),
    cost_type VARCHAR(255),
    contract_type VARCHAR(255),
    contract_duration_months INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_inner_id ON contracts(inner_id);
CREATE INDEX idx_contracts_guid ON contracts(guid);
CREATE INDEX idx_contracts_contract_creation_date ON contracts(contract_creation_date);

