-- Срок поставки в рабочих днях. По умолчанию берётся из договора (contracts.delivery_term, первое число).
-- На основе этого срока и даты оплаты вычисляется delivery_deadline («Дата поставки»).
ALTER TABLE deliveries ADD COLUMN delivery_term_working_days INTEGER;
