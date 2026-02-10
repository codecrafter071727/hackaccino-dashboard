-- Run this in your Supabase SQL Editor to add the missing column and refresh the API cache
ALTER TABLE teams ADD COLUMN IF NOT EXISTS allocated_room TEXT;

-- Refresh the PostgREST schema cache to ensure the API sees the new column
NOTIFY pgrst, 'reload schema';
