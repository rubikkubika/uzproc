-- Создание таблицы для комментариев плана закупок
CREATE TABLE IF NOT EXISTS purchase_plan_item_comments (
    id BIGSERIAL PRIMARY KEY,
    purchase_plan_item_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    author_id BIGINT,
    author_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_plan_item_comment_item 
        FOREIGN KEY (purchase_plan_item_id) 
        REFERENCES purchase_plan_items(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_plan_item_comment_author 
        FOREIGN KEY (author_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Индекс для быстрого поиска комментариев по элементу плана
CREATE INDEX idx_purchase_plan_item_comments_item_id ON purchase_plan_item_comments(purchase_plan_item_id);

-- Индекс для фильтрации публичных комментариев
CREATE INDEX idx_purchase_plan_item_comments_public ON purchase_plan_item_comments(purchase_plan_item_id, is_public);
