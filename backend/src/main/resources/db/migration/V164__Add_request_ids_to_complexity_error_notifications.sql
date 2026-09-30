-- «Ошибка сложности» строится от заявок (а не от закупок): в журнал отправок пишем ID заявок.
-- request_ids — ID заявок (purchase_requests.id) из письма через запятую; по ним считается «+N новых».
-- purchase_ids — теперь ID связанных закупок (purchases.id) из письма, если они есть; может быть пустым.
ALTER TABLE complexity_error_notifications ADD COLUMN IF NOT EXISTS request_ids TEXT;
ALTER TABLE complexity_error_notifications ALTER COLUMN purchase_ids DROP NOT NULL;

COMMENT ON COLUMN complexity_error_notifications.request_ids IS 'ID заявок (purchase_requests.id) из письма через запятую — по ним считается «+N новых»';
COMMENT ON COLUMN complexity_error_notifications.purchase_ids IS 'ID связанных закупок (purchases.id) из письма через запятую, если есть';
COMMENT ON COLUMN complexity_error_notifications.purchase_count IS 'Количество заявок в письме';
COMMENT ON COLUMN complexity_error_notifications.year IS 'Год заявок (по дате создания заявки)';
COMMENT ON TABLE complexity_error_notifications IS 'Отправленные уведомления «Ошибка сложности»: заявки года без сложности, запрос в поддержку 1С';
