-- Связь позиций плана закупок с поставщиками (контрагентами), многие-ко-многим.
-- Привязка контрагентов к строке плана закупок через модальное окно.
CREATE TABLE purchase_plan_item_suppliers (
    id BIGSERIAL PRIMARY KEY,
    purchase_plan_item_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ppi_supplier_item
        FOREIGN KEY (purchase_plan_item_id)
        REFERENCES purchase_plan_items(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ppi_supplier_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_ppi_supplier UNIQUE (purchase_plan_item_id, supplier_id)
);

CREATE INDEX idx_ppi_suppliers_item_id ON purchase_plan_item_suppliers (purchase_plan_item_id);
CREATE INDEX idx_ppi_suppliers_supplier_id ON purchase_plan_item_suppliers (supplier_id);

COMMENT ON TABLE purchase_plan_item_suppliers IS 'Связь позиций плана закупок с поставщиками (контрагентами).';
