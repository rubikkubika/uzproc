-- Временный пароль (хранится в plaintext для отображения в админке)
ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);
-- Флаг обязательной смены пароля при следующем входе
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT FALSE;
