-- Связываем руководителя ЦФО с пользователем (таблица users).
-- leader_full_name остаётся как снимок ФИО на момент выбора (на случай удаления пользователя).

ALTER TABLE cfo_leaders
    ADD COLUMN user_id BIGINT;

ALTER TABLE cfo_leaders
    ADD CONSTRAINT fk_cfo_leaders_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_cfo_leaders_user_id ON cfo_leaders (user_id);
