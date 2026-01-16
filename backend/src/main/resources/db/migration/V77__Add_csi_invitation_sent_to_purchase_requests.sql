-- Добавление колонки csi_invitation_sent в таблицу purchase_requests
ALTER TABLE purchase_requests ADD COLUMN csi_invitation_sent BOOLEAN DEFAULT FALSE;
