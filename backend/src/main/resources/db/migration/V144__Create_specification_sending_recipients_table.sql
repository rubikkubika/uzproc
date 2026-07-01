-- Центр отправки: получатель письма по спецификациям для ЦФО.
-- По умолчанию — руководитель ЦФО (из cfo_leaders), но его можно переопределить в Центре отправки.
-- Наличие записи означает, что выбран НЕ руководитель ЦФО (переопределение).

CREATE TABLE specification_sending_recipients (
    id BIGSERIAL PRIMARY KEY,
    cfo_name VARCHAR(255) NOT NULL,
    user_id BIGINT,
    full_name VARCHAR(512),
    email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_spec_sending_recipient_cfo UNIQUE (cfo_name),
    CONSTRAINT fk_spec_sending_recipient_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_spec_sending_recipient_cfo ON specification_sending_recipients (cfo_name);
