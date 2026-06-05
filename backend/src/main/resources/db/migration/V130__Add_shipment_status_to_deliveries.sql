-- Статус поставки (фактическая отгрузка), задаётся вручную. Не путать со status (статус оплаты).
ALTER TABLE deliveries ADD COLUMN shipment_status VARCHAR(50) NOT NULL DEFAULT 'EXPECTED';
