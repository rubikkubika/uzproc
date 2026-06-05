-- Схема оплаты. Парсинг из колонки "Схема оплаты (Договор)" в Excel.
ALTER TABLE contracts ADD COLUMN payment_scheme VARCHAR(2000);

-- Срок поставки. Парсинг из колонки "Срок поставки (Договор)" в Excel.
ALTER TABLE contracts ADD COLUMN delivery_term VARCHAR(2000);

COMMENT ON COLUMN contracts.payment_scheme IS 'Схема оплаты. Парсинг из колонки "Схема оплаты (Договор)" в Excel.';
COMMENT ON COLUMN contracts.delivery_term IS 'Срок поставки. Парсинг из колонки "Срок поставки (Договор)" в Excel.';
