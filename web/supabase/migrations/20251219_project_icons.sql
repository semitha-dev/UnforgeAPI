-- Add icon column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'book';

-- Update existing projects to have the default icon
UPDATE projects SET icon = 'book' WHERE icon IS NULL;
