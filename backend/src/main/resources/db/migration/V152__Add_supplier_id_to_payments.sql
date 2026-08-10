-- Связь оплаты с контрагентом (suppliers) — сопоставление по ИНН из Excel выгрузки оплат
ALTER TABLE payments ADD COLUMN IF NOT EXISTS supplier_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payments_supplier' AND table_name = 'payments'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT fk_payments_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id);
    END IF;
END $$;

COMMENT ON COLUMN payments.supplier_id IS 'Контрагент оплаты из справочника suppliers (сопоставление по ИНН)';

CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments (supplier_id);
