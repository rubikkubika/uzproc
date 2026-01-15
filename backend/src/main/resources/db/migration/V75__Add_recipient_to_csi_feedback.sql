-- Добавление поля recipient в таблицу csi_feedback для хранения получателя письма
ALTER TABLE csi_feedback 
ADD COLUMN IF NOT EXISTS recipient VARCHAR(255);
