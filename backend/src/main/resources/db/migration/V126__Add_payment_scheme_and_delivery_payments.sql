ALTER TABLE deliveries
    ADD COLUMN IF NOT EXISTS payment_scheme VARCHAR(20);

CREATE TABLE IF NOT EXISTS delivery_payments (
    delivery_id BIGINT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    PRIMARY KEY (delivery_id, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_payments_payment_id ON delivery_payments(payment_id);
