-- Таблица версий плана закупок
CREATE TABLE purchase_plan_versions (
    id BIGSERIAL PRIMARY KEY,
    version_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    description VARCHAR(500),
    created_by VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_year_version UNIQUE(year, version_number)
);

CREATE INDEX idx_versions_year ON purchase_plan_versions(year);
CREATE INDEX idx_versions_year_version ON purchase_plan_versions(year, version_number);
CREATE INDEX idx_versions_is_current ON purchase_plan_versions(is_current) WHERE is_current = TRUE;

-- Таблица снимков строк плана закупок в конкретной версии
CREATE TABLE purchase_plan_item_versions (
    id BIGSERIAL PRIMARY KEY,
    version_id BIGINT NOT NULL REFERENCES purchase_plan_versions(id) ON DELETE CASCADE,
    purchase_plan_item_id BIGINT REFERENCES purchase_plan_items(id) ON DELETE SET NULL,
    guid UUID,
    year INTEGER,
    company VARCHAR(50),
    cfo_id BIGINT REFERENCES cfo(id) ON DELETE SET NULL,
    purchase_subject VARCHAR(500),
    budget_amount NUMERIC(15, 2),
    contract_end_date DATE,
    request_date DATE,
    new_contract_date DATE,
    purchaser VARCHAR(255),
    product VARCHAR(500),
    has_contract BOOLEAN,
    current_ka VARCHAR(255),
    current_amount NUMERIC(15, 2),
    current_contract_amount NUMERIC(15, 2),
    current_contract_balance NUMERIC(15, 2),
    current_contract_end_date DATE,
    auto_renewal BOOLEAN,
    complexity VARCHAR(255),
    holding VARCHAR(255),
    category VARCHAR(255),
    status VARCHAR(50),
    state VARCHAR(255),
    purchase_request_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_item_versions_version_id ON purchase_plan_item_versions(version_id);
CREATE INDEX idx_item_versions_item_id ON purchase_plan_item_versions(purchase_plan_item_id);
CREATE INDEX idx_item_versions_year ON purchase_plan_item_versions(year);






