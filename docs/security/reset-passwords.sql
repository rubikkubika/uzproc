-- ============================================================
-- Скрипт сброса паролей пользователей (T1 — Pentest Remediation)
-- Выполнять ПОСЛЕ деплоя новой версии с bcrypt (T6).
-- ВНИМАНИЕ: После выполнения этого скрипта все пользователи
-- должны получить новые пароли (через email или вручную).
-- ============================================================

-- 1. Показать всех пользователей с паролем = email (компрометированные аккаунты)
SELECT id, username, email, department, position, role
FROM users
WHERE LOWER(password) = LOWER(email)
ORDER BY role DESC, email;

-- 2. Инвалидировать старые пароли (установить заглушку, которая не пройдёт аутентификацию)
--    После этого пользователи не смогут войти по старому паролю email=пароль.
--    Новые bcrypt-хэши будут установлены администратором или через систему восстановления.
UPDATE users
SET
    password      = 'RESET_REQUIRED_' || md5(random()::text),
    password_hash = NULL,
    updated_at    = NOW()
WHERE LOWER(password) = LOWER(COALESCE(email, ''))
   OR password LIKE 'RESET_REQUIRED_%';

-- 3. Проверка — должно вернуть 0 строк (ни у кого пароль не равен email)
SELECT COUNT(*) AS remaining_compromised
FROM users
WHERE LOWER(password) = LOWER(COALESCE(email, ''));

-- ============================================================
-- Для установки нового пароля конкретному пользователю:
-- (выполнять через API /api/users/{id} с ролью admin, НЕ напрямую в БД)
--
-- UPDATE users
-- SET password = '<new_plaintext>', password_hash = NULL
-- WHERE email = 'user@example.com';
--
-- При следующем входе UserService автоматически создаст bcrypt-хэш.
-- ============================================================
