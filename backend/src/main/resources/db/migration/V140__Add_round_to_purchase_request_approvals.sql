-- Поддержка нескольких кругов согласования для заявок на закупку.
-- round           — номер круга согласования (1, 2, ...). Старые данные = круг 1.
-- counted_in_sla  — учитывается ли строка в SLA/аналитике (по умолчанию учитывается последний круг).
ALTER TABLE purchase_request_approvals ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_request_approvals ADD COLUMN IF NOT EXISTS counted_in_sla BOOLEAN NOT NULL DEFAULT true;

-- Уникальность теперь учитывает круг: одна строка на (заявка, этап, роль, круг).
ALTER TABLE purchase_request_approvals DROP CONSTRAINT IF EXISTS unique_approval_per_request;
ALTER TABLE purchase_request_approvals
    ADD CONSTRAINT unique_approval_per_request
    UNIQUE (id_purchase_request, stage, role, round);

-- Индекс для выборки/агрегаций по учитываемым в SLA кругам.
CREATE INDEX IF NOT EXISTS idx_pr_approvals_counted_in_sla
    ON purchase_request_approvals (id_purchase_request, counted_in_sla);
