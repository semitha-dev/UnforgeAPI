-- Create api_usage table for tracking API key usage
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  key_id TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('CHAT', 'CONTEXT', 'RESEARCH')),
  latency_ms INTEGER,
  query_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_usage_workspace_id ON api_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_id ON api_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_intent ON api_usage(intent);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_api_usage_workspace_date ON api_usage(workspace_id, created_at DESC);

-- Enable RLS (Row Level Security) 
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for API routes)
CREATE POLICY "Service role full access" ON api_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE api_usage IS 'Tracks API usage for UnforgeAPI - each row is one API call';
