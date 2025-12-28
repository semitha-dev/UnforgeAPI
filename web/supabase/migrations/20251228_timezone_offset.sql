-- Migration: Add timezone_offset to flashcard_study_sessions
-- This allows the Biological Rhythm algorithm to analyze study times in the user's local timezone
-- Date: 2025-12-28

-- Add timezone_offset column (minutes offset from UTC, e.g., -300 for EST, 330 for IST)
ALTER TABLE flashcard_study_sessions 
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;

-- Add a computed column for local hour (for efficient queries)
-- We can't use GENERATED ALWAYS AS with another column reference easily, so we'll compute in application
-- But we'll add an index on the raw columns for query efficiency

COMMENT ON COLUMN flashcard_study_sessions.timezone_offset IS 'User timezone offset from UTC in minutes (e.g., -300 for EST, 330 for IST)';

-- Create index for timezone-aware queries
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_timezone 
ON flashcard_study_sessions(user_id, studied_at, timezone_offset);
