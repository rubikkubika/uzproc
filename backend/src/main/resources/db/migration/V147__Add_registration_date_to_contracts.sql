-- Дата регистрации договора теперь хранится в БД (ранее вычислялась на лету из contract_approvals).
-- Значение — MAX(completion_date) по этапам согласования «Регистрация%».
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP;

-- Бэкфилл существующих данных: для каждого договора берём максимальную дату выполнения
-- согласования этапа «регистрация%» (без учёта регистра), где дата выполнения заполнена.
UPDATE contracts c
SET registration_date = sub.max_date
FROM (
    SELECT contract_id, MAX(completion_date) AS max_date
    FROM contract_approvals
    WHERE LOWER(stage) LIKE 'регистрация%'
      AND completion_date IS NOT NULL
    GROUP BY contract_id
) sub
WHERE c.id = sub.contract_id;
