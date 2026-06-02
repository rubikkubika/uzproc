CREATE TABLE deliveries (
    id BIGSERIAL PRIMARY KEY,
    inner_id VARCHAR(255),
    date DATE,
    contract_id BIGINT REFERENCES contracts(id),
    supplier_id BIGINT REFERENCES suppliers(id),
    amount NUMERIC(18, 2),
    currency VARCHAR(10),
    status VARCHAR(50),
    comment TEXT,
    responsible_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_inner_id ON deliveries(inner_id);
CREATE INDEX idx_deliveries_contract_id ON deliveries(contract_id);
CREATE INDEX idx_deliveries_supplier_id ON deliveries(supplier_id);
CREATE INDEX idx_deliveries_responsible_id ON deliveries(responsible_id);
CREATE INDEX idx_deliveries_date ON deliveries(date);
