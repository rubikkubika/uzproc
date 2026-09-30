-- Журнал запусков регулярных рассылок/задач по расписанию: одна запись на задачу и период.
-- Уникальность (job_name, period_key) — защита от повторного запуска за тот же период
-- (перезапуск приложения в минуту расписания, несколько экземпляров бэкенда).
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    period_key VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    summary TEXT,
    CONSTRAINT uq_scheduled_job_runs_job_period UNIQUE (job_name, period_key)
);

COMMENT ON TABLE scheduled_job_runs IS 'Запуски задач по расписанию (одна запись на задачу и период) — защита от повторной отправки';
COMMENT ON COLUMN scheduled_job_runs.job_name IS 'Код задачи, например specification-sending';
COMMENT ON COLUMN scheduled_job_runs.period_key IS 'Период, за который выполнена задача, например 2026-09';
COMMENT ON COLUMN scheduled_job_runs.summary IS 'Итог выполнения: сколько отправлено, пропущено, ошибок';
