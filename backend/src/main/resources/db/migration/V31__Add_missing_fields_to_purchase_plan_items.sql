-- Add missing fields to purchase_plan_items table
DO $$
BEGIN
    -- Add columns only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'product') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN product VARCHAR(500);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'has_contract') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN has_contract BOOLEAN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'current_ka') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN current_ka VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'current_amount') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN current_amount NUMERIC(15, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'current_contract_amount') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN current_contract_amount NUMERIC(15, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'current_contract_balance') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN current_contract_balance NUMERIC(15, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'current_contract_end_date') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN current_contract_end_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_plan_items' AND column_name = 'holding') THEN
        ALTER TABLE purchase_plan_items ADD COLUMN holding VARCHAR(255);
    END IF;
END $$;

-- Индексы для быстрого поиска (с проверкой существования)
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_product ON purchase_plan_items(product);
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_has_contract ON purchase_plan_items(has_contract);
CREATE INDEX IF NOT EXISTS idx_purchase_plan_items_holding ON purchase_plan_items(holding);

