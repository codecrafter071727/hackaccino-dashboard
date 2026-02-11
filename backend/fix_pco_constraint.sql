
-- Fix for PCO Assignment check constraint violation
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing constraint if it exists
ALTER TABLE staff_assignments 
DROP CONSTRAINT IF EXISTS staff_assignments_duty_check;

-- 2. Add the updated constraint including 'PCO Assignment'
ALTER TABLE staff_assignments 
ADD CONSTRAINT staff_assignments_duty_check 
CHECK (duty IN ('Registration', 'Room Allocation', 'PCO Assignment'));

-- 3. Refresh the schema cache (optional but recommended)
NOTIFY pgrst, 'reload schema';
