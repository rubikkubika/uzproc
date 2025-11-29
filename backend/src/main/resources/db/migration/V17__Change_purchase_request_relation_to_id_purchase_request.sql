-- Изменяем связь между purchases и purchase_requests на id_purchase_request

-- Сначала удаляем старый foreign key
ALTER TABLE purchases
    DROP CONSTRAINT IF EXISTS fk_purchase_request;

-- Обновляем purchase_request_id в purchases: заменяем id на id_purchase_request
-- Для записей, где purchase_request_id ссылается на существующую заявку
UPDATE purchases p
SET purchase_request_id = pr.id_purchase_request
FROM purchase_requests pr
WHERE p.purchase_request_id = pr.id
  AND pr.id_purchase_request IS NOT NULL;

-- Устанавливаем NULL для записей, где нет соответствующей заявки или id_purchase_request NULL
UPDATE purchases
SET purchase_request_id = NULL
WHERE purchase_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM purchase_requests pr 
    WHERE pr.id = purchases.purchase_request_id 
      AND pr.id_purchase_request IS NOT NULL
  );

-- Добавляем уникальное ограничение на id_purchase_request в purchase_requests
-- (необходимо для foreign key)
ALTER TABLE purchase_requests
    ADD CONSTRAINT unique_id_purchase_request UNIQUE (id_purchase_request);

-- Создаем новый foreign key, который ссылается на id_purchase_request вместо id
ALTER TABLE purchases
    ADD CONSTRAINT fk_purchase_request_by_id_purchase_request
    FOREIGN KEY (purchase_request_id)
    REFERENCES purchase_requests(id_purchase_request)
    ON DELETE SET NULL;

