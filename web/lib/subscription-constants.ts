// Client-safe subscription constants
// This file contains no server-side imports and can be used in client components

// ============================================
// 5-TIER PRICING STRUCTURE
// ============================================
// SHARED CREDIT SYSTEM: Standard + Agentic share same pool
// - agentic_loop: false (default) = Single-shot search (faster)
// - agentic_loop: true = Agentic reasoning loop (iterative)
//
// Group A: Managed (We pay for LLM keys)
//   - sandbox (Standard): Free, 50 req/day, 5 Web Research/day, 3 Deep Research/day
//   - managed_pro: $20/mo, 1000 search/mo, 50 Deep Research/mo
//   - managed_expert: $79/mo, 5000 search/mo, 200 Deep Research/mo
// Group B: BYOK (They pay for their keys)
//   - byok_starter: Free, 50 req/day (chat/context/research), 10 Deep Research/day
//   - byok_pro: $4.99/mo, Unlimited standard, 100 agentic/month (Vercel protection)

// ============================================
// API PLANS
// ============================================
export const API_PLANS = {
  // Managed tiers (we provide keys)
  SANDBOX: 'sandbox',
  MANAGED_PRO: 'managed_pro',
  MANAGED_EXPERT: 'managed_expert',
  // BYOK tiers (user provides keys)
  BYOK_STARTER: 'byok_starter',
  BYOK_PRO: 'byok_pro',
  PRO: 'pro',
  FREE: 'free',
} as const;

export type ApiPlan = typeof API_PLANS[keyof typeof API_PLANS];

// Polar Product IDs (from environment variables)
export const POLAR_PRODUCT_IDS = {
  MANAGED_PRO: process.env.POLAR_MANAGED_PRO_PRODUCT_ID!,
  MANAGED_EXPERT: process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID!,
  BYOK_PRO: process.env.POLAR_BYOK_PRO_PRODUCT_ID!,
} as const;

// Deep Research limits per plan
// SHARED CREDIT SYSTEM: Both Standard and Agentic requests consume 1 credit
// - agentic_loop parameter: optional (default: false)
// - false: Single-shot search (faster)
// - true: Agentic reasoning loop (iterative, cross-source verification)
//
// Tier limits (Standard + Agentic share same pool):
// - Sandbox: 3 Total Requests/day
// - Managed Pro: 50 Total Requests/month
// - Managed Expert: 200 Total Requests/month
// - BYOK Starter: 10 Total Requests/day
// - BYOK Pro: Unlimited Standard, but HARD CAP of 100 Agentic/month (Vercel protection)
export const DEEP_RESEARCH_LIMITS: Record<ApiPlan, {
  limit: number;        // -1 = unlimited, 0 = no access
  period: 'daily' | 'monthly';
  description: string;
  byokAgenticCap?: number;  // Hard cap for agentic requests (BYOK Pro only)
}> = {
  sandbox: {
    limit: 3,
    period: 'daily',
    description: '3 deep research requests per day',
  },
  managed_pro: {
    limit: 50,
    period: 'monthly',
    description: '50 deep research requests per month',
  },
  managed_expert: {
    limit: 200,
    period: 'monthly',
    description: '200 deep research requests per month',
  },
  byok_starter: {
    limit: 10,
    period: 'daily',
    description: '10 deep research requests per day',
  },
  byok_pro: {
    limit: -1,  // Unlimited standard requests (rate limited to 10 req/sec)
    period: 'monthly',
    description: 'Unlimited standard, 100 agentic/month',
    byokAgenticCap: 100,  // HARD CAP: 100 agentic requests/month (Vercel execution time protection)
  },
  pro: {
    limit: 50,
    period: 'monthly',
    description: '50 deep research requests per month',
  },
  free: {
    limit: 3,
    period: 'daily',
    description: '3 deep research requests per day',
  }
};

// Web Search limits per plan (for /api/v1/chat RESEARCH intent)
export const WEB_SEARCH_LIMITS: Record<ApiPlan, {
  limit: number;        // -1 = unlimited, 0 = no access
  period: 'daily' | 'monthly';
  description: string;
}> = {
  sandbox: {
    limit: 5,
    period: 'daily',
    description: '5 web searches per day',
  },
  managed_pro: {
    limit: 1000,
    period: 'monthly',
    description: '1,000 web searches per month',
  },
  managed_expert: {
    limit: 5000,
    period: 'monthly',
    description: '5,000 web searches per month',
  },
  byok_starter: {
    limit: -1,  // Unlimited (they pay Tavily directly, 50 req/day API limit is guard)
    period: 'daily',
    description: 'Unlimited (within 50 req/day API limit)',
  },
  byok_pro: {
    limit: -1,  // Unlimited (they pay Tavily directly)
    period: 'daily',
    description: 'Unlimited (your Tavily key)',
  },
  pro: {
    limit: 1000,
    period: 'monthly',
    description: '1,000 web searches per month',
  },
  free: {
    limit: 5,
    period: 'daily',
    description: '5 web searches per day',
  }
};

// Plan configuration
export const PLAN_CONFIG: Record<ApiPlan, {
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  limitType: 'daily' | 'monthly' | 'rate';
  limit: number;
  searchLimit?: number; // Web search requests limit (optional)
  deepResearchLimit?: number; // Deep research requests limit
  deepResearchPeriod?: 'daily' | 'monthly';
  duration: number; // in milliseconds
  searchEnabled: boolean;
  requiresUserKeys: boolean;
  isPriority: boolean; // For queue prioritization
  features: string[];
}> = {
  sandbox: {
    name: 'Sandbox',
    price: 0,
    priceLabel: 'Free',
    period: '',
    description: 'Perfect for testing API',
    limitType: 'daily',
    limit: 50,
    searchLimit: 5,
    deepResearchLimit: 3,
    deepResearchPeriod: 'daily',
    duration: 86400000, // 24 hours
    searchEnabled: true,
    requiresUserKeys: false,
    isPriority: false,
    features: [
      '50 requests / day',
      '5 Web Research / day',
      '3 Deep Research / day (agentic)',
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
    limit: 50000, // Fair usage: 50k total requests/month
    searchLimit: 1000, // Web search requests limit
    deepResearchLimit: 50,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: true,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      'Unlimited Chat & Context',
      '1,000 Web Search / month',
      '50 Deep Research / month (agentic)',
      'System API keys',
      'Priority support',
    ],
  },
  managed_expert: {
    name: 'Managed Expert',
    price: 79,
    priceLabel: '$79',
    period: '/month',
    description: 'For high-volume production apps',
    limitType: 'monthly',
    limit: 200000, // Fair usage: 200k total requests/month
    searchLimit: 5000, // Web search requests limit
    deepResearchLimit: 200,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: true,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      'Unlimited Chat & Context',
      '5,000 Web Search / month',
      '200 Deep Research / month (agentic)',
      'System API keys',
      'Priority support',
      'Dedicated account manager',
    ],
  },
  byok_starter: {
    name: 'BYOK Starter',
    price: 0,
    priceLabel: 'Free',
    period: '',
    description: 'Use your own API keys with our routing',
    limitType: 'daily',
    limit: 50,
    searchLimit: -1, // Unlimited
    deepResearchLimit: 10,
    deepResearchPeriod: 'daily',
    duration: 86400000, // 24 hours
    searchEnabled: true,
    requiresUserKeys: true,
    isPriority: false,
    features: [
      '50 API calls / day (chat/context/research)',
      'Unlimited Web Search',
      '10 Deep Research / day (agentic)',
      'All three routing paths',
      'Your Groq & Tavily keys',
      'Community support',
    ],
  },
  byok_pro: {
    name: 'BYOK Pro',
    price: 4.99,
    priceLabel: '$5',
    period: '/month',
    description: 'Production scale with fair use limits.',
    limitType: 'rate',
    limit: 10,
    searchLimit: -1, // Unlimited
    deepResearchLimit: -1, // Unlimited
    deepResearchPeriod: 'daily',
    duration: 1000, // 1 second (10 req/sec)
    searchEnabled: true,
    requiresUserKeys: true,
    isPriority: true,
    features: [
      'Unlimited requests',
      'Unlimited Deep Research (agentic)',
      '10 req/sec rate limit',
      'All three routing paths',
      'Your Groq & Tavily keys',
      'Premium support',
    ],
  },
  pro: {
    // Legacy mapping for 'pro' -> managed_pro
    name: 'Managed Pro',
    price: 19.99,
    priceLabel: '$20',
    period: '/month',
    description: 'For production applications',
    limitType: 'monthly',
    limit: 50000,
    searchLimit: 1000,
    deepResearchLimit: 50,
    deepResearchPeriod: 'monthly',
    duration: 2592000000,
    searchEnabled: true,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      'Unlimited Chat & Context',
      '1,000 Web Search / month',
      '50 Deep Research / month (agentic)',
      'System API keys',
      'Priority support',
    ],
  },
  free: {
    // Legacy mapping for 'free' -> sandbox
    name: 'Sandbox',
    price: 0,
    priceLabel: 'Free',
    period: '',
    description: 'Perfect for testing API',
    limitType: 'daily',
    limit: 50,
    searchLimit: 5,
    deepResearchLimit: 3,
    deepResearchPeriod: 'daily',
    duration: 86400000,
    searchEnabled: true,
    requiresUserKeys: false,
    isPriority: false,
    features: [
      '50 requests / day',
      '5 Web Research / day',
      '3 Deep Research / day (agentic)',
      'Community support',
    ],
  },
};

// Helper functions
export function isByokPlan(plan: ApiPlan): boolean {
  return plan === 'byok_starter' || plan === 'byok_pro';
}

export function isManagedPlan(plan: ApiPlan): boolean {
  return plan === 'sandbox' || plan === 'managed_pro' || plan === 'managed_expert';
}

export function isPaidPlan(plan: ApiPlan): boolean {
  return plan === 'managed_pro' || plan === 'managed_expert' || plan === 'byok_pro';
}

export function isPriorityPlan(plan: ApiPlan): boolean {
  return PLAN_CONFIG[plan]?.isPriority ?? false;
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
 * Get model to use based on subscription tier
 */
export function getModelForTier(profile: SubscriptionProfile): string {
  return isPro(profile) ? PRO_TIER_MODEL : FREE_TIER_MODEL;
}

/**
 * Get effective tier for access control
 * Returns 'free' if subscription has expired, otherwise returns actual tier
 */
export function getEffectiveTier(profile: SubscriptionProfile): SubscriptionTier {
  if (profile.subscription_tier === 'free') {
    return 'free';
  }

  return hasActiveAccess(profile) ? profile.subscription_tier : 'free';
}
