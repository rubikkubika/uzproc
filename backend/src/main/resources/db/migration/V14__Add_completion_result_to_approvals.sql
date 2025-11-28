-- Add completion_result column to purchase_request_approvals table
ALTER TABLE purchase_request_approvals 
ADD COLUMN completion_result VARCHAR(500);

