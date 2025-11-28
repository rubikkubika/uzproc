-- Create purchase_request_approvals table
CREATE TABLE purchase_request_approvals (
    id BIGSERIAL PRIMARY KEY,
    
    -- Связь с заявкой на закупку по полю id_purchase_request
    id_purchase_request BIGINT NOT NULL,
    
    -- Иерархия согласования
    stage VARCHAR(255) NOT NULL,        -- "Согласование Заявки на ЗП", "Утверждение заявки на ЗП", и т.д.
    role VARCHAR(255) NOT NULL,         -- "Руководитель закупщика", "Руководитель ЦФО", и т.д.
    
    -- Данные согласования
    assignment_date TIMESTAMP,          -- Дата назначения
    completion_date TIMESTAMP,          -- Дата выполнения
    days_in_work INTEGER,               -- Дней в работе
    
    -- Метаданные
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальность: одна комбинация этап+роль для одной заявки
    CONSTRAINT unique_approval_per_request UNIQUE (id_purchase_request, stage, role)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_approvals_id_purchase_request ON purchase_request_approvals(id_purchase_request);
CREATE INDEX idx_approvals_stage ON purchase_request_approvals(stage);
CREATE INDEX idx_approvals_role ON purchase_request_approvals(role);
CREATE INDEX idx_approvals_stage_role ON purchase_request_approvals(stage, role);
CREATE INDEX idx_approvals_request_stage ON purchase_request_approvals(id_purchase_request, stage);

