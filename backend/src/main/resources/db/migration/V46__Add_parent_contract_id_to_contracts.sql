-- Добавляем поле для хранения ID основного договора (для спецификаций)
ALTER TABLE contracts
    ADD COLUMN parent_contract_id BIGINT;

-- Создаем foreign key для связи с основным договором
ALTER TABLE contracts
    ADD CONSTRAINT fk_contract_parent_contract
    FOREIGN KEY (parent_contract_id)
    REFERENCES contracts(id)
    ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска по основному договору
CREATE INDEX idx_contracts_parent_contract_id ON contracts(parent_contract_id);

