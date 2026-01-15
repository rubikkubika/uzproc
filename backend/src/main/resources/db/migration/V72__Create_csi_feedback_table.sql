-- Создание таблицы для обратной связи CSI (Customer Satisfaction Index)
CREATE TABLE IF NOT EXISTS csi_feedback (
    id BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL,
    used_uzproc BOOLEAN,
    uzproc_rating DOUBLE PRECISION CHECK (uzproc_rating >= 0.5 AND uzproc_rating <= 5.0),
    speed_rating DOUBLE PRECISION CHECK (speed_rating >= 0.5 AND speed_rating <= 5.0),
    quality_rating DOUBLE PRECISION CHECK (quality_rating >= 0.5 AND quality_rating <= 5.0),
    satisfaction_rating DOUBLE PRECISION CHECK (satisfaction_rating >= 0.5 AND satisfaction_rating <= 5.0),
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_csi_feedback_purchase_request 
        FOREIGN KEY (purchase_request_id) 
        REFERENCES purchase_requests(id) 
        ON DELETE CASCADE
);

-- Индекс для быстрого поиска обратной связи по заявке
CREATE INDEX idx_csi_feedback_purchase_request_id ON csi_feedback(purchase_request_id);

-- Индекс для сортировки по дате создания
CREATE INDEX idx_csi_feedback_created_at ON csi_feedback(created_at DESC);
