-- Migration: Insights Feature
-- Stores daily insights generated for users

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  insight_type VARCHAR(50) NOT NULL, -- 'knowledge_heatmap', 'biological_rhythm', 'forgetting_curve', 'content_gap'
  category VARCHAR(50), -- 'blind_spot', 'illusion_of_competence', 'peak_performance', 'decay_warning', 'missing_topic'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical', 'success'
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  related_note_id UUID,
  related_flashcard_set_id UUID,
  metadata JSONB DEFAULT '{}', -- Additional data like accuracy %, topics, etc.
  is_actionable BOOLEAN DEFAULT TRUE,
  action_type VARCHAR(50), -- 'create_flashcard', 'review_note', 'reschedule', 'generate_content'
  action_data JSONB DEFAULT '{}', -- Data needed to perform the action
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_insights_user_date ON insights(user_id, insight_date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_user_type ON insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_not_dismissed ON insights(user_id, is_dismissed) WHERE is_dismissed = FALSE;

-- Enable RLS
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insights"
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert insights"
  ON insights FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own insights"
  ON insights FOR DELETE
  USING (auth.uid() = user_id);

-- Daily briefing preferences
CREATE TABLE IF NOT EXISTS insight_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_types JSONB DEFAULT '["knowledge_heatmap", "biological_rhythm", "forgetting_curve", "content_gap"]',
  notification_time TIME DEFAULT '08:00:00',
  show_on_dashboard BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE insight_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for preferences
CREATE POLICY "Users can view their own preferences"
  ON insight_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON insight_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON insight_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Flashcard study sessions for tracking accuracy by time
-- (Extends existing flashcard functionality)
CREATE TABLE IF NOT EXISTS flashcard_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_set_id UUID REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  flashcard_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  response_time_ms INTEGER,
  studied_at TIMESTAMPTZ DEFAULT NOW(),
  hour_of_day INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM studied_at AT TIME ZONE 'UTC')) STORED
);

CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_user ON flashcard_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_hour ON flashcard_study_sessions(user_id, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_date ON flashcard_study_sessions(user_id, studied_at);

-- Enable RLS
ALTER TABLE flashcard_study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own study sessions"
  ON flashcard_study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON flashcard_study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note concept extraction cache (for Knowledge Heatmap)
CREATE TABLE IF NOT EXISTS note_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concepts JSONB NOT NULL, -- Array of extracted concepts
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_concepts_note ON note_concepts(note_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_user ON note_concepts(user_id);

-- Enable RLS
ALTER TABLE note_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note concepts"
  ON note_concepts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage note concepts"
  ON note_concepts FOR ALL
  WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE insights IS 'Stores personalized learning insights generated daily for users';
COMMENT ON TABLE flashcard_study_sessions IS 'Tracks individual flashcard study events for accuracy analysis';
COMMENT ON TABLE note_concepts IS 'Caches AI-extracted concepts from notes for knowledge heatmap';
