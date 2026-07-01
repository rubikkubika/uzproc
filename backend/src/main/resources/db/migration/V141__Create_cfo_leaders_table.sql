-- Руководители ЦФО: ФИО руководителя для каждого ЦФО.
-- Список ЦФО формируется из существующих сущностей (заявки, закупки, договоры),
-- в этой таблице хранится только привязка ЦФО -> ФИО руководителя.

CREATE TABLE cfo_leaders (
    id BIGSERIAL PRIMARY KEY,
    cfo_name VARCHAR(255) NOT NULL,
    leader_full_name VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cfo_leaders_cfo_name UNIQUE (cfo_name)
);

CREATE INDEX idx_cfo_leaders_cfo_name ON cfo_leaders (cfo_name);
