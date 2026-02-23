-- Источник изменения: PARSING (парсинг Excel) или USER (действие пользователя)
ALTER TABLE purchase_request_changes
    ADD COLUMN IF NOT EXISTS change_source VARCHAR(50);

-- Кто изменил: "Система (парсинг)" или ФИО/логин пользователя
ALTER TABLE purchase_request_changes
    ADD COLUMN IF NOT EXISTS changed_by_display_name VARCHAR(255);

COMMENT ON COLUMN purchase_request_changes.change_source IS 'PARSING | USER';
COMMENT ON COLUMN purchase_request_changes.changed_by_display_name IS 'Система (парсинг) или отображаемое имя пользователя';
