-- Центр отправки: сбор и хранение оценок работы закупок по спецификациям.
-- Оценка группируется по связке ЦФО + месяц (по дате синхронизации спецификаций),
-- аналог CSI-оценки на заявках, но с группировкой по набору спецификаций.

-- Приглашение на оценку: одно на связку (ЦФО, год, месяц). Хранит токен публичной ссылки,
-- получателя (руководителя ЦФО на момент отправки) и агрегаты.
CREATE TABLE specification_feedback_invitations (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    cfo_name VARCHAR(255) NOT NULL,
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    recipient VARCHAR(255),
    leader_full_name VARCHAR(512),
    specification_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_spec_feedback_inv_token UNIQUE (token),
    CONSTRAINT uk_spec_feedback_inv_cfo_period UNIQUE (cfo_name, period_year, period_month)
);
CREATE INDEX idx_spec_feedback_inv_period ON specification_feedback_invitations (period_year, period_month);
CREATE INDEX idx_spec_feedback_inv_cfo ON specification_feedback_invitations (cfo_name);

-- Снимок спецификаций, попавших в приглашение на момент отправки (группировка по спецификациям).
CREATE TABLE specification_feedback_items (
    id BIGSERIAL PRIMARY KEY,
    invitation_id BIGINT NOT NULL,
    contract_id BIGINT,
    inner_id VARCHAR(255),
    title VARCHAR(500),
    prepared_by VARCHAR(512),
    budget_amount NUMERIC(18, 2),
    currency VARCHAR(10),
    synchronization_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_spec_feedback_item_invitation
        FOREIGN KEY (invitation_id)
        REFERENCES specification_feedback_invitations (id) ON DELETE CASCADE
);
CREATE INDEX idx_spec_feedback_item_invitation ON specification_feedback_items (invitation_id);

-- Заполненная оценка: одна на приглашение (ЦФО + месяц). Две оценки + комментарий.
CREATE TABLE specification_feedback (
    id BIGSERIAL PRIMARY KEY,
    invitation_id BIGINT NOT NULL,
    speed_rating DOUBLE PRECISION CHECK (speed_rating >= 0.5 AND speed_rating <= 5.0),
    business_rating DOUBLE PRECISION CHECK (business_rating >= 0.5 AND business_rating <= 5.0),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_spec_feedback_invitation UNIQUE (invitation_id),
    CONSTRAINT fk_spec_feedback_invitation
        FOREIGN KEY (invitation_id)
        REFERENCES specification_feedback_invitations (id) ON DELETE CASCADE
);
CREATE INDEX idx_spec_feedback_invitation ON specification_feedback (invitation_id);
