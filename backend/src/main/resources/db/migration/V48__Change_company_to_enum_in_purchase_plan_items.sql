-- Изменяем тип колонки company с VARCHAR на VARCHAR(50) для хранения enum значений
-- Сначала обновляем существующие данные: "Узум маркет" и все варианты -> "UZUM_MARKET" (enum значение)
UPDATE purchase_plan_items
SET company = 'UZUM_MARKET'
WHERE LOWER(TRIM(company)) LIKE '%узум%маркет%'
   OR LOWER(TRIM(company)) LIKE '%uzum%market%'
   OR LOWER(TRIM(company)) = 'uzum_market'
   OR LOWER(TRIM(company)) = 'uzum market'
   OR LOWER(TRIM(company)) = 'узум маркет'
   OR LOWER(TRIM(company)) = 'узуммаркет';

-- Обновляем "Uzum Technologies" и все варианты -> "UZUM_TECHNOLOGIES"
UPDATE purchase_plan_items
SET company = 'UZUM_TECHNOLOGIES'
WHERE LOWER(TRIM(company)) LIKE '%узум%технологи%'
   OR LOWER(TRIM(company)) LIKE '%uzum%technolog%'
   OR LOWER(TRIM(company)) = 'uzum_technologies'
   OR LOWER(TRIM(company)) = 'uzum technologies'
   OR LOWER(TRIM(company)) = 'узум технологии'
   OR LOWER(TRIM(company)) = 'узумтехнологии';

-- Изменяем тип колонки
ALTER TABLE purchase_plan_items
    ALTER COLUMN company TYPE VARCHAR(50);

-- Создаем индекс для быстрого поиска по компании (будет переименован в V49)
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_company ON purchase_plan_items (company);

