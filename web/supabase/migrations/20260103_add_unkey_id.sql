-- Add unkey_id column to api_keys table
-- This stores the Unkey key ID for management (revoke, update, etc.)

ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS unkey_id text UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_unkey_id ON public.api_keys(unkey_id);

COMMENT ON COLUMN public.api_keys.unkey_id IS 'External key ID from Unkey.dev for key management';
