-- Добавляем поле "Тип оплаты" в payments: Аванс (ADVANCE) / По факту (FACT)
ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20);

CREATE INDEX idx_payments_payment_type ON payments(payment_type);
