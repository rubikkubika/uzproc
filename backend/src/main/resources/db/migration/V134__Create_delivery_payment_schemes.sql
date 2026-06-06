-- Справочник схем оплаты поставок.
-- label  — отображаемый ярлык (кириллица), напр. «20/80/20 б.д.».
-- advance_percent / final_percent — аванс и доплата (доплата — сумма всех неавансовых долей).
-- term_days — срок доплаты в днях; day_type — WORKING (рабочие/банковские) или CALENDAR (обычные).
-- payment_type — PREPAYMENT (есть аванс) или POSTPAYMENT (аванса нет).
CREATE TABLE delivery_payment_schemes (
    id              BIGSERIAL PRIMARY KEY,
    label           VARCHAR(50)  NOT NULL,
    advance_percent INTEGER,
    final_percent   INTEGER,
    term_days       INTEGER,
    day_type        VARCHAR(20),
    payment_type    VARCHAR(20)  NOT NULL,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    active          BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Сид: 11 конкретных схем. payment_type = PREPAYMENT, если есть аванс (advance_percent > 0), иначе POSTPAYMENT.
INSERT INTO delivery_payment_schemes (label, advance_percent, final_percent, term_days, day_type, payment_type, sort_order) VALUES
    ('20/80/20 б.д.',    20,  80, 20, 'WORKING',  'PREPAYMENT',  1),
    ('30/30/40/10 д.',   30,  70, 10, 'CALENDAR', 'PREPAYMENT',  2),
    ('30/70/10 д.',      30,  70, 10, 'CALENDAR', 'PREPAYMENT',  3),
    ('50/50/20/10 б.д.', 50,  70, 10, 'WORKING',  'PREPAYMENT',  4),
    ('50/50/10 д.',      50,  50, 10, 'CALENDAR', 'PREPAYMENT',  5),
    ('50/50/5 д.',       50,  50,  5, 'CALENDAR', 'PREPAYMENT',  6),
    ('70/30/10 д.',      70,  30, 10, 'CALENDAR', 'PREPAYMENT',  7),
    ('80/20/6 д.',       80,  20,  6, 'CALENDAR', 'PREPAYMENT',  8),
    ('88/12/10 д.',      88,  12, 10, 'CALENDAR', 'PREPAYMENT',  9),
    ('0/100/10 д.',       0, 100, 10, 'CALENDAR', 'POSTPAYMENT', 10),
    ('100/0/10 д.',     100,   0, 10, 'CALENDAR', 'PREPAYMENT',  11);

-- Ссылка поставки на конкретную схему оплаты.
ALTER TABLE deliveries ADD COLUMN payment_scheme_id BIGINT REFERENCES delivery_payment_schemes(id);
