// Client-safe subscription constants
// This file contains no server-side imports and can be used in client components

// ============================================
// 4-TIER PRICING STRUCTURE
// ============================================
// Group A: Managed (We pay for LLM keys)
//   - sandbox: Free, 50 req/day, Search disabled
//   - managed_pro: $19.99/mo, 1000 search/mo, Unlimited Chat/Context
// 
// Group B: BYOK (They pay for their keys)
//   - byok_starter: Free, 100 req/day, Must provide x-groq-key & x-tavily-key
//   - byok_pro: $4.99/mo, Unlimited (10 req/sec rate limit)
// ============================================

export const API_PLANS = {
  // Managed tiers (we provide keys)
  SANDBOX: 'sandbox',
  MANAGED_PRO: 'managed_pro',
  // BYOK tiers (user provides keys)
  BYOK_STARTER: 'byok_starter',
  BYOK_PRO: 'byok_pro',
} as const;

export type ApiPlan = typeof API_PLANS[keyof typeof API_PLANS];

// Polar Product IDs
export const POLAR_PRODUCT_IDS = {
  MANAGED_PRO: 'dce7621a-0a26-4d40-927c-7aa0aa95debd',
  BYOK_PRO: 'c4a4824d-8be3-411e-8c15-b198371ebc37',
} as const;

// Plan configuration
export const PLAN_CONFIG: Record<ApiPlan, {
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  limitType: 'daily' | 'monthly' | 'rate';
  limit: number;
  totalLimit?: number; // Fair usage limit (optional)
  duration: number; // in milliseconds
  searchEnabled: boolean;
  requiresUserKeys: boolean;
  features: string[];
}> = {
  sandbox: {
    name: 'Sandbox',
    price: 0,
    priceLabel: 'Free',
    period: '',
    description: 'Perfect for testing the API',
    limitType: 'daily',
    limit: 50,
    duration: 86400000, // 24 hours
    searchEnabled: false,
    requiresUserKeys: false,
    features: [
      '50 requests / day',
      'Chat & Context paths only',
      'Search disabled',
      'System API keys',
      'Community support',
    ],
  },
  managed_pro: {
    name: 'Managed Pro',
    price: 19.99,
    priceLabel: '$20',
    period: '/month',
    description: 'For production applications',
    limitType: 'monthly',
    limit: 1000, // Search requests limit
    totalLimit: 50000, // Fair usage: 50k total requests/month
    duration: 2592000000, // 30 days
    searchEnabled: true,
    requiresUserKeys: false,
    features: [
      'Unlimited Chat & Context',
      '1,000 Web Search requests / month',
      'Full research capabilities',
      'System API keys',
      'Priority support',
      '50,000 req/mo fair usage policy',
    ],
  },
  byok_starter: {
    name: 'BYOK Starter',
    price: 0,
    priceLabel: 'Free',
    period: '',
    description: 'Test the engine with your own keys',
    limitType: 'daily',
    limit: 100,
    duration: 86400000, // 24 hours
    searchEnabled: true,
    requiresUserKeys: true,
    features: [
      '100 requests / day',
      'All three routing paths',
      'Search enabled',
      'Your Groq & Tavily keys',
      'Community support',
    ],
  },
  byok_pro: {
    name: 'BYOK Unlimited',
    price: 4.99,
    priceLabel: '$5',
    period: '/month',
    description: 'Production scale. No limits.',
    limitType: 'rate',
    limit: 10,
    duration: 1000, // 1 second (10 req/sec)
    searchEnabled: true,
    requiresUserKeys: true,
    features: [
      'Unlimited requests',
      '10 req/sec rate limit',
      'All three routing paths',
      'Your Groq & Tavily keys',
      'Premium support',
      'Zero markup on tokens',
    ],
  },
};

// Helper functions
export function isByokPlan(plan: ApiPlan): boolean {
  return plan === 'byok_starter' || plan === 'byok_pro';
}

export function isManagedPlan(plan: ApiPlan): boolean {
  return plan === 'sandbox' || plan === 'managed_pro';
}

export function isPaidPlan(plan: ApiPlan): boolean {
  return plan === 'managed_pro' || plan === 'byok_pro';
}

export function getUnkeyRateLimitConfig(plan: ApiPlan) {
  const config = PLAN_CONFIG[plan];
  return {
    type: 'fast' as const,
    limit: config.limit,
    duration: config.duration,
  };
}

// Legacy exports for backward compatibility
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// Pro subscription product ID (Polar) - Legacy
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
