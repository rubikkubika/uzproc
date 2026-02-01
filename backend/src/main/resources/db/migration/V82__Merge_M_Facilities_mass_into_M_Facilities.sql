-- Объединение ЦФО "M - Facilities (mass)" и "M - Facilities" в одно значение "M - Facilities" на уровне БД
DO $$
DECLARE
  id_mass BIGINT;
  id_canonical BIGINT;
BEGIN
  SELECT id INTO id_mass FROM cfo WHERE name = 'M - Facilities (mass)' LIMIT 1;
  SELECT id INTO id_canonical FROM cfo WHERE name = 'M - Facilities' LIMIT 1;

  IF id_mass IS NOT NULL AND id_canonical IS NOT NULL THEN
    -- Оба существуют: переводим все ссылки на канонический ЦФО, затем удаляем дубликат
    UPDATE purchase_plan_items SET cfo_id = id_canonical WHERE cfo_id = id_mass;
    UPDATE purchase_plan_item_versions SET cfo_id = id_canonical WHERE cfo_id = id_mass;
    UPDATE purchase_requests SET cfo_id = id_canonical WHERE cfo_id = id_mass;
    UPDATE purchases SET cfo_id = id_canonical WHERE cfo_id = id_mass;
    UPDATE contracts SET cfo_id = id_canonical WHERE cfo_id = id_mass;
    DELETE FROM cfo WHERE id = id_mass;
  ELSIF id_mass IS NOT NULL AND id_canonical IS NULL THEN
    -- Существует только "M - Facilities (mass)": переименовываем в "M - Facilities"
    UPDATE cfo SET name = 'M - Facilities', updated_at = CURRENT_TIMESTAMP WHERE id = id_mass;
  END IF;
END $$;
