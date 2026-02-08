-- Сложность заявки (из alldocuments: "Сложность закупки (уровень) (Заявка на ЗП)")
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS complexity VARCHAR(255);
