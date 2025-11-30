-- Migration: Add comprehensive subscription tracking fields
-- Run this in your Supabase SQL editor

-- Add new subscription tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_billing_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS canceled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;

-- Update subscription_status check constraint to include more statuses
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('inactive', 'active', 'canceled', 'past_due', 'trialing', 'paused'));

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_ends_at ON public.profiles(subscription_ends_at);

-- Create table to track processed webhook events (for idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp with time zone DEFAULT now(),
  payload jsonb,
  status text DEFAULT 'processed',
  created_at timestamp with time zone DEFAULT now()
);

-- Index for quick lookup of event IDs
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
-- Index for cleanup of old events
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);

-- Comment explaining each field:
COMMENT ON COLUMN public.profiles.subscription_ends_at IS 'When the current subscription period ends. User retains access until this date even if canceled.';
COMMENT ON COLUMN public.profiles.next_billing_date IS 'When the next billing cycle will occur. Null if canceled or no auto-renew.';
COMMENT ON COLUMN public.profiles.canceled_at IS 'When the user canceled their subscription. Null if not canceled.';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'When the trial period ends. Null if no trial.';
COMMENT ON COLUMN public.profiles.grace_period_ends_at IS 'End of grace period for failed payments. User retains access during grace period.';
COMMENT ON COLUMN public.profiles.auto_renew IS 'Whether subscription will automatically renew. False when canceled.';
COMMENT ON COLUMN public.profiles.subscription_started_at IS 'When the subscription first became active.';
COMMENT ON COLUMN public.profiles.current_period_start IS 'Start of current billing period from Polar. Used for token reset timing.';
COMMENT ON COLUMN public.profiles.current_period_end IS 'End of current billing period from Polar. Used for token reset timing.';
COMMENT ON TABLE public.webhook_events IS 'Tracks processed webhook events for idempotency. Prevents duplicate processing.';
