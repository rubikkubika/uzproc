-- Исключение договора/спецификации из расчёта статуса заявки (Договор подписан / Спецификация подписана)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS excluded_from_status_calculation BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN contracts.excluded_from_status_calculation IS 'Исключить из расчёта статуса заявки (true = не учитывать при определении Договор подписан / Спецификация подписана)';

-- Комментарий к исключению
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS exclusion_comment VARCHAR(2000);
COMMENT ON COLUMN contracts.exclusion_comment IS 'Комментарий к исключению договора из расчёта статуса заявки';
