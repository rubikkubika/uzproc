-- «Проверено закупщиком» у позиции драфта плана закупок: галочка, кто и когда её поставил (или снял).
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS purchaser_checked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS purchaser_checked_at TIMESTAMP;
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS purchaser_checked_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_plan_items.purchaser_checked IS 'Позиция драфта проверена закупщиком';
COMMENT ON COLUMN purchase_plan_items.purchaser_checked_at IS 'Когда последний раз ставили или снимали отметку «Проверено закупщиком»';
COMMENT ON COLUMN purchase_plan_items.purchaser_checked_by_id IS 'Кто последний раз ставил или снимал отметку «Проверено закупщиком»';

-- «Глазик» (исключение из планирования): кто и когда последний раз исключил позицию или вернул её в план.
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS excluded_from_planning_at TIMESTAMP;
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS excluded_from_planning_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_plan_items.excluded_from_planning_at IS 'Когда последний раз исключали позицию из планирования или возвращали в план';
COMMENT ON COLUMN purchase_plan_items.excluded_from_planning_by_id IS 'Кто последний раз исключал позицию из планирования или возвращал в план';

-- Автор изменения в истории изменений позиций плана (NULL — изменение без пользователя: импорт, синхронизация).
ALTER TABLE purchase_plan_item_changes ADD COLUMN IF NOT EXISTS changed_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN purchase_plan_item_changes.changed_by_id IS 'Пользователь, внёсший изменение';
