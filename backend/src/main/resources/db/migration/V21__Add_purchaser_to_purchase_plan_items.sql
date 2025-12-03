-- Add purchaser column to purchase_plan_items table (with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'purchaser') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN purchaser VARCHAR(255);
    END IF;
END $$;

-- Индекс для быстрого поиска по закупщику (с проверкой существования)
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_purchaser ON purchase_plan_items(purchaser);

