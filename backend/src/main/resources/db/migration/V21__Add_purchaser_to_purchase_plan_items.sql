-- Add purchaser column to purchase_plan_items table
ALTER TABLE purchase_plan_items 
ADD COLUMN purchaser VARCHAR(255);

-- Индекс для быстрого поиска по закупщику
CREATE INDEX idx_purchase_plan_items_purchaser ON purchase_plan_items(purchaser);

