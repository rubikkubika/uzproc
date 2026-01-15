-- Создание таблицы для хранения приглашений на обратную связь
CREATE TABLE IF NOT EXISTS csi_feedback_invitations (
    id BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    csi_feedback_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitation_purchase_request 
        FOREIGN KEY (purchase_request_id) 
        REFERENCES purchase_requests(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_invitation_csi_feedback 
        FOREIGN KEY (csi_feedback_id) 
        REFERENCES csi_feedback(id) 
        ON DELETE SET NULL
);

-- Индекс для быстрого поиска приглашения по заявке и получателю
CREATE INDEX IF NOT EXISTS idx_invitation_purchase_request_recipient 
    ON csi_feedback_invitations(purchase_request_id, recipient);

-- Индекс для поиска по обратной связи
CREATE INDEX IF NOT EXISTS idx_invitation_csi_feedback 
    ON csi_feedback_invitations(csi_feedback_id) 
    WHERE csi_feedback_id IS NOT NULL;
