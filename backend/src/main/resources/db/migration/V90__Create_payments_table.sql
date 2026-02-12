-- Таблица оплат (загрузка из Excel папки payments)
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    amount NUMERIC(15, 2),
    cfo_id BIGINT REFERENCES cfo(id),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_cfo_id ON payments(cfo_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
