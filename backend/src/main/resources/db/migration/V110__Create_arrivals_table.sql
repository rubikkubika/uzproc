CREATE TABLE arrivals (
    id BIGSERIAL PRIMARY KEY,
    date DATE,
    number VARCHAR(255),
    supplier_id BIGINT REFERENCES suppliers(id),
    invoice VARCHAR(500),
    warehouse VARCHAR(500),
    operation_type VARCHAR(500),
    department VARCHAR(500),
    incoming_date DATE,
    incoming_number VARCHAR(255),
    comment TEXT,
    responsible_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_arrivals_number ON arrivals(number) WHERE number IS NOT NULL;
CREATE INDEX idx_arrivals_supplier_id ON arrivals(supplier_id);
CREATE INDEX idx_arrivals_responsible_id ON arrivals(responsible_id);
CREATE INDEX idx_arrivals_date ON arrivals(date);
