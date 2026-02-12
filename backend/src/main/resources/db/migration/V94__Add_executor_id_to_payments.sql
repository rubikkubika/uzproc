-- Исполнитель (User)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS executor_id BIGINT REFERENCES users(id);

COMMENT ON COLUMN payments.executor_id IS 'Исполнитель (User)';

CREATE INDEX IF NOT EXISTS idx_payments_executor_id ON payments(executor_id);
