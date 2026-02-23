-- Плановый СЛА (рабочих дней) по сложности: 1→3, 2→7, 3→15, 4→30. Обновляется при обновлении заявки.
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS planned_sla_days INTEGER;

-- Заполняем из текущей сложности для существующих записей
UPDATE purchase_requests
SET planned_sla_days = CASE trim(complexity)
    WHEN '1' THEN 3
    WHEN '2' THEN 7
    WHEN '3' THEN 15
    WHEN '4' THEN 30
    ELSE NULL
END
WHERE complexity IS NOT NULL AND trim(complexity) != '';
