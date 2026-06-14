-- Step 1: Update the Shifts (Jobs) Table
-- Add the selectionMethod column to support both QUICK_BID and BIDDING
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS "selectionMethod" text DEFAULT 'QUICK_BID' CHECK ("selectionMethod" IN ('QUICK_BID', 'BIDDING'));

-- Step 2: Create the Quotes (Bids) Table
CREATE TABLE IF NOT EXISTS quotes (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "jobId" text NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    "providerId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    message text,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    -- Ensure a provider can only bid once per job
    UNIQUE("jobId", "providerId")
);

-- Enable Row Level Security (RLS) on Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read quotes
CREATE POLICY "Clients can view quotes for their jobs" ON quotes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = quotes."jobId" 
            AND shifts."clientId" = auth.uid()::text
        )
    );

CREATE POLICY "Providers can view their own quotes" ON quotes
    FOR SELECT 
    USING ("providerId" = auth.uid()::text);

-- Policy: Providers can insert their own quotes
CREATE POLICY "Providers can insert quotes" ON quotes
    FOR INSERT 
    WITH CHECK ("providerId" = auth.uid()::text);

-- Policy: Clients can update quotes (to ACCEPT or DECLINE)
CREATE POLICY "Clients can update quotes for their jobs" ON quotes
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = quotes."jobId" 
            AND shifts."clientId" = auth.uid()::text
        )
    );

-- Step 3: Create an RPC (Remote Procedure Call) to safely submit a bid and enforce the 3-bid cap
CREATE OR REPLACE FUNCTION submit_quote(
    p_job_id text,
    p_provider_id text,
    p_amount numeric,
    p_message text
) RETURNS json AS $$
DECLARE
    v_bid_count int;
    v_selection_method text;
    v_new_quote_id text;
BEGIN
    -- 1. Check if the job is actually a BIDDING job
    SELECT "selectionMethod" INTO v_selection_method
    FROM shifts
    WHERE id = p_job_id;

    IF v_selection_method != 'BIDDING' THEN
        RAISE EXCEPTION 'This job does not accept bids.';
    END IF;

    -- 2. Lock the shift row to prevent race conditions while counting
    -- We use FOR UPDATE to ensure no other transaction can insert a bid for this job simultaneously
    PERFORM 1 FROM shifts WHERE id = p_job_id FOR UPDATE;

    -- 3. Count existing bids
    SELECT count(*) INTO v_bid_count
    FROM quotes
    WHERE "jobId" = p_job_id;

    -- 4. Enforce the 3-bid cap
    IF v_bid_count >= 3 THEN
        RAISE EXCEPTION 'This job has already reached the maximum of 3 bids.';
    END IF;

    -- 5. Insert the new quote
    INSERT INTO quotes ("jobId", "providerId", amount, message, status)
    VALUES (p_job_id, p_provider_id, p_amount, p_message, 'PENDING')
    RETURNING id INTO v_new_quote_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'quote_id', v_new_quote_id,
        'message', 'Quote submitted successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
