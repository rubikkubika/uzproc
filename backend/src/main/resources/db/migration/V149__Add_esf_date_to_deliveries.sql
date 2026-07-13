-- Дата ЭСФ (электронной счёт-фактуры). Парсится из ручного отчёта (папка handreport),
-- колонка «Дата выставления ЭСФ».
ALTER TABLE deliveries ADD COLUMN esf_date DATE;
