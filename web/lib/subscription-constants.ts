// Client-safe subscription constants
// This file contains no server-side imports and can be used in client components

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// Pro subscription product ID (Polar)
export const PRO_PRODUCT_ID = 'ea4378a7-1373-4fb7-b7e4-bb1b293e10c8';

// Feature limits by tier
export const LIMITS: Record<SubscriptionTier, { 
  spaces: number;           // Max active spaces
  notes: number; 
  qa_pairs: number; 
  flashcard_sets: number; 
  schedule: boolean;
  searchRateLimit: number;  // Searches per minute
  researchSearch: boolean;  // Deep research feature
  contentGapAudit: 'teaser' | 'full';
  morningReport: 'daily' | 'full';
}> = {
  free: {
    spaces: 3,
    notes: Infinity,        // No limit on notes
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: false,
    searchRateLimit: 5,     // 5 searches per minute
    researchSearch: false,  // Locked
    contentGapAudit: 'teaser',
    morningReport: 'daily',
  },
  pro: {
    spaces: Infinity,
    notes: Infinity,
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: true,
    searchRateLimit: Infinity, // Unlimited
    researchSearch: true,
    contentGapAudit: 'full',
    morningReport: 'full',
  },
};

// Model to use for free tier search
export const FREE_TIER_MODEL = 'llama-3.1-8b-instant';
// Model to use for Pro tier search  
export const PRO_TIER_MODEL = 'llama-3.3-70b-versatile';

// Rate limiting for free tier (searches per minute)
export const FREE_TIER_RATE_LIMIT = 5;

export interface SubscriptionProfile {
  subscription_tier: SubscriptionTier;
  subscription_status: string;
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
 * Check if user is on Pro tier with active subscription
 */
export function isPro(profile: SubscriptionProfile): boolean {
  return profile.subscription_tier === 'pro' && hasActiveAccess(profile);
}

/**
 * Get the model to use based on subscription tier
 */
export function getModelForTier(profile: SubscriptionProfile): string {
  return isPro(profile) ? PRO_TIER_MODEL : FREE_TIER_MODEL;
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
