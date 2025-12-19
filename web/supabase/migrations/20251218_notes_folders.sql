-- Migration to add folder/group support for notes
-- This allows students to organize notes into groups like "Week 1", "Week 2", etc.

-- Add folder column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder VARCHAR(100) DEFAULT NULL;

-- Add index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder);

-- Add index for folder + project combination
CREATE INDEX IF NOT EXISTS idx_notes_project_folder ON notes(project_id, folder);
