-- Migration: Project Time Tracking
-- Description: Track time spent by users on individual projects

-- Create table for tracking time spent on projects
CREATE TABLE IF NOT EXISTS public.project_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER, -- calculated duration in seconds
  page_path TEXT, -- which page within the project (notes, flashcards, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_time_logs_user_id ON public.project_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_time_logs_project_id ON public.project_time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_time_logs_user_project ON public.project_time_logs(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_time_logs_created_at ON public.project_time_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view and manage their own time logs
CREATE POLICY "Users can view own time logs"
  ON public.project_time_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time logs"
  ON public.project_time_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time logs"
  ON public.project_time_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own time logs"
  ON public.project_time_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update duration when session_end is set
CREATE OR REPLACE FUNCTION update_project_time_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update duration automatically
CREATE TRIGGER trigger_update_project_time_duration
  BEFORE INSERT OR UPDATE ON public.project_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_project_time_duration();

-- Create a view for aggregated time stats per project
CREATE OR REPLACE VIEW public.project_time_stats AS
SELECT 
  user_id,
  project_id,
  COUNT(*) as total_sessions,
  SUM(duration_seconds) as total_seconds,
  AVG(duration_seconds) as avg_session_seconds,
  MAX(session_end) as last_session,
  DATE_TRUNC('day', created_at) as session_date
FROM public.project_time_logs
WHERE duration_seconds IS NOT NULL
GROUP BY user_id, project_id, DATE_TRUNC('day', created_at);

-- Grant access to the view
GRANT SELECT ON public.project_time_stats TO authenticated;
