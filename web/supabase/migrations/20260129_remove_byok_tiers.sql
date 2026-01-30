-- Migration: Remove BYOK Tiers
-- Description: Convert existing BYOK keys to managed tiers
-- Date: 2026-01-29

-- Update existing BYOK keys to managed tiers
-- byok_pro -> managed_pro (closest equivalent)
-- byok_starter -> sandbox (free tier equivalent)
UPDATE api_keys
SET tier = 'managed_pro',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{plan}',
      '"managed_pro"'::jsonb
    ),
    metadata = jsonb_set(
      metadata,
      '{requiresUserKeys}',
      'false'::jsonb
    )
WHERE tier = 'byok_pro';

UPDATE api_keys
SET tier = 'sandbox',
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{plan}',
      '"sandbox"'::jsonb
    ),
    metadata = jsonb_set(
      metadata,
      '{requiresUserKeys}',
      'false'::jsonb
    )
WHERE tier = 'byok_starter' OR tier = 'byok';

-- Update profiles with BYOK subscriptions to managed tiers
UPDATE profiles
SET subscription_tier = 'managed_pro'
WHERE subscription_tier = 'byok_pro';

UPDATE profiles
SET subscription_tier = 'sandbox'
WHERE subscription_tier = 'byok_starter';

-- Add comment for documentation
COMMENT ON COLUMN api_keys.tier IS 'API key tier: sandbox, managed_pro, managed_expert (BYOK tiers deprecated as of 2026-01-29)';
