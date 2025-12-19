-- Migration to allow multiple preferred times for schedules
-- This enables students to study at multiple times of day (e.g., morning AND evening)

-- First, drop the existing check constraint
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_preferred_time_check;

-- Change the column type from text to text array
ALTER TABLE schedules 
ALTER COLUMN preferred_time TYPE text[] 
USING ARRAY[preferred_time];

-- Rename the column to reflect it now holds multiple values
ALTER TABLE schedules RENAME COLUMN preferred_time TO preferred_times;

-- Add a new check constraint that validates each array element
ALTER TABLE schedules ADD CONSTRAINT schedules_preferred_times_check 
CHECK (preferred_times <@ ARRAY['morning', 'afternoon', 'evening']::text[]);
