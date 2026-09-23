-- Таблица SLA драфта плана закупок: срок от даты заявки до заключения нового договора по сложности,
-- своя на каждый год драфта. Срок = SLA закупки + SLA договора (в драфте договор всегда считается нетиповым).
-- Таблица нового года при первом обращении копируется с последнего предыдущего года.
CREATE TABLE IF NOT EXISTS draft_sla_settings (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    complexity INTEGER NOT NULL,
    procurement_days INTEGER NOT NULL,
    contract_days INTEGER NOT NULL,
    updated_at TIMESTAMP,
    updated_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_draft_sla_settings_year_complexity UNIQUE (year, complexity),
    CONSTRAINT chk_draft_sla_settings_complexity CHECK (complexity BETWEEN 1 AND 4),
    CONSTRAINT chk_draft_sla_settings_days CHECK (procurement_days >= 0 AND contract_days >= 0)
);

COMMENT ON TABLE draft_sla_settings IS 'SLA драфта плана закупок по годам: рабочие дни от даты заявки до нового договора по сложности';
COMMENT ON COLUMN draft_sla_settings.procurement_days IS 'SLA закупки, рабочих дней';
COMMENT ON COLUMN draft_sla_settings.contract_days IS 'SLA договора, рабочих дней (нетиповой договор: подготовка 4 + согласование 5 + подписание 2)';

-- Стартовая таблица на 2027 год: SLA закупки 3/7/15/30 + нетиповой договор 11
INSERT INTO draft_sla_settings (year, complexity, procurement_days, contract_days) VALUES
    (2027, 1, 3, 11),
    (2027, 2, 7, 11),
    (2027, 3, 15, 11),
    (2027, 4, 30, 11)
ON CONFLICT (year, complexity) DO NOTHING;

-- Пересчёт даты завершения закупки у позиций драфта по новой таблице: дата заявки + общий срок в рабочих днях
-- (со следующего дня после даты заявки, без выходных и праздников — как WorkingDayService.addWorkingDaysAfterDate).
-- В драфте дата завершения всегда выводится из даты заявки и сложности, поэтому пересчитываются все позиции.
UPDATE purchase_plan_items p
SET new_contract_date = (
    SELECT w.d FROM (
        SELECT g::date AS d, row_number() OVER (ORDER BY g) AS rn
        FROM generate_series(p.request_date + 1, p.request_date + 730, INTERVAL '1 day') g
        WHERE extract(isodow FROM g) < 6
          AND g::date NOT IN (SELECT calendar_date FROM holidays)
    ) w
    WHERE w.rn = s.procurement_days + s.contract_days)
FROM draft_sla_settings s
WHERE p.is_draft = TRUE
  AND p.year = s.year
  AND trim(p.complexity) = s.complexity::text
  AND p.request_date IS NOT NULL;
