-- Предмет договора. Парсинг из колонки "Содержание" в Excel (docs.xlsx).
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN contracts.subject IS 'Предмет договора. Парсинг из колонки "Содержание" в Excel.';
