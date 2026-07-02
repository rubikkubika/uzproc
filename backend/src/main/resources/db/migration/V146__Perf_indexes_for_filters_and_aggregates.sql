-- Индексы производительности (аудит БД, Волна 1.4).
-- Добавляются только на колонки, у которых НЕТ подходящего индекса и которые
-- участвуют в фильтрах/сортировках/агрегациях горячих эндпойнтов.
-- Идемпотентно (IF NOT EXISTS). На малых таблицах планировщик может оставить Seq Scan —
-- это нормально; индексы начнут работать при росте объёма. Валидировать EXPLAIN на prod-объёме.

-- purchase_requests: вкладки/сводки (in-work/completed) и tab-counts фильтруют по requires_purchase + status
CREATE INDEX IF NOT EXISTS idx_pr_requires_status
    ON purchase_requests (requires_purchase, status);

-- purchase_requests: фильтр/сортировка по дате создания заявки (у существующего idx_..._year колонка plan_year, не эта)
CREATE INDEX IF NOT EXISTS idx_pr_creation_date
    ON purchase_requests (purchase_request_creation_date);

-- purchase_request_approvals: подзапрос по этапу + диапазону assignment_date (учитываемые в SLA) в листинге/сводках
CREATE INDEX IF NOT EXISTS idx_pr_approvals_stage_assignment_sla
    ON purchase_request_approvals (stage, assignment_date)
    WHERE counted_in_sla = true;

-- arrivals: lookup из InvoiceService по (incoming_number, incoming_date) — существующие индексы на number/date (другие колонки)
CREATE INDEX IF NOT EXISTS idx_arrivals_incoming_lookup
    ON arrivals (incoming_number, incoming_date);

-- purchase_plan_items: месячные гистограммы и фильтр по дате заявки (request_date индекса не было)
CREATE INDEX IF NOT EXISTS idx_ppi_request_date
    ON purchase_plan_items (request_date);
