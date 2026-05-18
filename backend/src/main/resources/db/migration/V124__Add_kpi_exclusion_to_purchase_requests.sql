ALTER TABLE purchase_requests
    ADD COLUMN IF NOT EXISTS exclude_from_kpi BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS exclude_from_kpi_comment VARCHAR(1000);
