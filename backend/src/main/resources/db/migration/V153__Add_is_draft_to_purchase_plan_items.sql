-- Драфт плана закупок: позиции-черновики хранятся в той же таблице,
-- отделяются флагом is_draft. Действующий план — is_draft = false.
ALTER TABLE purchase_plan_items
    ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE;

-- Ссылка на договор-источник, из которого сгенерирована позиция драфта.
-- Позволяет не создавать дубликаты при повторной генерации.
ALTER TABLE purchase_plan_items
    ADD COLUMN IF NOT EXISTS source_contract_id BIGINT;

ALTER TABLE purchase_plan_items
    ADD CONSTRAINT fk_purchase_plan_item_source_contract
    FOREIGN KEY (source_contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_is_draft
    ON purchase_plan_items (is_draft);

CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_source_contract_id
    ON purchase_plan_items (source_contract_id);

-- Уникальность: один договор-источник порождает одну позицию драфта в рамках года
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppi_draft_source_contract_year
    ON purchase_plan_items (source_contract_id, year)
    WHERE is_draft = TRUE AND source_contract_id IS NOT NULL;
