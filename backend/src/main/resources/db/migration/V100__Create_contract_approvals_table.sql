-- Согласования договоров (из папки approvals, вид документа = Договор)
CREATE TABLE contract_approvals (
    id BIGSERIAL PRIMARY KEY,

    -- Связь с договором по внутреннему номеру (contracts.inner_id)
    contract_id BIGINT NOT NULL,
    CONSTRAINT fk_contract_approvals_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),

    guid UUID,
    cfo_id BIGINT,
    CONSTRAINT fk_contract_approvals_cfo FOREIGN KEY (cfo_id) REFERENCES cfo(id),

    document_form VARCHAR(255),       -- Форма документа
    stage VARCHAR(255) NOT NULL,       -- Этап
    role VARCHAR(255) NOT NULL,       -- Роль

    executor_id BIGINT,               -- Исполнитель (связь с users)
    CONSTRAINT fk_contract_approvals_executor FOREIGN KEY (executor_id) REFERENCES users(id),

    assignment_date TIMESTAMP,       -- Дата назначения
    planned_completion_date TIMESTAMP,-- Плановая дата исполнения
    completion_date TIMESTAMP,        -- Фактическая дата исполнения

    completion_result VARCHAR(1000),  -- Результат выполнения
    comment_text VARCHAR(2000),       -- Комментарий
    is_waiting BOOLEAN,               -- Ожидание

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_contract_approval_per_contract_stage_role UNIQUE (contract_id, stage, role)
);

CREATE INDEX idx_contract_approvals_contract_id ON contract_approvals(contract_id);
CREATE INDEX idx_contract_approvals_cfo_id ON contract_approvals(cfo_id);
CREATE INDEX idx_contract_approvals_stage ON contract_approvals(stage);
CREATE INDEX idx_contract_approvals_role ON contract_approvals(role);
CREATE INDEX idx_contract_approvals_executor_id ON contract_approvals(executor_id);
CREATE INDEX idx_contract_approvals_contract_stage ON contract_approvals(contract_id, stage);
