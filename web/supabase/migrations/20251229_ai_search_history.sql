-- AI Search History for Atlas Intelligence System
-- This table stores all AI search queries and responses for learning and analytics

CREATE TABLE IF NOT EXISTS ai_search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Query data
  query TEXT NOT NULL,
  search_query TEXT, -- The rephrased/optimized query sent to search engine
  
  -- Response data
  answer TEXT,
  citations JSONB DEFAULT '[]',
  sources_count INTEGER DEFAULT 0,
  
  -- Study set created from this search (if any)
  study_set_id UUID REFERENCES study_sets(id) ON DELETE SET NULL,
  
  -- Metadata
  model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
  search_engine TEXT DEFAULT 'tavily',
  response_time_ms INTEGER,
  
  -- User feedback (for improving Atlas)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_search_history_user_id ON ai_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_search_history_project_id ON ai_search_history(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_search_history_created_at ON ai_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_search_history_study_set ON ai_search_history(study_set_id) WHERE study_set_id IS NOT NULL;

-- Full text search on queries for Atlas analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_history_query_fts ON ai_search_history USING gin(to_tsvector('english', query));

-- Enable RLS
ALTER TABLE ai_search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search history
CREATE POLICY "Users can view own search history"
  ON ai_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON ai_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search history"
  ON ai_search_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can access all data (for Atlas analytics)
CREATE POLICY "Service role full access"
  ON ai_search_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_ai_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_search_history_updated_at
  BEFORE UPDATE ON ai_search_history
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_search_history_updated_at();

-- Comment for documentation
COMMENT ON TABLE ai_search_history IS 'Stores AI-powered search queries and responses for the Atlas Intelligence System';
