-- Настройки KPI-премии (цель, вес, буст до 130%) для блоков «Экономия», «SLA», «CSI».
-- Единственная строка (singleton, id = 1), общая для всех пользователей.
CREATE TABLE IF NOT EXISTS kpi_settings (
    id BIGSERIAL PRIMARY KEY,

    savings_target DOUBLE PRECISION NOT NULL DEFAULT 5,
    savings_weight DOUBLE PRECISION NOT NULL DEFAULT 30,
    savings_allow_boost BOOLEAN NOT NULL DEFAULT TRUE,

    sla_target DOUBLE PRECISION NOT NULL DEFAULT 80,
    sla_weight DOUBLE PRECISION NOT NULL DEFAULT 30,
    sla_allow_boost BOOLEAN NOT NULL DEFAULT TRUE,

    csi_target DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    csi_weight DOUBLE PRECISION NOT NULL DEFAULT 40,
    csi_allow_boost BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Заполняем строку настроек по умолчанию (значения совпадают с дефолтами на фронтенде).
INSERT INTO kpi_settings (id, savings_target, savings_weight, savings_allow_boost,
                          sla_target, sla_weight, sla_allow_boost,
                          csi_target, csi_weight, csi_allow_boost)
VALUES (1, 5, 30, TRUE, 80, 30, TRUE, 4.5, 40, TRUE)
ON CONFLICT (id) DO NOTHING;
