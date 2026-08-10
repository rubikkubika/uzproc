-- Контрагент оплаты (колонка "Контрагент" в Excel выгрузке оплат)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS counterparty VARCHAR(500);

COMMENT ON COLUMN payments.counterparty IS 'Контрагент оплаты (из колонки "Контрагент" Excel)';

CREATE INDEX IF NOT EXISTS idx_payments_counterparty ON payments (counterparty);
