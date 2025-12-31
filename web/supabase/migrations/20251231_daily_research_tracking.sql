-- Add daily research tracking for free users
-- Free users get 3 research mode queries per day

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_research_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_research_date date DEFAULT CURRENT_DATE;

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_research_tracking 
ON profiles(id, daily_research_date);

-- Comment for documentation
COMMENT ON COLUMN profiles.daily_research_count IS 'Number of research mode queries used today (free users only, resets daily)';
COMMENT ON COLUMN profiles.daily_research_date IS 'Date of last research count reset';
