-- Добавляем колонку purchaser_company (Компания закупщик) в purchase_plan_item_versions
ALTER TABLE purchase_plan_item_versions
ADD COLUMN IF NOT EXISTS purchaser_company VARCHAR(50);

-- Создаем индекс для быстрого поиска по компании закупщика
CREATE INDEX IF NOT EXISTS idx_purchase_plan_item_versions_purchaser_company ON purchase_plan_item_versions(purchaser_company);
