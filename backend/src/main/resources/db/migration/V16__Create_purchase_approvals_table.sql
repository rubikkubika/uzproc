-- Create purchase_approvals table
CREATE TABLE purchase_approvals (
    id BIGSERIAL PRIMARY KEY,
    
    -- Связь с закупкой по полю purchase_request_id
    purchase_request_id BIGINT NOT NULL,
    
    -- Иерархия согласования
    stage VARCHAR(255) NOT NULL,        -- "Согласование Заявки на ЗП", "Утверждение заявки на ЗП", и т.д.
    role VARCHAR(255) NOT NULL,           -- "Руководитель закупщика", "Руководитель ЦФО", и т.д.
    
    -- Данные согласования
    assignment_date TIMESTAMP,            -- Дата назначения
    completion_date TIMESTAMP,            -- Дата выполнения
    days_in_work INTEGER,                  -- Дней в работе
    completion_result VARCHAR(500),        -- Результат выполнения
    
    -- Метаданные
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальность: одна комбинация этап+роль для одной закупки
    CONSTRAINT unique_approval_per_purchase UNIQUE (purchase_request_id, stage, role)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_purchase_approvals_purchase_request_id ON purchase_approvals(purchase_request_id);
CREATE INDEX idx_purchase_approvals_stage ON purchase_approvals(stage);
CREATE INDEX idx_purchase_approvals_role ON purchase_approvals(role);
CREATE INDEX idx_purchase_approvals_stage_role ON purchase_approvals(stage, role);
CREATE INDEX idx_purchase_approvals_purchase_stage ON purchase_approvals(purchase_request_id, stage);

