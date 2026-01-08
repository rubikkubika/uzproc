-- Добавляем колонку exclude_from_in_work в таблицу purchase_requests
ALTER TABLE purchase_requests
ADD COLUMN IF NOT EXISTS exclude_from_in_work BOOLEAN DEFAULT FALSE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchase_requests_exclude_from_in_work ON purchase_requests(exclude_from_in_work);

