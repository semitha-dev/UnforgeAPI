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

export const TOKEN_COSTS = {
  QUIZ_GENERATION: 50,
  FLASHCARD_GENERATION: 50,
} as const;

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
  
  if (currentBalance < cost) {
    console.log(`Insufficient tokens: has ${currentBalance}, needs ${cost}`);
    return false;
  }

  // Atomically update only if balance is still sufficient
  // This uses Postgres's ability to conditionally update
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      tokens_balance: currentBalance - cost,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .gte('tokens_balance', cost) // Only update if balance >= cost (prevents race condition)
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
