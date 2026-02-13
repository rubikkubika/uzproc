-- Связь оплаты с договором (заголовок договора извлекается из комментария при загрузке Excel)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS contract_id BIGINT NULL REFERENCES contracts(id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
