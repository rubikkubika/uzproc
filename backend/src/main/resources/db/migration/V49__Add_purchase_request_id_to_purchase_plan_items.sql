-- Добавляем поле для хранения ID заявки на закупку
ALTER TABLE purchase_plan_items
    ADD COLUMN purchase_request_id BIGINT;

-- Создаем foreign key для связи с purchase_requests
ALTER TABLE purchase_plan_items
    ADD CONSTRAINT fk_purchase_plan_item_purchase_request
    FOREIGN KEY (purchase_request_id)
    REFERENCES purchase_requests(id_purchase_request)
    ON DELETE SET NULL;

-- Создаем индекс для быстрого поиска по заявке
CREATE INDEX idx_purchase_plan_items_purchase_request_id ON purchase_plan_items(purchase_request_id);

