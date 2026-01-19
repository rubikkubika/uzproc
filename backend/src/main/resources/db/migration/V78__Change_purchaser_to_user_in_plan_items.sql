-- Изменяем поле purchaser в purchase_plan_items с enum на связь с users
-- Конвертируем существующие значения enum в user_id

-- 1. Добавляем новую колонку purchaser_id
ALTER TABLE purchase_plan_items 
ADD COLUMN IF NOT EXISTS purchaser_id BIGINT;

-- 2. Создаем временную функцию для поиска пользователя по фамилии и имени
DO $$
DECLARE
    nastya_user_id BIGINT;
    abdulaziz_user_id BIGINT;
    elena_user_id BIGINT;
BEGIN
    -- Ищем пользователей по фамилии и имени
    -- Настя -> Иссакова Настя
    SELECT id INTO nastya_user_id 
    FROM users 
    WHERE LOWER(TRIM(surname)) = LOWER('Иссакова') 
      AND LOWER(TRIM(name)) = LOWER('Настя')
    LIMIT 1;
    
    -- Абдулазиз -> Акбаров Абдулазиз
    SELECT id INTO abdulaziz_user_id 
    FROM users 
    WHERE LOWER(TRIM(surname)) = LOWER('Акбаров') 
      AND LOWER(TRIM(name)) = LOWER('Абдулазиз')
    LIMIT 1;
    
    -- Елена -> Шакирова Елена
    SELECT id INTO elena_user_id 
    FROM users 
    WHERE LOWER(TRIM(surname)) = LOWER('Шакирова') 
      AND LOWER(TRIM(name)) = LOWER('Елена')
    LIMIT 1;
    
    -- Обновляем purchaser_id на основе старых значений purchaser
    -- NASTYA -> nastya_user_id
    IF nastya_user_id IS NOT NULL THEN
        UPDATE purchase_plan_items
        SET purchaser_id = nastya_user_id
        WHERE purchaser = 'NASTYA';
    END IF;
    
    -- ABDULAZIZ -> abdulaziz_user_id
    IF abdulaziz_user_id IS NOT NULL THEN
        UPDATE purchase_plan_items
        SET purchaser_id = abdulaziz_user_id
        WHERE purchaser = 'ABDULAZIZ';
    END IF;
    
    -- ELENA -> elena_user_id
    IF elena_user_id IS NOT NULL THEN
        UPDATE purchase_plan_items
        SET purchaser_id = elena_user_id
        WHERE purchaser = 'ELENA';
    END IF;
    
    -- Логируем результаты (для отладки)
    RAISE NOTICE 'Migration results: nastya_user_id=%, abdulaziz_user_id=%, elena_user_id=%', 
        nastya_user_id, abdulaziz_user_id, elena_user_id;
END $$;

-- 3. Удаляем старую колонку purchaser
ALTER TABLE purchase_plan_items 
DROP COLUMN IF EXISTS purchaser;

-- 4. Переименовываем purchaser_id в purchaser_id (оставляем как есть, но в JPA будет поле purchaser)
-- На самом деле, оставляем purchaser_id, так как это стандартное именование для внешних ключей

-- 5. Добавляем внешний ключ
ALTER TABLE purchase_plan_items
ADD CONSTRAINT fk_purchase_plan_items_purchaser 
FOREIGN KEY (purchaser_id) REFERENCES users(id) ON DELETE SET NULL;

-- 6. Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_purchaser_id 
ON purchase_plan_items(purchaser_id);

-- 7. Удаляем старый индекс, если он существует
DROP INDEX IF EXISTS idx_purchase_plan_items_purchaser;
