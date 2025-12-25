-- Удаляем старое строковое поле cfo из всех таблиц
-- Это поле больше не используется, так как теперь используется связь через cfo_id

-- Удаляем колонку cfo из purchase_plan_items
ALTER TABLE purchase_plan_items DROP COLUMN IF EXISTS cfo;

-- Удаляем колонку cfo из purchases
ALTER TABLE purchases DROP COLUMN IF EXISTS cfo;

-- Удаляем колонку cfo из purchase_requests
ALTER TABLE purchase_requests DROP COLUMN IF EXISTS cfo;

-- Удаляем колонку cfo из contracts
ALTER TABLE contracts DROP COLUMN IF EXISTS cfo;

