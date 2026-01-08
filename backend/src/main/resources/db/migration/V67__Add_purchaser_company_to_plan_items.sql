-- Добавляем колонку purchaser_company (Компания закупщик) в purchase_plan_items
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS purchaser_company VARCHAR(50);

-- Заполняем purchaser_company значением из company (Компания заказчик) для существующих записей
-- Это делается один раз при первой загрузке
UPDATE purchase_plan_items
SET purchaser_company = company
WHERE purchaser_company IS NULL AND company IS NOT NULL;

-- Создаем индекс для быстрого поиска по компании закупщика
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_purchaser_company ON purchase_plan_items(purchaser_company);

