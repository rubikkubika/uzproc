-- Статус оплаты: К оплате, Оплата возвращена, Оплачена
-- Статус заявки: На согласовании, Отклонен, Утвержден, Черновик
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS request_status VARCHAR(50);

COMMENT ON COLUMN payments.payment_status IS 'Статус оплаты: TO_PAY, REFUNDED, PAID';
COMMENT ON COLUMN payments.request_status IS 'Статус заявки: ON_APPROVAL, REJECTED, APPROVED, DRAFT';
