-- Срок поставки (deliveryDeadline) — редактируется вручную, по умолчанию берётся из договора при создании поставки.
ALTER TABLE deliveries ADD COLUMN delivery_deadline DATE;
