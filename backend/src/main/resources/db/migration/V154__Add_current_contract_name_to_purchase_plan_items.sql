-- Наименование действующего договора-источника (колонка «Текущий договор»).
-- Предмет закупки при этом заполняется из связанной заявки, а при её отсутствии — из договора.
ALTER TABLE purchase_plan_items
    ADD COLUMN IF NOT EXISTS current_contract_name VARCHAR(500);
