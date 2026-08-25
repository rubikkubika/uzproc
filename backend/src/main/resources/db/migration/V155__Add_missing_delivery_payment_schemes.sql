-- Недостающие схемы оплаты поставок.
-- Автоподбор схемы (DeliveryService.autoSchemeForContract) ищет точное совпадение
-- по тройке (аванс %, доплата %, срок из «Условий оплаты» договора). Комбинации ниже
-- встречаются в договорах, но в справочнике их не было — из-за этого у части поставок
-- схема оставалась пустой, а оплаты не распределялись на «Аванс» и «По факту».
--
-- day_type: WORKING — банковские/рабочие дни, CALENDAR — календарные.
INSERT INTO delivery_payment_schemes (label, advance_percent, final_percent, term_days, day_type, payment_type, sort_order) VALUES
    ('20/80/10 б.д.', 20,  80, 10, 'WORKING',  'PREPAYMENT', 12),
    ('80/20/10 б.д.', 80,  20, 10, 'WORKING',  'PREPAYMENT', 13),
    ('100/0/5 б.д.', 100,   0,  5, 'WORKING',  'PREPAYMENT', 14),
    ('50/50/3 д.',    50,  50,  3, 'WORKING',  'PREPAYMENT', 15),
    ('30/70/1 д.',    30,  70,  1, 'CALENDAR', 'PREPAYMENT', 16);
