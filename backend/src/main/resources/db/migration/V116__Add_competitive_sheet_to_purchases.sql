-- Добавить конкурентный лист к закупкам
ALTER TABLE purchases
    ADD COLUMN IF NOT EXISTS competitive_sheet JSONB,
    ADD COLUMN IF NOT EXISTS competitive_sheet_uploaded_at TIMESTAMP;
