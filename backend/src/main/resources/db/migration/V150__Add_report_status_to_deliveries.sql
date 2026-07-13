-- Статус из ручного отчёта (папка handreport), колонка с заголовком «41» (напр. «Закрыто»).
ALTER TABLE deliveries ADD COLUMN report_status VARCHAR(255);
