-- Ответственный (User)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS responsible_id BIGINT REFERENCES users(id);

COMMENT ON COLUMN payments.responsible_id IS 'Ответственный (User)';

CREATE INDEX IF NOT EXISTS idx_payments_responsible_id ON payments(responsible_id);
