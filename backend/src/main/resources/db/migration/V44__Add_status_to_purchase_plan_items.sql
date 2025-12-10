DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'purchase_plan_items' AND column_name = 'status') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN status VARCHAR(50);
    END IF;
END $$;

