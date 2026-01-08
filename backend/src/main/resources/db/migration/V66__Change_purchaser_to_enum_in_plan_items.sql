-- Изменяем тип колонки purchaser в purchase_plan_items на enum
-- Конвертируем существующие значения в новые значения enum

-- "Настя Абдулазиз" или содержащие "Настя" -> "NASTYA" (приоритет Насте)
UPDATE purchase_plan_items
SET purchaser = 'NASTYA'
WHERE (purchaser = 'Настя Абдулазиз' 
   OR purchaser LIKE '%Настя%Абдулазиз%'
   OR purchaser = 'Настя'
   OR purchaser LIKE 'Настя%'
   OR purchaser LIKE '%Настя')
  AND purchaser NOT LIKE '%Абдулазиз%'  -- Исключаем случаи, где есть только Абдулазиз без Насти
  AND purchaser IS NOT NULL;

-- "Абдулазиз" (без Насти) -> "ABDULAZIZ"
UPDATE purchase_plan_items
SET purchaser = 'ABDULAZIZ'
WHERE (purchaser LIKE '%Абдулазиз%' OR purchaser LIKE '%абдулазиз%')
  AND purchaser NOT LIKE '%Настя%'
  AND purchaser NOT LIKE '%настя%'
  AND purchaser IS NOT NULL;

-- "Елена" -> "ELENA"
UPDATE purchase_plan_items
SET purchaser = 'ELENA'
WHERE purchaser = 'Елена' 
   OR purchaser LIKE '%Елена%'
   OR purchaser LIKE '%елена%';

-- Остальные значения устанавливаем в NULL (можно будет выбрать из enum)
UPDATE purchase_plan_items
SET purchaser = NULL
WHERE purchaser NOT IN ('NASTYA', 'ABDULAZIZ', 'ELENA')
  AND purchaser IS NOT NULL;

-- Теперь изменяем тип колонки на VARCHAR (enum будет храниться как строка)
-- Колонка уже VARCHAR(255), поэтому изменений не требуется
-- Просто убеждаемся, что значения соответствуют enum

