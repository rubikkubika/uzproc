-- Создаем промежуточную таблицу для связи многие-ко-многим между purchases и contracts
-- Связь осуществляется через внутренний номер договора (contract_inner_id)
-- Таблица будет использоваться с @ElementCollection в JPA
CREATE TABLE IF NOT EXISTS purchase_contracts (
    purchase_id BIGINT NOT NULL,
    contract_inner_id VARCHAR(255) NOT NULL,
    CONSTRAINT fk_purchase_contracts_purchase 
        FOREIGN KEY (purchase_id) 
        REFERENCES purchases(id) 
        ON DELETE CASCADE,
    CONSTRAINT uk_purchase_contracts_unique 
        UNIQUE (purchase_id, contract_inner_id)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_purchase_id ON purchase_contracts(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_contract_inner_id ON purchase_contracts(contract_inner_id);

-- Миграция данных: переносим существующие связи из поля contract_inner_id в purchases
-- в новую таблицу purchase_contracts
INSERT INTO purchase_contracts (purchase_id, contract_inner_id)
SELECT id, contract_inner_id
FROM purchases
WHERE contract_inner_id IS NOT NULL 
  AND contract_inner_id != ''
  AND contract_inner_id != inner_id  -- Исключаем случаи, когда contract_inner_id совпадает с inner_id закупки
ON CONFLICT (purchase_id, contract_inner_id) DO NOTHING;

