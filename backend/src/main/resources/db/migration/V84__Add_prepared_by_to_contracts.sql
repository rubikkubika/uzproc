-- Добавление поля prepared_by_id в таблицу contracts
-- Это поле ссылается на пользователя с признаком isContractor, который подготовил договор

ALTER TABLE contracts
ADD COLUMN prepared_by_id BIGINT;

-- Добавляем foreign key на таблицу users
ALTER TABLE contracts
ADD CONSTRAINT fk_contracts_prepared_by
FOREIGN KEY (prepared_by_id) REFERENCES users(id);

-- Добавляем индекс для ускорения поиска по prepared_by_id
CREATE INDEX idx_contracts_prepared_by_id ON contracts(prepared_by_id);
