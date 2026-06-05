-- Фактическая дата поставки. Задаётся при переводе статуса поставки в «Поставлено».
ALTER TABLE deliveries ADD COLUMN actual_delivery_date DATE;
