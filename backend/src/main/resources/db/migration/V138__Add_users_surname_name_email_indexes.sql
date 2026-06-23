-- Индексы для ускорения поиска исполнителя при импорте согласований договоров
-- (ContractApprovalExcelLoadService / ContractApprovalBatchSaver).
-- Ранее поиск пользователя шёл seq scan по всей таблице users на каждую строку Excel.

-- Поиск по фамилии и имени (findBySurnameAndName)
CREATE INDEX IF NOT EXISTS idx_users_surname_name ON users (surname, name);

-- Поиск по email (findAllByEmail)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
