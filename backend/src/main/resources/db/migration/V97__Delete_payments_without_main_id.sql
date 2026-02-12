-- Удаление оплат без основного номера (main_id): мусорные строки, оставшиеся до введения обязательного поля
DELETE FROM payments
WHERE main_id IS NULL
   OR TRIM(main_id) = '';
