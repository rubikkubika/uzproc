-- Добавляем поле contract_inner_id (внутренний номер договора) в таблицу purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS contract_inner_id VARCHAR(255);

-- Создаем индекс для быстрого поиска по внутреннему номеру договора
CREATE INDEX IF NOT EXISTS idx_purchases_contract_inner_id ON purchases(contract_inner_id);

-- Создаем внешний ключ для связи с contracts по inner_id (если нужно)
-- Примечание: внешний ключ не создаем, так как связь через inner_id может быть не уникальной
-- Вместо этого используем ManyToOne связь через JPA

