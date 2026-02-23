CREATE TABLE purchase_request_changes (
    id BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL,
    guid UUID,
    field_name VARCHAR(255) NOT NULL,
    value_before VARCHAR(1000),
    value_after VARCHAR(1000),
    change_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_request_changes_request
        FOREIGN KEY (purchase_request_id)
            REFERENCES purchase_requests (id)
            ON DELETE CASCADE
);

CREATE INDEX idx_purchase_request_changes_request_id ON purchase_request_changes(purchase_request_id);
CREATE INDEX idx_purchase_request_changes_guid ON purchase_request_changes(guid);
CREATE INDEX idx_purchase_request_changes_change_date ON purchase_request_changes(change_date);
