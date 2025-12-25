-- Добавляем поле cfo_id во все таблицы
ALTER TABLE purchase_plan_items ADD COLUMN cfo_id BIGINT;
ALTER TABLE purchases ADD COLUMN cfo_id BIGINT;
ALTER TABLE purchase_requests ADD COLUMN cfo_id BIGINT;
ALTER TABLE contracts ADD COLUMN cfo_id BIGINT;

-- Заполняем cfo_id на основе строкового поля cfo
-- Для purchase_plan_items
UPDATE purchase_plan_items ppi
SET cfo_id = (
    SELECT c.id 
    FROM cfo c 
    WHERE TRIM(ppi.cfo) = c.name
)
WHERE ppi.cfo IS NOT NULL AND TRIM(ppi.cfo) != '';

-- Для purchases
UPDATE purchases p
SET cfo_id = (
    SELECT c.id 
    FROM cfo c 
    WHERE TRIM(p.cfo) = c.name
)
WHERE p.cfo IS NOT NULL AND TRIM(p.cfo) != '';

-- Для purchase_requests
UPDATE purchase_requests pr
SET cfo_id = (
    SELECT c.id 
    FROM cfo c 
    WHERE TRIM(pr.cfo) = c.name
)
WHERE pr.cfo IS NOT NULL AND TRIM(pr.cfo) != '';

-- Для contracts
UPDATE contracts ct
SET cfo_id = (
    SELECT c.id 
    FROM cfo c 
    WHERE TRIM(ct.cfo) = c.name
)
WHERE ct.cfo IS NOT NULL AND TRIM(ct.cfo) != '';

-- Создаем foreign key constraints
ALTER TABLE purchase_plan_items
    ADD CONSTRAINT fk_purchase_plan_item_cfo
    FOREIGN KEY (cfo_id)
    REFERENCES cfo(id)
    ON DELETE SET NULL;

ALTER TABLE purchases
    ADD CONSTRAINT fk_purchase_cfo
    FOREIGN KEY (cfo_id)
    REFERENCES cfo(id)
    ON DELETE SET NULL;

ALTER TABLE purchase_requests
    ADD CONSTRAINT fk_purchase_request_cfo
    FOREIGN KEY (cfo_id)
    REFERENCES cfo(id)
    ON DELETE SET NULL;

ALTER TABLE contracts
    ADD CONSTRAINT fk_contract_cfo
    FOREIGN KEY (cfo_id)
    REFERENCES cfo(id)
    ON DELETE SET NULL;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_cfo_id ON purchase_plan_items(cfo_id);
CREATE INDEX IF NOT EXISTS idx_purchases_cfo_id ON purchases(cfo_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_cfo_id ON purchase_requests(cfo_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cfo_id ON contracts(cfo_id);

