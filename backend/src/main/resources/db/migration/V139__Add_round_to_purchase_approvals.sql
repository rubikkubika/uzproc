-- Поддержка нескольких кругов согласования для закупок.
-- round           — номер круга согласования (1, 2, ...). Старые данные = круг 1.
-- counted_in_sla  — учитывается ли строка в SLA/аналитике (по умолчанию учитывается последний круг).
ALTER TABLE purchase_approvals ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_approvals ADD COLUMN IF NOT EXISTS counted_in_sla BOOLEAN NOT NULL DEFAULT true;

-- Уникальность теперь учитывает круг: одна строка на (закупка, этап, роль, круг).
ALTER TABLE purchase_approvals DROP CONSTRAINT IF EXISTS unique_approval_per_purchase;
ALTER TABLE purchase_approvals
    ADD CONSTRAINT unique_approval_per_purchase
    UNIQUE (purchase_request_id, stage, role, round);

-- Индекс для выборки/агрегаций по учитываемым в SLA кругам.
CREATE INDEX IF NOT EXISTS idx_purchase_approvals_counted_in_sla
    ON purchase_approvals (purchase_request_id, counted_in_sla);
