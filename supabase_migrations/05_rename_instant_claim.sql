-- Make sure to close your app preview tab/window to release any database locks!
-- If you still get a timeout, try running these steps one at a time.

-- 1. Dynamically find and drop ALL old constraints related to selectionMethod
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'shifts'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%selectionMethod%'
    LOOP
        EXECUTE 'ALTER TABLE shifts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Update existing rows that have INSTANT_CLAIM to QUICK_BID
UPDATE shifts 
SET "selectionMethod" = 'QUICK_BID' 
WHERE "selectionMethod" = 'INSTANT_CLAIM';

-- 3. Add the new constraint
ALTER TABLE shifts 
ADD CONSTRAINT shifts_selectionMethod_check 
CHECK ("selectionMethod" IN ('QUICK_BID', 'BIDDING'));

-- 4. Update the default value for the column
ALTER TABLE shifts 
ALTER COLUMN "selectionMethod" SET DEFAULT 'QUICK_BID';
