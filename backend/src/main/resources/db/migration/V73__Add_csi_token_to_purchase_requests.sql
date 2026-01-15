-- Добавление поля csi_token в таблицу purchase_requests для уникальной ссылки на форму обратной связи
ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS csi_token VARCHAR(255);

-- Создание уникального индекса для csi_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_requests_csi_token ON purchase_requests(csi_token) WHERE csi_token IS NOT NULL;

-- Генерация токенов для существующих заявок, у которых токен еще не установлен
UPDATE purchase_requests 
SET csi_token = gen_random_uuid()::text 
WHERE csi_token IS NULL OR csi_token = '';
