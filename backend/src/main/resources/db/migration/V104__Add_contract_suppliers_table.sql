-- Связь договоров с поставщиками (многие-ко-многим). Парсинг из колонки "Контрагенты".
CREATE TABLE contract_suppliers (
    contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    PRIMARY KEY (contract_id, supplier_id)
);

CREATE INDEX idx_contract_suppliers_contract_id ON contract_suppliers (contract_id);
CREATE INDEX idx_contract_suppliers_supplier_id ON contract_suppliers (supplier_id);

COMMENT ON TABLE contract_suppliers IS 'Связь договоров с поставщиками (контрагентами). Парсинг из колонки "Контрагенты" в Excel.';
