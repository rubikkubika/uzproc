-- Add purchaser column to purchase_requests table
ALTER TABLE purchase_requests 
ADD COLUMN purchaser VARCHAR(255);

