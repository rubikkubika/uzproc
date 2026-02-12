-- Основной номер оплаты (из колонки "Номер" в Excel), уникальный для дедупликации при загрузке
ALTER TABLE payments ADD COLUMN IF NOT EXISTS main_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_main_id ON payments(main_id) WHERE main_id IS NOT NULL;
COMMENT ON COLUMN payments.main_id IS 'Основной номер оплаты (колонка Номер в Excel), уникальный идентификатор для обновления при повторной загрузке';
