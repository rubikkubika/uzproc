-- Добавляем поле для хранения ID заявки на закупку
ALTER TABLE purchases
    ADD COLUMN purchase_request_id BIGINT;

-- Создаем foreign key для связи с purchase_requests
ALTER TABLE purchases
    ADD CONSTRAINT fk_purchase_request
    FOREIGN KEY (purchase_request_id)
    REFERENCES purchase_requests(id)
    ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска по заявке
CREATE INDEX idx_purchases_purchase_request_id ON purchases(purchase_request_id);

