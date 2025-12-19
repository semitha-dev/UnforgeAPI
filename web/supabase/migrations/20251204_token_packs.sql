-- Migration: Token Pack System
-- Date: 2025-12-04
-- Description: Updates for token pack purchase system (one-time purchases instead of subscriptions)

-- Update default tokens_balance to 100 for new users
ALTER TABLE public.profiles 
ALTER COLUMN tokens_balance SET DEFAULT 100;

-- Add token_purchases table to track purchase history
CREATE TABLE IF NOT EXISTS public.token_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  polar_order_id text NOT NULL,
  polar_product_id text NOT NULL,
  tokens_amount integer NOT NULL,
  price_paid integer NOT NULL, -- in cents
  currency text DEFAULT 'usd',
  purchased_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT token_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT token_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT token_purchases_polar_order_id_unique UNIQUE (polar_order_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS token_purchases_user_id_idx ON public.token_purchases(user_id);
CREATE INDEX IF NOT EXISTS token_purchases_polar_order_id_idx ON public.token_purchases(polar_order_id);

-- Give existing free users 100 tokens (only if they have 0 tokens)
UPDATE public.profiles 
SET tokens_balance = 100 
WHERE subscription_tier = 'free' 
  AND tokens_balance = 0;

-- Comment on table
COMMENT ON TABLE public.token_purchases IS 'Tracks all token pack purchases made by users';
COMMENT ON COLUMN public.token_purchases.tokens_amount IS 'Number of tokens purchased';
COMMENT ON COLUMN public.token_purchases.price_paid IS 'Amount paid in cents (e.g., 200 = $2.00)';
