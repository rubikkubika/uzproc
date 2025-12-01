-- Create purchase_plan_items table
CREATE TABLE purchase_plan_items (
    id BIGSERIAL PRIMARY KEY,
    guid UUID UNIQUE,
    year INTEGER,
    company VARCHAR(255),
    cfo VARCHAR(255),
    purchase_subject VARCHAR(500),
    budget_amount NUMERIC(15, 2),
    contract_end_date DATE,
    request_date DATE,
    new_contract_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_purchase_plan_items_guid ON purchase_plan_items(guid);
CREATE INDEX idx_purchase_plan_items_year ON purchase_plan_items(year);
CREATE INDEX idx_purchase_plan_items_company ON purchase_plan_items(company);
CREATE INDEX idx_purchase_plan_items_cfo ON purchase_plan_items(cfo);
CREATE INDEX idx_purchase_plan_items_purchase_subject ON purchase_plan_items(purchase_subject);

