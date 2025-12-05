-- Add category column to purchase_plan_items table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'category') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN category VARCHAR(255);
    END IF;
END $$;

-- Create index for category
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_category ON purchase_plan_items(category);

