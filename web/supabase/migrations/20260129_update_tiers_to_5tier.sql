-- Migration: Update to 5-Tier System
-- Description: Add managed_indie and managed_production tiers
-- Date: 2026-01-29

-- This migration adds support for the new tier system:
-- - Sandbox (Free): 3 deep research/day
-- - Managed Indie ($8): 25 deep research/month
-- - Managed Pro ($20): 70 deep research/month
-- - Managed Expert ($79): 300 deep research/month
-- - Managed Production ($200): 800 deep research/month

-- No schema changes needed - tier column already supports any string value
-- This migration is informational only

-- Add comment for documentation
COMMENT ON COLUMN api_keys.tier IS 'API key tier: sandbox, managed_indie, managed_pro, managed_expert, managed_production';
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free, managed_indie, managed_pro, managed_expert, managed_production';

-- Note: Existing keys will continue to work
-- Users can upgrade their subscription and create new keys with appropriate tiers
