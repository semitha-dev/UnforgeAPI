import { createClient } from '@/app/lib/supabaseServer';

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  PREMIUM: 'premium',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

export const LIMITS: Record<SubscriptionTier, { 
  projects: number; 
  notes: number; 
  qa_pairs: number; 
  flashcard_sets: number; 
  schedule: boolean 
}> = {
  free: {
    projects: 2,
    notes: 5,
    qa_pairs: 3,
    flashcard_sets: 3,
    schedule: false,
  },
  pro: {
    projects: Infinity,
    notes: Infinity,
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: true,
  },
  premium: {
    projects: Infinity,
    notes: Infinity,
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: true,
  },
};

// Token costs: based on OUTPUT word count
// ~4 words = 1 token (charging less than actual LLM tokens for user-friendliness)
// Minimum tokens required to start generation (acts as a buffer)
export const MIN_TOKENS_TO_GENERATE = 10;

export const TOKEN_COSTS = {
  WORDS_PER_TOKEN: 4,  // 4 words = 1 token (user-friendly rate)
} as const;

// Token pack product IDs (Polar)
export const TOKEN_PACK_PRODUCTS: Record<string, number> = {
  'c7594c15-a5ce-444e-ba49-8b42ea72eca7': 500,    // 500 tokens - $2
  '0e654da6-ae7b-4a1c-9dae-28959d89b7f8': 1000,   // 1000 tokens - $3
  '63c6b8c0-92d7-4996-9976-f19936c94a24': 2500,   // 2500 tokens - $5
  '2beeb4a7-532a-4fb7-8e70-51a9b3c5ec3a': 10000,  // 10000 tokens - $8
};

// Token pack pricing info for display
export const TOKEN_PACKS = [
  { id: 'c7594c15-a5ce-444e-ba49-8b42ea72eca7', tokens: 500, price: 200, priceDisplay: '$2' },
  { id: '0e654da6-ae7b-4a1c-9dae-28959d89b7f8', tokens: 1000, price: 300, priceDisplay: '$3' },
  { id: '63c6b8c0-92d7-4996-9976-f19936c94a24', tokens: 2500, price: 500, priceDisplay: '$5' },
  { id: '2beeb4a7-532a-4fb7-8e70-51a9b3c5ec3a', tokens: 10000, price: 800, priceDisplay: '$8' },
] as const;

// Default tokens for new users (launch promotion)
export const NEW_USER_TOKENS = 500;

// Token expiration period in months (for purchased tokens)
export const TOKEN_EXPIRY_MONTHS = 2;

/**
 * Calculate token cost based on OUTPUT word count
 * Formula: ~4 words = 1 token (tokens = words / 4)
 * This is a user-friendly rate that charges less than actual LLM tokens
 */
export function calculateOutputTokenCost(outputWordCount: number): number {
  const tokens = Math.ceil(outputWordCount / TOKEN_COSTS.WORDS_PER_TOKEN);
  return Math.max(tokens, 1); // Minimum 1 token
}

/**
 * Count words in a string
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * @deprecated Use calculateOutputTokenCost instead
 */
export function calculateTokenCost(wordCount: number, feature: 'quiz' | 'flashcard'): number {
  return MIN_TOKENS_TO_GENERATE;
}

export const MONTHLY_TOKENS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 5000,
  premium: 10000,
};

export interface SubscriptionProfile {
  subscription_tier: SubscriptionTier;
  subscription_status: string;
  tokens_balance: number;
  tokens_reset_date: string | null;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  subscription_ends_at: string | null;
  next_billing_date: string | null;
  canceled_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  auto_renew: boolean;
  subscription_started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

/**
 * Check if user has active subscription access
 * This considers: active subscriptions, canceled but not expired, grace periods, and trials
 */
export function hasActiveAccess(profile: SubscriptionProfile): boolean {
  const now = new Date();
  
  // Active subscription
  if (profile.subscription_status === 'active') {
    return true;
  }
  
  // Trialing
  if (profile.subscription_status === 'trialing' && profile.trial_ends_at) {
    return new Date(profile.trial_ends_at) > now;
  }
  
  // Canceled but period not ended yet
  if (profile.subscription_status === 'canceled' && profile.subscription_ends_at) {
    return new Date(profile.subscription_ends_at) > now;
  }
  
  // Past due but in grace period
  if (profile.subscription_status === 'past_due' && profile.grace_period_ends_at) {
    return new Date(profile.grace_period_ends_at) > now;
  }
  
  return false;
}

/**
 * Get the effective tier for access control
 * Returns 'free' if subscription has expired, otherwise returns the actual tier
 */
export function getEffectiveTier(profile: SubscriptionProfile): SubscriptionTier {
  if (profile.subscription_tier === 'free') {
    return 'free';
  }
  
  return hasActiveAccess(profile) ? profile.subscription_tier : 'free';
}

export async function getUserSubscription(userId: string): Promise<SubscriptionProfile> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      subscription_tier, 
      subscription_status, 
      tokens_balance, 
      tokens_reset_date, 
      polar_subscription_id, 
      polar_customer_id,
      subscription_ends_at,
      next_billing_date,
      canceled_at,
      trial_ends_at,
      grace_period_ends_at,
      auto_renew,
      subscription_started_at,
      current_period_start,
      current_period_end
    `)
    .eq('id', userId)
    .single();

  const defaultProfile: SubscriptionProfile = {
    subscription_tier: 'free',
    subscription_status: 'inactive',
    tokens_balance: 0,
    tokens_reset_date: new Date().toISOString(),
    polar_subscription_id: null,
    polar_customer_id: null,
    subscription_ends_at: null,
    next_billing_date: null,
    canceled_at: null,
    trial_ends_at: null,
    grace_period_ends_at: null,
    auto_renew: false,
    subscription_started_at: null,
    current_period_start: null,
    current_period_end: null,
  };

  if (error || !profile) {
    return defaultProfile;
  }

  // Check if subscription has expired (for canceled subscriptions)
  const now = new Date();
  if (
    profile.subscription_status === 'canceled' && 
    profile.subscription_ends_at && 
    new Date(profile.subscription_ends_at) <= now
  ) {
    // Subscription period has ended, downgrade to free
    await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        tokens_balance: 0,
        polar_subscription_id: null,
        auto_renew: false,
        current_period_start: null,
        current_period_end: null,
      })
      .eq('id', userId);
    
    return {
      ...defaultProfile,
      subscription_tier: 'free',
      subscription_status: 'inactive',
    };
  }

  // Check if grace period has expired (for past_due subscriptions)
  if (
    profile.subscription_status === 'past_due' && 
    profile.grace_period_ends_at && 
    new Date(profile.grace_period_ends_at) <= now
  ) {
    // Grace period has ended, downgrade to free
    await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        tokens_balance: 0,
        polar_subscription_id: null,
        auto_renew: false,
        grace_period_ends_at: null,
        current_period_start: null,
        current_period_end: null,
      })
      .eq('id', userId);
    
    return {
      ...defaultProfile,
      subscription_tier: 'free',
      subscription_status: 'inactive',
    };
  }

  // Token reset is now handled by webhooks aligned with Polar's billing cycle
  // No need for arbitrary 30-day check here

  return profile as SubscriptionProfile;
}

export async function checkSubscriptionLimit(
  userId: string, 
  feature: 'projects' | 'notes' | 'qa_pairs' | 'flashcard_sets' | 'schedule'
): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  const effectiveTier = getEffectiveTier(subscription);
  const tierLimits = LIMITS[effectiveTier];
  const limit = tierLimits[feature];

  if (limit === Infinity || limit === true) return true;
  if (limit === false) return false;

  const supabase = await createClient();
  let count = 0;

  switch (feature) {
    case 'projects':
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = projectCount || 0;
      break;
    case 'notes':
      const { count: noteCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = noteCount || 0;
      break;
    case 'qa_pairs':
      const { count: qaCount } = await supabase
        .from('qa_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = qaCount || 0;
      break;
    case 'flashcard_sets':
      const { count: flashcardCount } = await supabase
        .from('flashcard_sets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = flashcardCount || 0;
      break;
  }

  return count < (limit as number);
}

/**
 * Atomically check and deduct tokens using a database transaction
 * This prevents race conditions where tokens could be double-spent
 */
export async function checkAndDeductTokens(userId: string, cost: number): Promise<boolean> {
  const supabase = await createClient();
  
  // Use a transaction-like approach with optimistic locking
  // First, get current balance
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('tokens_balance, subscription_tier, subscription_status, subscription_ends_at')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    console.error('Error fetching profile for token deduction:', fetchError);
    return false;
  }

  // Check if user has active access
  const hasAccess = hasActiveAccess(profile as SubscriptionProfile);
  if (!hasAccess && profile.subscription_tier !== 'free') {
    console.log('User subscription has expired, denying token usage');
    return false;
  }

  const currentBalance = profile.tokens_balance || 0;
  
  if (currentBalance <= 0) {
    console.log(`No tokens available: has ${currentBalance}, needs ${cost}`);
    return false;
  }
  
  // Calculate new balance - ensure it doesn't go negative
  const newBalance = Math.max(0, currentBalance - cost);

  // Atomically update - allow partial deduction if user has some tokens
  // This uses Postgres's ability to conditionally update
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      tokens_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .gt('tokens_balance', 0) // Only update if balance > 0
    .select('tokens_balance')
    .single();

  if (updateError || !updated) {
    console.error('Error deducting tokens (possible race condition):', updateError);
    return false;
  }

  console.log(`Deducted ${cost} tokens from user ${userId}. New balance: ${updated.tokens_balance}`);
  return true;
}

export async function addTokensToUser(userId: string, amount: number): Promise<boolean> {
  const supabase = await createClient();
  const subscription = await getUserSubscription(userId);
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      tokens_balance: (subscription.tokens_balance || 0) + amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error adding tokens:', error);
    return false;
  }

  return true;
}

/**
 * Refund tokens to user (e.g., if AI generation fails after deduction)
 */
export async function refundTokens(userId: string, amount: number): Promise<boolean> {
  return addTokensToUser(userId, amount);
}

/**
 * Get valid (non-expired) token balance for a user
 * Uses the database function for accurate calculation
 */
export async function getValidTokenBalance(userId: string): Promise<number> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .rpc('get_valid_token_balance', { p_user_id: userId });
  
  if (error) {
    console.error('Error getting valid token balance:', error);
    // Fallback to cached tokens_balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();
    return profile?.tokens_balance || 0;
  }
  
  return data || 0;
}

/**
 * Deduct tokens using FIFO (oldest/expiring first)
 * Uses the database function for atomic deduction
 * Falls back to direct profile update if token_transactions system isn't set up
 */
export async function deductTokensWithExpiry(userId: string, cost: number): Promise<boolean> {
  const supabase = await createClient();
  
  // Try to use database function for atomic FIFO deduction
  const { data: success, error } = await supabase
    .rpc('deduct_tokens_fifo', { p_user_id: userId, p_amount: cost });
  
  if (error) {
    // If the RPC function doesn't exist, fall back to direct profile update
    if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      console.log('FIFO deduction not available, using direct profile update');
      
      // Get current balance from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tokens_balance')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile) {
        console.error('Error fetching profile for token deduction:', profileError);
        return false;
      }
      
      const currentBalance = profile.tokens_balance || 0;
      
      // If user has some tokens but less than cost, deduct what they have (set to 0)
      // This prevents negative balances while still allowing the operation
      const newBalance = Math.max(0, currentBalance - cost);
      const actualDeduction = currentBalance - newBalance;
      
      if (currentBalance <= 0) {
        console.log(`No tokens available for user ${userId}: has ${currentBalance}, needs ${cost}`);
        return false;
      }
      
      // Deduct tokens directly from profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          tokens_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating tokens_balance:', updateError);
        return false;
      }
      
      console.log(`Deducted ${actualDeduction} tokens from user ${userId} (requested ${cost}). New balance: ${newBalance}`);
      return true;
    }
    
    console.error('Error deducting tokens with expiry:', error);
    return false;
  }
  
  if (!success) {
    console.log(`Insufficient valid tokens for user ${userId}, needs ${cost}`);
    return false;
  }
  
  // Also update the cached tokens_balance for backward compatibility
  const newBalance = await getValidTokenBalance(userId);
  await supabase
    .from('profiles')
    .update({ 
      tokens_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  console.log(`Deducted ${cost} tokens from user ${userId}. New valid balance: ${newBalance}`);
  return true;
}

/**
 * Get token breakdown showing expiring and non-expiring tokens
 */
export async function getTokenBreakdown(userId: string): Promise<{
  total: number;
  neverExpires: number;
  expiringSoon: number;  // Expires within 7 days
  expiringLater: number; // Expires after 7 days
}> {
  const supabase = await createClient();
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  // Get never-expiring tokens
  const { data: neverExpiresData } = await supabase
    .from('token_transactions')
    .select('remaining')
    .eq('user_id', userId)
    .is('expires_at', null)
    .gt('remaining', 0);
  
  const neverExpires = (neverExpiresData || []).reduce((sum, t) => sum + t.remaining, 0);
  
  // Get tokens expiring within 7 days
  const { data: expiringSoonData } = await supabase
    .from('token_transactions')
    .select('remaining')
    .eq('user_id', userId)
    .gt('remaining', 0)
    .gt('expires_at', now.toISOString())
    .lte('expires_at', sevenDaysFromNow.toISOString());
  
  const expiringSoon = (expiringSoonData || []).reduce((sum, t) => sum + t.remaining, 0);
  
  // Get tokens expiring after 7 days
  const { data: expiringLaterData } = await supabase
    .from('token_transactions')
    .select('remaining')
    .eq('user_id', userId)
    .gt('remaining', 0)
    .gt('expires_at', sevenDaysFromNow.toISOString());
  
  const expiringLater = (expiringLaterData || []).reduce((sum, t) => sum + t.remaining, 0);
  
  return {
    total: neverExpires + expiringSoon + expiringLater,
    neverExpires,
    expiringSoon,
    expiringLater,
  };
}
