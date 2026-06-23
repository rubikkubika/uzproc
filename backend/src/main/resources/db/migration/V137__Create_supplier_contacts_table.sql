-- Карточки контактов контрагентов (поставщиков). У одного поставщика может быть несколько карточек.
CREATE TABLE supplier_contacts (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    full_name VARCHAR(500),
    position VARCHAR(500),
    telegram VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_supplier_contact_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_supplier_contacts_supplier_id ON supplier_contacts (supplier_id);

COMMENT ON TABLE supplier_contacts IS 'Карточки контактов контрагентов (поставщиков).';
COMMENT ON COLUMN supplier_contacts.full_name IS 'ФИО';
COMMENT ON COLUMN supplier_contacts.position IS 'Должность';
COMMENT ON COLUMN supplier_contacts.telegram IS 'Telegram';
COMMENT ON COLUMN supplier_contacts.email IS 'Email';
COMMENT ON COLUMN supplier_contacts.phone IS 'Телефон';
COMMENT ON COLUMN supplier_contacts.comment IS 'Комментарий';
