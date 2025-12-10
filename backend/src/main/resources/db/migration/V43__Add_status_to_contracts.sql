DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contracts' AND column_name = 'status') THEN
        ALTER TABLE contracts ADD COLUMN status VARCHAR(50);
    END IF;
END $$;

