-- Add additional fields to purchase_plan_items table
ALTER TABLE purchase_plan_items 
ADD COLUMN product VARCHAR(500),
ADD COLUMN has_contract BOOLEAN,
ADD COLUMN current_ka VARCHAR(255),
ADD COLUMN current_amount NUMERIC(15, 2),
ADD COLUMN current_contract_amount NUMERIC(15, 2),
ADD COLUMN current_contract_balance NUMERIC(15, 2),
ADD COLUMN current_contract_end_date DATE,
ADD COLUMN auto_renewal BOOLEAN,
ADD COLUMN complexity VARCHAR(255),
ADD COLUMN holding VARCHAR(255);

-- Индексы для быстрого поиска
CREATE INDEX idx_purchase_plan_items_product ON purchase_plan_items(product);
CREATE INDEX idx_purchase_plan_items_has_contract ON purchase_plan_items(has_contract);
CREATE INDEX idx_purchase_plan_items_holding ON purchase_plan_items(holding);

