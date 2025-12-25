-- Создание таблицы для справочника ЦФО
CREATE TABLE IF NOT EXISTS cfo (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для быстрого поиска по названию
CREATE INDEX IF NOT EXISTS idx_cfo_name ON cfo(name);

-- Заполнение таблицы уникальными значениями ЦФО из существующих таблиц
-- Используем TRIM для нормализации значений (убираем пробелы в начале и конце)
INSERT INTO cfo (name)
SELECT DISTINCT TRIM(cfo) as name
FROM (
    SELECT cfo FROM purchase_plan_items WHERE cfo IS NOT NULL AND TRIM(cfo) != ''
    UNION
    SELECT cfo FROM purchases WHERE cfo IS NOT NULL AND TRIM(cfo) != ''
    UNION
    SELECT cfo FROM purchase_requests WHERE cfo IS NOT NULL AND TRIM(cfo) != ''
    UNION
    SELECT cfo FROM contracts WHERE cfo IS NOT NULL AND TRIM(cfo) != ''
) AS all_cfo
WHERE TRIM(cfo) IS NOT NULL AND TRIM(cfo) != ''
ON CONFLICT (name) DO NOTHING;
