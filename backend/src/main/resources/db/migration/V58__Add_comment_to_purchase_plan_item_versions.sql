-- Добавляем поле комментарий в таблицу purchase_plan_item_versions
ALTER TABLE purchase_plan_item_versions
ADD COLUMN IF NOT EXISTS comment TEXT;

