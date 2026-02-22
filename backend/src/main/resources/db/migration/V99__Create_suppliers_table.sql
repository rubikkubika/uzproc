-- Таблица поставщиков (загрузка из Excel: frontend/upload/suppliers)
CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(255),
    kpp VARCHAR(50),
    inn VARCHAR(50),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_suppliers_code ON suppliers (code);
CREATE INDEX idx_suppliers_inn ON suppliers (inn);
CREATE INDEX idx_suppliers_name ON suppliers (name);

COMMENT ON TABLE suppliers IS 'Поставщики, загружаются из Excel (frontend/upload/suppliers)';
COMMENT ON COLUMN suppliers.type IS 'Вид (из колонки Вид)';
COMMENT ON COLUMN suppliers.kpp IS 'КПП';
COMMENT ON COLUMN suppliers.inn IS 'ИНН';
COMMENT ON COLUMN suppliers.code IS 'Код (уникальный идентификатор из Excel)';
COMMENT ON COLUMN suppliers.name IS 'Наименование';
