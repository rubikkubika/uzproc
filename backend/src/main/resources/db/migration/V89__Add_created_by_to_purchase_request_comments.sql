-- Добавляем автора комментария (пользователь, который добавил комментарий)
ALTER TABLE purchase_request_comments
    ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;

ALTER TABLE purchase_request_comments
    ADD CONSTRAINT fk_purchase_request_comment_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_request_comments_created_by ON purchase_request_comments(created_by);
