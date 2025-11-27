-- Rename purchase fields to purchase_request_* for consistency
ALTER TABLE purchase_requests
    RENAME COLUMN purchase_initiator TO purchase_request_initiator;
    
ALTER TABLE purchase_requests
    RENAME COLUMN purchase_subject TO purchase_request_subject;
    
ALTER TABLE purchase_requests
    RENAME COLUMN purchase_plan_year TO purchase_request_plan_year;

