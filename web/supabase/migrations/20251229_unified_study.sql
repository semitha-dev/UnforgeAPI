-- Migration: Unified Study Sets
-- Creates tables for the unified study mode (flashcards + quizzes combined)

-- Study Sets table (like a study session/pack)
CREATE TABLE IF NOT EXISTS study_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_count INTEGER DEFAULT 0,
  flashcard_count INTEGER DEFAULT 0,
  quiz_count INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Items table (individual flashcards or quiz questions)
CREATE TABLE IF NOT EXISTS study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('flashcard', 'quiz')),
  item_order INTEGER DEFAULT 0,
  
  -- Flashcard fields
  front TEXT,
  back TEXT,
  
  -- Quiz fields
  question TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  
  -- Metadata
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Sessions table (tracks individual study attempts)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_set_id UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Session stats
  items_completed INTEGER DEFAULT 0,
  flashcards_reviewed INTEGER DEFAULT 0,
  quiz_correct INTEGER DEFAULT 0,
  quiz_incorrect INTEGER DEFAULT 0,
  total_time_ms INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Study Item Responses (individual responses during a session)
CREATE TABLE IF NOT EXISTS study_item_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  study_item_id UUID NOT NULL REFERENCES study_items(id) ON DELETE CASCADE,
  
  -- Response data
  is_correct BOOLEAN, -- NULL for flashcards where user self-rates
  user_answer TEXT, -- For quiz: A/B/C/D, For flashcard: 'knew'/'didnt_know'
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 5), -- Self-rated confidence
  response_time_ms INTEGER,
  
  -- Timestamps
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_sets_user ON study_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sets_project ON study_sets(project_id);
CREATE INDEX IF NOT EXISTS idx_study_items_set ON study_items(study_set_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_set ON study_sessions(study_set_id);
CREATE INDEX IF NOT EXISTS idx_study_item_responses_session ON study_item_responses(session_id);

-- RLS Policies
ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_item_responses ENABLE ROW LEVEL SECURITY;

-- Study Sets policies
CREATE POLICY "Users can view own study sets" ON study_sets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own study sets" ON study_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sets" ON study_sets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sets" ON study_sets
  FOR DELETE USING (auth.uid() = user_id);

-- Study Items policies  
CREATE POLICY "Users can view own study items" ON study_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own study items" ON study_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study items" ON study_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study items" ON study_items
  FOR DELETE USING (auth.uid() = user_id);

-- Study Sessions policies
CREATE POLICY "Users can view own study sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own study sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Study Item Responses policies
CREATE POLICY "Users can view own responses" ON study_item_responses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own responses" ON study_item_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update study_sets.updated_at
CREATE OR REPLACE FUNCTION update_study_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_sets_updated_at
  BEFORE UPDATE ON study_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sets_updated_at();
