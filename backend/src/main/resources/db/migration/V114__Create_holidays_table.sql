-- Нерабочие дни (государственные и иные праздники Узбекистана и т.п.) для расчёта рабочих дней в системе.
-- После изменения данных перезапустите backend, чтобы сбросился кэш праздников в памяти.

CREATE TABLE holidays (
    id BIGSERIAL PRIMARY KEY,
    calendar_date DATE NOT NULL,
    name VARCHAR(512),
    CONSTRAINT uk_holidays_calendar_date UNIQUE (calendar_date)
);

CREATE INDEX idx_holidays_calendar_date ON holidays (calendar_date);
