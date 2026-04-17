-- Добавляем колонку для bcrypt-хэша пароля
-- Старое поле password остаётся временно для обратной совместимости при миграции
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
