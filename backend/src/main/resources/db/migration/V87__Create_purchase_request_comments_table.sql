-- Таблица комментариев заявки на закупку (тип комментария — enum по имени константы)
CREATE TABLE IF NOT EXISTS purchase_request_comments (
    id BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_request_comment_request
        FOREIGN KEY (purchase_request_id)
        REFERENCES purchase_requests(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_purchase_request_comments_request_id ON purchase_request_comments(purchase_request_id);
CREATE INDEX idx_purchase_request_comments_type ON purchase_request_comments(purchase_request_id, type);
