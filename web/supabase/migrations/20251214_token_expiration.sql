-- Token Expiration System Migration
-- Creates token_transactions table for tracking token batches with expiration dates
-- Purchased tokens expire after 2 months, signup tokens never expire

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS public.token_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,           -- Original tokens in this batch
    remaining INTEGER NOT NULL,        -- Tokens still available
    source VARCHAR(50) NOT NULL,       -- 'signup', 'purchase', 'subscription', 'refund', 'admin'
    expires_at TIMESTAMPTZ,            -- NULL = never expires (for signup tokens)
    polar_order_id VARCHAR(255),       -- For purchases, links to polar order
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_remaining CHECK (remaining >= 0 AND remaining <= amount)
);

-- Create indexes for efficient queries
CREATE INDEX idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX idx_token_transactions_expires_at ON public.token_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_token_transactions_user_remaining ON public.token_transactions(user_id, remaining) WHERE remaining > 0;

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token transactions
CREATE POLICY "Users can view own token transactions"
    ON public.token_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update (webhooks and server-side)
CREATE POLICY "Service role can manage token transactions"
    ON public.token_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- Function to get valid (non-expired) token balance for a user
CREATE OR REPLACE FUNCTION get_valid_token_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT COALESCE(SUM(remaining), 0) INTO v_balance
    FROM public.token_transactions
    WHERE user_id = p_user_id
      AND remaining > 0
      AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct tokens using FIFO (oldest first, prioritizing expiring tokens)
-- Returns true if deduction was successful, false if insufficient tokens
CREATE OR REPLACE FUNCTION deduct_tokens_fifo(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_remaining INTEGER := p_amount;
    v_available INTEGER;
    v_record RECORD;
BEGIN
    -- First check if user has enough valid tokens
    SELECT COALESCE(SUM(remaining), 0) INTO v_available
    FROM public.token_transactions
    WHERE user_id = p_user_id
      AND remaining > 0
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF v_available < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct tokens in FIFO order:
    -- 1. First use tokens that will expire soonest (non-null expires_at, ordered by expires_at)
    -- 2. Then use tokens that never expire (null expires_at, ordered by created_at)
    FOR v_record IN 
        SELECT id, remaining
        FROM public.token_transactions
        WHERE user_id = p_user_id
          AND remaining > 0
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY 
            CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,  -- Expiring tokens first
            expires_at ASC NULLS LAST,                        -- Soonest expiring first
            created_at ASC                                    -- Oldest first for never-expiring
        FOR UPDATE
    LOOP
        IF v_remaining <= 0 THEN
            EXIT;
        END IF;
        
        IF v_record.remaining >= v_remaining THEN
            -- This batch has enough
            UPDATE public.token_transactions
            SET remaining = remaining - v_remaining,
                updated_at = NOW()
            WHERE id = v_record.id;
            v_remaining := 0;
        ELSE
            -- Use all from this batch and continue
            v_remaining := v_remaining - v_record.remaining;
            UPDATE public.token_transactions
            SET remaining = 0,
                updated_at = NOW()
            WHERE id = v_record.id;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing token balances to token_transactions
-- All existing tokens will be treated as signup tokens (never expire)
INSERT INTO public.token_transactions (user_id, amount, remaining, source, expires_at, created_at)
SELECT 
    id,
    tokens_balance,
    tokens_balance,
    'signup',
    NULL,  -- Never expires
    COALESCE(created_at, NOW())
FROM public.profiles
WHERE tokens_balance > 0;

-- Comment: After this migration is applied and verified working:
-- 1. The tokens_balance column in profiles can be kept as a cached value for quick reads
-- 2. Or it can be removed entirely if all queries use get_valid_token_balance()
-- For now, we'll update tokens_balance as a sync/cache value for backward compatibility

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_valid_token_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_tokens_fifo(UUID, INTEGER) TO authenticated;
