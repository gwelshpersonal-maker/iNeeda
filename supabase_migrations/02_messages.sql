-- Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shiftId" text NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    "senderId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text,
    timestamp timestamptz DEFAULT now(),
    read boolean DEFAULT false,
    "hiddenBy" text[] DEFAULT '{}',
    attachments jsonb DEFAULT '[]'
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add attachments column if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';

-- Policies
DROP POLICY IF EXISTS "Users can view messages for their shifts" ON messages;
CREATE POLICY "Users can view messages for their shifts" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shifts
            WHERE shifts.id = messages."shiftId"
            AND (shifts."clientId" = auth.uid()::text OR shifts."userId" = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "Users can insert messages for their shifts" ON messages;
CREATE POLICY "Users can insert messages for their shifts" ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shifts
            WHERE shifts.id = messages."shiftId"
            AND (shifts."clientId" = auth.uid()::text OR shifts."userId" = auth.uid()::text)
        )
        AND "senderId" = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own hiddenBy" ON messages;
CREATE POLICY "Users can update their own hiddenBy" ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shifts
            WHERE shifts.id = messages."shiftId"
            AND (shifts."clientId" = auth.uid()::text OR shifts."userId" = auth.uid()::text)
        )
    );
