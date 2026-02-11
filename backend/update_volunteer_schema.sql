
-- Add is_present column to volunteer_room_assignments table
-- Run this in your Supabase SQL Editor

ALTER TABLE volunteer_room_assignments 
ADD COLUMN IF NOT EXISTS is_present BOOLEAN DEFAULT FALSE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
