-- Журнал уведомлений «Ошибка сложности» (Центр отправки → Закупки):
-- закупщику уходит письмо со списком закупок года без сложности и просьбой создать запрос в поддержку 1С.
-- Одна запись на одно отправленное письмо; в UI по закупщику показывается последняя отправка за год.
CREATE TABLE IF NOT EXISTS complexity_error_notifications (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    purchaser_key VARCHAR(255) NOT NULL,
    purchaser_name VARCHAR(512),
    recipient_email VARCHAR(255) NOT NULL,
    cc_emails VARCHAR(1000),
    purchase_ids TEXT NOT NULL,
    purchase_count INTEGER NOT NULL,
    sent_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    sent_by_name VARCHAR(512),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complexity_error_notifications_year_key
    ON complexity_error_notifications (year, purchaser_key);

COMMENT ON TABLE complexity_error_notifications IS 'Отправленные уведомления «Ошибка сложности»: закупки года без сложности, запрос в поддержку 1С';
COMMENT ON COLUMN complexity_error_notifications.year IS 'Год закупок (по дате создания закупки)';
COMMENT ON COLUMN complexity_error_notifications.purchaser_key IS 'Нормализованное ФИО закупщика из заявки (нижний регистр, без должности в скобках)';
COMMENT ON COLUMN complexity_error_notifications.purchaser_name IS 'ФИО закупщика на момент отправки';
COMMENT ON COLUMN complexity_error_notifications.recipient_email IS 'Адрес закупщика, на который ушло письмо';
COMMENT ON COLUMN complexity_error_notifications.cc_emails IS 'Адреса в копии через запятую';
COMMENT ON COLUMN complexity_error_notifications.purchase_ids IS 'ID закупок (purchases.id) из письма через запятую';
COMMENT ON COLUMN complexity_error_notifications.sent_by_user_id IS 'Кто отправил (пользователь системы)';
