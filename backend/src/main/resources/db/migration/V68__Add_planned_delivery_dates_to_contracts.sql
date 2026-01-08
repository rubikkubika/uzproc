-- Добавляем колонки для плановых дат поставки в таблицу contracts
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS planned_delivery_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS planned_delivery_end_date TIMESTAMP;

-- Создаем индексы для быстрого поиска по датам
CREATE INDEX IF NOT EXISTS idx_contracts_planned_delivery_start_date ON contracts(planned_delivery_start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_planned_delivery_end_date ON contracts(planned_delivery_end_date);

