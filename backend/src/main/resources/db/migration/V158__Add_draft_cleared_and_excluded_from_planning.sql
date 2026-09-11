-- Признак договора «Исключён из планирования»: такие договоры не попадают в новые драфты плана закупок.
-- Ставится «глазиком» у позиции драфта, сформированной из этого договора.
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS excluded_from_planning BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN contracts.excluded_from_planning IS 'Исключён из планирования: договор не попадает в драфт плана закупок';

-- Позиция драфта скрыта очисткой драфта. Строка не удаляется, чтобы при повторном формировании
-- позиция по тому же договору вернулась с тем же id (вместе с историей изменений и комментариями).
ALTER TABLE purchase_plan_items ADD COLUMN IF NOT EXISTS draft_cleared BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN purchase_plan_items.draft_cleared IS 'Позиция драфта скрыта очисткой драфта (не удаляется, чтобы сохранить id)';
