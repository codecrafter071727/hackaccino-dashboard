-- SQL to remove the duty check constraint and support multiple roles
-- Run this in your Supabase SQL Editor

ALTER TABLE staff_assignments 
DROP CONSTRAINT IF EXISTS staff_assignments_duty_check;

-- Optional: If you want to allow longer duty strings (multiple roles)
ALTER TABLE staff_assignments 
ALTER COLUMN duty TYPE TEXT;
