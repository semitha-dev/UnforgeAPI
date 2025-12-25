-- Schedule System V2 Migration
-- Adds time-boxing, SM-2 spaced repetition, buffer days, and cram mode

-- Update schedules table
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS buffer_day INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_study_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS cram_mode_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cram_mode_activated_at TIMESTAMPTZ;

-- Add comment for buffer_day: 0=Sunday, 1=Monday, etc. -1=disabled
COMMENT ON COLUMN schedules.buffer_day IS 'Day of week for catch-up buffer. 0=Sunday, -1=disabled';
COMMENT ON COLUMN schedules.daily_study_minutes IS 'Target study minutes per day based on difficulty';

-- Update schedule_tasks table for SM-2 algorithm and time boxing
ALTER TABLE schedule_tasks
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS actual_minutes INTEGER,
ADD COLUMN IF NOT EXISTS easiness_factor DECIMAL(3,2) DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS repetition_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_review_quality INTEGER,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS is_cram_task BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_date DATE,
ADD COLUMN IF NOT EXISTS shifted_from DATE;

-- SM-2 Algorithm fields explained:
-- easiness_factor: How easy the item is (2.5 = standard, higher = easier)
-- repetition_number: How many successful reviews
-- interval_days: Current interval between reviews
-- last_review_quality: 0-5 scale (0-2=Hard, 3=Good, 4-5=Easy)
-- next_review_date: When to review next based on SM-2

COMMENT ON COLUMN schedule_tasks.easiness_factor IS 'SM-2 easiness factor (2.5 default)';
COMMENT ON COLUMN schedule_tasks.repetition_number IS 'Number of successful repetitions';
COMMENT ON COLUMN schedule_tasks.interval_days IS 'Current review interval in days';
COMMENT ON COLUMN schedule_tasks.last_review_quality IS 'Last review quality 0-5 (0-2=Hard, 3=Good, 4-5=Easy)';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_next_review ON schedule_tasks(next_review_date) WHERE next_review_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_date_status ON schedule_tasks(task_date, status);

-- Create a view for exam readiness calculation
CREATE OR REPLACE VIEW exam_readiness AS
SELECT 
  s.id as schedule_id,
  s.user_id,
  s.exam_date,
  COUNT(*) FILTER (WHERE st.priority = 'high') as total_high_priority,
  COUNT(*) FILTER (WHERE st.priority = 'high' AND st.status = 'understood') as understood_high_priority,
  COUNT(*) FILTER (WHERE st.priority = 'medium') as total_medium_priority,
  COUNT(*) FILTER (WHERE st.priority = 'medium' AND st.status = 'understood') as understood_medium_priority,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE st.status = 'understood') as completed_tasks,
  COUNT(*) FILTER (WHERE st.status = 'pending') as pending_tasks,
  COUNT(*) FILTER (WHERE st.status = 'need_work') as need_work_tasks,
  COALESCE(SUM(st.estimated_minutes), 0) as total_estimated_minutes,
  COALESCE(SUM(st.estimated_minutes) FILTER (WHERE st.status = 'understood'), 0) as completed_minutes,
  ROUND(
    CASE 
      WHEN COUNT(*) FILTER (WHERE st.priority = 'high') = 0 THEN 100
      ELSE (COUNT(*) FILTER (WHERE st.priority = 'high' AND st.status = 'understood')::DECIMAL / 
            COUNT(*) FILTER (WHERE st.priority = 'high')) * 100
    END, 1
  ) as high_priority_readiness,
  ROUND(
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE st.status = 'understood')::DECIMAL / COUNT(*)) * 100
    END, 1
  ) as overall_readiness
FROM schedules s
LEFT JOIN schedule_tasks st ON s.id = st.schedule_id
GROUP BY s.id, s.user_id, s.exam_date;
