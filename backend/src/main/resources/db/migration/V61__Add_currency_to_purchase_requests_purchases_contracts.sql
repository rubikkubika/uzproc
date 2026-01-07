-- Добавление колонки currency в таблицы purchase_requests, purchases и contracts

ALTER TABLE purchase_requests ADD COLUMN currency VARCHAR(10);

ALTER TABLE purchases ADD COLUMN currency VARCHAR(10);

ALTER TABLE contracts ADD COLUMN currency VARCHAR(10);

