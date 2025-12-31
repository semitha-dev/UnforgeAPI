-- Add last_seen_at column to profiles for tracking daily login
-- Used to show morning report on first visit of the day

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Add morning_report_shown_at to track when morning report was last shown
-- This prevents showing the modal multiple times in one day
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS morning_report_shown_at DATE;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen 
ON profiles(id, last_seen_at);

-- Comment for documentation
COMMENT ON COLUMN profiles.last_seen_at IS 'Timestamp of last user activity, used for morning report detection';
COMMENT ON COLUMN profiles.morning_report_shown_at IS 'Date when morning report was last shown to prevent duplicate displays';
