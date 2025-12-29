-- Миграция для обновления статуса на "Заявка" для всех позиций плана закупок,
-- у которых есть номер заявки на закупку (purchase_request_id), но статус не установлен в "Заявка"

-- Обновляем статус на REQUEST для всех записей, где есть purchase_request_id,
-- но статус не равен REQUEST или NULL
UPDATE purchase_plan_items
SET status = 'REQUEST'
WHERE purchase_request_id IS NOT NULL
  AND (status IS NULL OR status != 'REQUEST');

-- Логируем количество обновленных записей
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % purchase plan items to REQUEST status', updated_count;
END $$;

