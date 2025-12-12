CREATE TABLE purchase_plan_item_changes (
    id BIGSERIAL PRIMARY KEY,
    purchase_plan_item_id BIGINT NOT NULL,
    guid UUID,
    field_name VARCHAR(255) NOT NULL,
    value_before VARCHAR(1000),
    value_after VARCHAR(1000),
    change_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_plan_item_changes_item
        FOREIGN KEY (purchase_plan_item_id)
            REFERENCES purchase_plan_items (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_purchase_plan_item_changes_item_id ON purchase_plan_item_changes(purchase_plan_item_id);
CREATE INDEX idx_purchase_plan_item_changes_guid ON purchase_plan_item_changes(guid);
CREATE INDEX idx_purchase_plan_item_changes_change_date ON purchase_plan_item_changes(change_date);

