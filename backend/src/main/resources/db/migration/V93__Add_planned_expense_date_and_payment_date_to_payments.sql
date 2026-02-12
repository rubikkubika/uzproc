-- Дата расхода (план) и Дата оплаты
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS planned_expense_date DATE,
    ADD COLUMN IF NOT EXISTS payment_date DATE;

COMMENT ON COLUMN payments.planned_expense_date IS 'Дата расхода (план)';
COMMENT ON COLUMN payments.payment_date IS 'Дата оплаты';
