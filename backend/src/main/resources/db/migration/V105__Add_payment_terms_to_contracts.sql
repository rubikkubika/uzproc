-- Условия оплаты. Парсинг из колонки "График оплаты (Договор)" в Excel.
ALTER TABLE contracts ADD COLUMN payment_terms VARCHAR(2000);

COMMENT ON COLUMN contracts.payment_terms IS 'Условия оплаты. Парсинг из колонки "График оплаты (Договор)" в Excel.';
