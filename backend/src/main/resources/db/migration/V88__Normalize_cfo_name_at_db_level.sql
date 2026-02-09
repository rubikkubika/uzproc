-- Нормализация названия ЦФО на уровне БД: убираем скрытые/неразрывные пробелы, схлопываем повторяющиеся пробелы.
-- Устраняет дубли в сводках из-за различий в пробелах (например, "ЦФО1" и "ЦФО1 ").

-- 1. Функция нормализации: trim, замена всех видов пробелов (включая неразрывный U+00A0) на один пробел, снова trim
CREATE OR REPLACE FUNCTION normalize_cfo_name(name text)
RETURNS text AS $$
  SELECT NULLIF(
    TRIM(REGEXP_REPLACE(REPLACE(COALESCE(name, ''), chr(160), ' '), '\s+', ' ', 'g')),
    ''
  );
$$ LANGUAGE sql IMMUTABLE;

-- 2. Триггер: при вставке и обновлении нормализуем name
CREATE OR REPLACE FUNCTION trigger_normalize_cfo_name()
RETURNS trigger AS $$
BEGIN
  NEW.name := COALESCE(normalize_cfo_name(NEW.name), NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cfo_normalize_name ON cfo;
CREATE TRIGGER trg_cfo_normalize_name
  BEFORE INSERT OR UPDATE OF name ON cfo
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_normalize_cfo_name();

-- 3. Объединяем дубликаты ЦФО с одинаковым нормализованным именем (оставляем строку с минимальным id, ссылки переводим на неё)
DO $$
DECLARE
  r RECORD;
  canonical_id BIGINT;
  other_ids BIGINT[];
BEGIN
  FOR r IN
    SELECT normalize_cfo_name(name) AS nname
    FROM cfo
    WHERE name IS NOT NULL AND normalize_cfo_name(name) IS NOT NULL
    GROUP BY normalize_cfo_name(name)
    HAVING COUNT(*) > 1
  LOOP
    SELECT MIN(id) INTO canonical_id FROM cfo WHERE normalize_cfo_name(name) = r.nname;
    SELECT ARRAY_AGG(id) INTO other_ids FROM cfo WHERE normalize_cfo_name(name) = r.nname AND id != canonical_id;

    IF other_ids IS NOT NULL AND array_length(other_ids, 1) > 0 THEN
      UPDATE purchase_plan_items SET cfo_id = canonical_id WHERE cfo_id = ANY(other_ids);
      UPDATE purchase_plan_item_versions SET cfo_id = canonical_id WHERE cfo_id = ANY(other_ids);
      UPDATE purchase_requests SET cfo_id = canonical_id WHERE cfo_id = ANY(other_ids);
      UPDATE purchases SET cfo_id = canonical_id WHERE cfo_id = ANY(other_ids);
      UPDATE contracts SET cfo_id = canonical_id WHERE cfo_id = ANY(other_ids);
      DELETE FROM cfo WHERE id = ANY(other_ids);
    END IF;
  END LOOP;
END $$;

-- 4. Нормализуем названия у оставшихся строк (не трогаем, если после нормализации получится NULL/пусто)
UPDATE cfo
SET name = normalize_cfo_name(name)
WHERE name IS NOT NULL
  AND normalize_cfo_name(name) IS NOT NULL
  AND name != normalize_cfo_name(name);
