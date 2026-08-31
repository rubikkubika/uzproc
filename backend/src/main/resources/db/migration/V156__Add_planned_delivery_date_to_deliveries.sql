-- Плановая дата поставки: по умолчанию совпадает с дедлайном поставки,
-- но может быть изменена вручную. Признак ручного изменения защищает дату
-- от перезаписи при автоматических пересчётах (в том числе при старте приложения).
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS planned_delivery_date DATE;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS planned_delivery_date_manual BOOLEAN NOT NULL DEFAULT FALSE;

-- Бэкфилл: у существующих поставок плановая дата = дедлайн (ручных изменений ещё не было).
UPDATE deliveries SET planned_delivery_date = delivery_deadline WHERE planned_delivery_date IS NULL;

COMMENT ON COLUMN deliveries.planned_delivery_date IS 'Плановая дата поставки. По умолчанию = delivery_deadline.';
COMMENT ON COLUMN deliveries.planned_delivery_date_manual IS 'true — дату задали вручную, автоматические пересчёты её не меняют.';

CREATE INDEX IF NOT EXISTS idx_deliveries_planned_delivery_date ON deliveries (planned_delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_actual_delivery_date ON deliveries (actual_delivery_date);
