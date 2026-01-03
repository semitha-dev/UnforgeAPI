-- Migration: UnforgeAPI B2B Pivot
-- Date: January 2, 2026
-- Description: Clean up B2C tables and create B2B API platform schema
-- KEEPING: profiles, subscription-related columns, webhook_events

-- =============================================
-- STEP 1: DROP OLD B2C TABLES (careful cleanup)
-- =============================================

-- Drop old study-related tables
DROP TABLE IF EXISTS public.flashcards CASCADE;
DROP TABLE IF EXISTS public.quiz_results CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.study_sets CASCADE;
DROP TABLE IF EXISTS public.study_sessions CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.notes_folders CASCADE;
DROP TABLE IF EXISTS public.note_summaries CASCADE;

-- Drop old project/learning tables
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.project_time_entries CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.schedule_entries CASCADE;
DROP TABLE IF EXISTS public.preferred_times CASCADE;

-- Drop old AI/chat tables
DROP TABLE IF EXISTS public.ai_search_history CASCADE;
DROP TABLE IF EXISTS public.chat_conversations CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.space_chat_history CASCADE;

-- Drop old analytics tables
DROP TABLE IF EXISTS public.daily_research_tracking CASCADE;
DROP TABLE IF EXISTS public.insights CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;

-- Drop old token tracking (we'll create new API usage tracking)
DROP TABLE IF EXISTS public.token_packs CASCADE;
DROP TABLE IF EXISTS public.token_usage CASCADE;
DROP TABLE IF EXISTS public.share_tokens CASCADE;

-- Drop old misc tables
DROP TABLE IF EXISTS public.daily_briefings CASCADE;

-- =============================================
-- STEP 2: CREATE WORKSPACES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT workspace_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

-- =============================================
-- STEP 3: CREATE API KEYS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Key',
  key_prefix text NOT NULL, -- First 8 chars of key for display (uf_xxxx...)
  key_hash text NOT NULL,   -- Hashed key for verification
  
  -- Permissions and limits
  tier text NOT NULL DEFAULT 'sandbox' CHECK (tier IN ('sandbox', 'managed', 'byok')),
  rate_limit_per_minute integer DEFAULT 60,
  rate_limit_per_day integer DEFAULT 1000,
  
  -- BYOK is stateless - users pass keys in headers (x-groq-key, x-tavily-key)
  -- No key storage for security
  
  -- Status
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  
  -- Metadata
  created_by uuid REFERENCES public.profiles(id),
  metadata jsonb DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON public.api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

-- =============================================
-- STEP 4: CREATE API USAGE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  
  -- Request details
  request_id text NOT NULL,
  routed_to text NOT NULL CHECK (routed_to IN ('CHAT', 'CONTEXT', 'RESEARCH')),
  
  -- Timing
  router_latency_ms integer,
  total_latency_ms integer,
  
  -- Costs (in microcents for precision)
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  search_cost_microcents integer DEFAULT 0,
  llm_cost_microcents integer DEFAULT 0,
  total_cost_microcents integer DEFAULT 0,
  
  -- Metadata
  model_used text,
  search_queries_count integer DEFAULT 0,
  cost_saved boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_usage_workspace ON public.api_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON public.api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_route ON public.api_usage(routed_to);

-- =============================================
-- STEP 5: CREATE DAILY USAGE AGGREGATES
-- =============================================

CREATE TABLE IF NOT EXISTS public.daily_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Request counts by route
  chat_requests integer DEFAULT 0,
  context_requests integer DEFAULT 0,
  research_requests integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  
  -- Token usage
  total_input_tokens integer DEFAULT 0,
  total_output_tokens integer DEFAULT 0,
  
  -- Costs
  total_cost_microcents integer DEFAULT 0,
  estimated_savings_microcents integer DEFAULT 0,
  
  -- Latency stats (avg in ms)
  avg_router_latency_ms integer,
  avg_total_latency_ms integer,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(workspace_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_workspace_date ON public.daily_usage_stats(workspace_id, date);

-- =============================================
-- STEP 6: UPDATE PROFILES FOR B2B
-- =============================================

-- Add workspace-related columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS use_case text;

-- Update subscription tier names for B2B
-- Keep existing subscription logic but rename tiers
COMMENT ON COLUMN public.profiles.subscription_tier IS 'B2B tier: sandbox (free), managed ($20/mo), byok ($5/mo)';

-- =============================================
-- STEP 7: CREATE WORKSPACE MEMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid REFERENCES public.profiles(id),
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- =============================================
-- STEP 8: CREATE RATE LIMITING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start timestamp with time zone NOT NULL,
  window_type text NOT NULL CHECK (window_type IN ('minute', 'day')),
  request_count integer DEFAULT 1,
  
  UNIQUE(api_key_id, window_start, window_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON public.rate_limits(api_key_id, window_start);

-- =============================================
-- STEP 9: RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Helper function to check workspace membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- Helper function to check if user is workspace admin
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- Workspace policies (simple, no subqueries to workspace_members)
CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members policies (use direct auth.uid() check)
CREATE POLICY "workspace_members_select" ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "workspace_members_insert" ON public.workspace_members FOR INSERT
  WITH CHECK (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_update" ON public.workspace_members FOR UPDATE
  USING (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_delete" ON public.workspace_members FOR DELETE
  USING (public.user_is_workspace_admin(workspace_id));

-- API Keys policies
CREATE POLICY "api_keys_select" ON public.api_keys FOR SELECT
  USING (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "api_keys_insert" ON public.api_keys FOR INSERT
  WITH CHECK (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "api_keys_update" ON public.api_keys FOR UPDATE
  USING (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "api_keys_delete" ON public.api_keys FOR DELETE
  USING (public.user_is_workspace_admin(workspace_id));

-- Usage policies (any workspace member can view)
CREATE POLICY "api_usage_select" ON public.api_usage FOR SELECT
  USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "daily_stats_select" ON public.daily_usage_stats FOR SELECT
  USING (public.user_has_workspace_access(workspace_id));

-- Rate limits (admin only)
CREATE POLICY "rate_limits_select" ON public.rate_limits FOR SELECT
  USING (api_key_id IN (
    SELECT id FROM public.api_keys WHERE public.user_is_workspace_admin(workspace_id)
  ));

-- =============================================
-- STEP 10: HELPER FUNCTIONS
-- =============================================

-- Function to generate unique workspace slug
CREATE OR REPLACE FUNCTION generate_workspace_slug(workspace_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Create base slug from name
  base_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Check if slug exists and add number if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to create API key hash
CREATE OR REPLACE FUNCTION hash_api_key(raw_key text)
RETURNS text AS $$
BEGIN
  RETURN encode(sha256(raw_key::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 11: TRIGGERS
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_stats_updated_at
  BEFORE UPDATE ON public.daily_usage_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-add owner as workspace member
CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_owner_member
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION add_workspace_owner_as_member();

-- Comments
COMMENT ON TABLE public.workspaces IS 'B2B workspaces for UnforgeAPI customers';
COMMENT ON TABLE public.api_keys IS 'API keys for authenticating UnforgeAPI requests';
COMMENT ON TABLE public.api_usage IS 'Per-request usage tracking for billing and analytics';
COMMENT ON TABLE public.daily_usage_stats IS 'Aggregated daily usage statistics';
COMMENT ON TABLE public.workspace_members IS 'Team members with access to workspaces';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting windows for API keys';
