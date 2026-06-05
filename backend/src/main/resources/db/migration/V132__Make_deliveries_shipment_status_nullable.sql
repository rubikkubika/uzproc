-- Статус поставки и статус оплаты теперь могут быть пустыми (поставка без выбранной схемы оплаты).
-- Снимаем NOT NULL и DEFAULT с shipment_status, чтобы при создании без схемы статус был пустым.
ALTER TABLE deliveries ALTER COLUMN shipment_status DROP NOT NULL;
ALTER TABLE deliveries ALTER COLUMN shipment_status DROP DEFAULT;
