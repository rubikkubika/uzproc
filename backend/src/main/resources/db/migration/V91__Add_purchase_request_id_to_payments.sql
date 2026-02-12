-- Связь оплаты с заявкой на закупку (по парсингу комментария "N 1898")
ALTER TABLE payments
ADD COLUMN purchase_request_id BIGINT REFERENCES purchase_requests(id);

CREATE INDEX IF NOT EXISTS idx_payments_purchase_request_id ON payments(purchase_request_id);

COMMENT ON COLUMN payments.purchase_request_id IS 'Заявка на закупку, извлечённая из комментария (например: N 1898)';
