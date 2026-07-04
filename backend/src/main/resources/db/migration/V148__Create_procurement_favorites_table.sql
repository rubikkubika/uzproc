-- Избранные закупки пользователя на странице «Трекер закупок».
-- Ключ закупки — id_purchase_request (совпадает с id в ProcurementTrackerDto).
CREATE TABLE procurement_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    id_purchase_request BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Одна закупка может быть в избранном у пользователя только один раз
CREATE UNIQUE INDEX idx_proc_fav_user_request ON procurement_favorites (user_id, id_purchase_request);
CREATE INDEX idx_proc_fav_user ON procurement_favorites (user_id);

COMMENT ON TABLE procurement_favorites IS 'Избранные закупки пользователя (трекер закупок)';
COMMENT ON COLUMN procurement_favorites.user_id IS 'ID пользователя (users.id)';
COMMENT ON COLUMN procurement_favorites.id_purchase_request IS 'Номер заявки закупки (purchase_requests.id_purchase_request)';
