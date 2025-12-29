-- Миграция для пересчета дат нового договора на основе сложности и даты заявки
-- Логика: сложность 1 = +7 рабочих дней, 2 = +14, 3 = +22, 4 = +50

-- Функция для добавления рабочих дней (исключая субботу и воскресенье)
CREATE OR REPLACE FUNCTION add_working_days(start_date DATE, working_days INTEGER)
RETURNS DATE AS $$
DECLARE
    result_date DATE := start_date;
    days_added INTEGER := 0;
    day_of_week INTEGER;
BEGIN
    WHILE days_added < working_days LOOP
        result_date := result_date + INTERVAL '1 day';
        day_of_week := EXTRACT(DOW FROM result_date); -- 0 = воскресенье, 6 = суббота
        -- Пропускаем выходные (суббота = 6, воскресенье = 0)
        IF day_of_week != 0 AND day_of_week != 6 THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;
    
    RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения количества рабочих дней на основе сложности
CREATE OR REPLACE FUNCTION get_working_days_by_complexity(complexity_str TEXT)
RETURNS INTEGER AS $$
BEGIN
    IF complexity_str IS NULL OR TRIM(complexity_str) = '' THEN
        RETURN NULL;
    END IF;
    
    CASE TRIM(complexity_str)
        WHEN '1' THEN RETURN 7;
        WHEN '2' THEN RETURN 14;
        WHEN '3' THEN RETURN 22;
        WHEN '4' THEN RETURN 50;
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Пересчитываем даты нового договора для записей, у которых есть сложность и дата заявки
UPDATE purchase_plan_items
SET new_contract_date = add_working_days(
    request_date,
    get_working_days_by_complexity(complexity)
)
WHERE request_date IS NOT NULL
  AND complexity IS NOT NULL
  AND TRIM(complexity) IN ('1', '2', '3', '4')
  AND (
    -- Обновляем только если дата нового договора не соответствует расчету
    new_contract_date IS NULL
    OR new_contract_date != add_working_days(
        request_date,
        get_working_days_by_complexity(complexity)
    )
  );

-- Удаляем временные функции после использования
DROP FUNCTION IF EXISTS add_working_days(DATE, INTEGER);
DROP FUNCTION IF EXISTS get_working_days_by_complexity(TEXT);

