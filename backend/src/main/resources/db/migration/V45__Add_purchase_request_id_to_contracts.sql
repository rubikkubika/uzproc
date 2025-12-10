-- Добавляем поле для хранения ID заявки на закупку в таблицу contracts
ALTER TABLE contracts
    ADD COLUMN purchase_request_id BIGINT;

-- Создаем foreign key для связи с purchase_requests по id_purchase_request
ALTER TABLE contracts
    ADD CONSTRAINT fk_contract_purchase_request
    FOREIGN KEY (purchase_request_id)
    REFERENCES purchase_requests(id_purchase_request)
    ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска по заявке
CREATE INDEX idx_contracts_purchase_request_id ON contracts(purchase_request_id);

