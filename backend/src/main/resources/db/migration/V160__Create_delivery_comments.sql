-- Комментарии к поставке: у поставки может быть много комментариев (автор, дата, текст)
CREATE TABLE IF NOT EXISTS delivery_comments (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_delivery_comment_delivery
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_comment_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_comments_delivery_id ON delivery_comments(delivery_id);

-- Переносим единственный комментарий поставки (из ручного отчёта) в новую таблицу — без автора
INSERT INTO delivery_comments (delivery_id, text, created_at, updated_at)
SELECT id, TRIM(comment), COALESCE(updated_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM deliveries
WHERE comment IS NOT NULL AND TRIM(comment) <> '';

ALTER TABLE deliveries DROP COLUMN IF EXISTS comment;
