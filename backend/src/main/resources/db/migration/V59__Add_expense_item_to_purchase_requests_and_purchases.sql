-- Добавляем поле expense_item (статья расходов) в таблицу purchase_requests
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS expense_item VARCHAR(255);

-- Добавляем поле expense_item (статья расходов) в таблицу purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expense_item VARCHAR(255);

