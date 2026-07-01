-- Снимок номера заявки для спецификации в приглашении на оценку (для колонки «№ заявки» в письме).
ALTER TABLE specification_feedback_items
    ADD COLUMN purchase_request_number VARCHAR(255);
