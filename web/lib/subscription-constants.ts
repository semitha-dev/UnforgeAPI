// Client-safe subscription constants
// This file contains no server-side imports and can be used in client components

// ============================================
// 3-TIER MANAGED PRICING STRUCTURE
// ============================================
// Deep Research API Only (3-iteration agentic loop enforced)
// - Cost per request: ~$0.21 (3 Tavily searches + Cerebras + Groq)
//
// Managed Tiers (We pay for AI/search costs):
//   - sandbox (Free): $0/mo, 10 deep research/month
//   - managed_pro (Pro): $29/mo, 100 deep research/month
//   - managed_expert (Expert): $200/mo, 800 deep research/month

// ============================================
// API PLANS
// ============================================
export const API_PLANS = {
  // Managed tiers (we provide keys)
  SANDBOX: 'sandbox',
  MANAGED_INDIE: 'managed_indie',
  MANAGED_PRO: 'managed_pro',
  MANAGED_EXPERT: 'managed_expert',
  MANAGED_PRODUCTION: 'managed_production',
  // Legacy mappings
  PRO: 'pro',
  FREE: 'free',
} as const;

export type ApiPlan = typeof API_PLANS[keyof typeof API_PLANS];

// Polar Product IDs (from environment variables)
export const POLAR_PRODUCT_IDS = {
  MANAGED_INDIE: process.env.POLAR_MANAGED_INDIE_PRODUCT_ID!,
  MANAGED_PRO: process.env.POLAR_MANAGED_PRO_PRODUCT_ID!,
  MANAGED_EXPERT: process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID!,
  MANAGED_PRODUCTION: process.env.POLAR_MANAGED_PRODUCTION_PRODUCT_ID!,
} as const;

// Deep Research limits per plan
// All tiers use 3-iteration agentic loop (enforced in deep-research endpoint)
// Cost per request: ~$0.21 (3 Tavily + Cerebras + Groq)
export const DEEP_RESEARCH_LIMITS: Record<ApiPlan, {
  limit: number;        // -1 = unlimited, 0 = no access
  period: 'daily' | 'monthly';
  description: string;
}> = {
  sandbox: {
    limit: 10,
    period: 'monthly',
    description: '10 deep research requests per month',
  },
  managed_indie: {
    limit: 25,
    period: 'monthly',
    description: '25 deep research requests per month',
  },
  managed_pro: {
    limit: 100,
    period: 'monthly',
    description: '100 deep research requests per month',
  },
  managed_expert: {
    limit: 800,
    period: 'monthly',
    description: '800 deep research requests per month',
  },
  managed_production: {
    limit: 800,
    period: 'monthly',
    description: '800 deep research requests per month',
  },
  // Legacy mappings
  pro: {
    limit: 100,
    period: 'monthly',
    description: '100 deep research requests per month',
  },
  free: {
    limit: 10,
    period: 'monthly',
    description: '10 deep research requests per month',
  }
};

// Web Search limits per plan (DEPRECATED - Deep Research API only)
// Keeping for backward compatibility but not advertised
export const WEB_SEARCH_LIMITS: Record<ApiPlan, {
  limit: number;        // -1 = unlimited, 0 = no access
  period: 'daily' | 'monthly';
  description: string;
}> = {
  sandbox: {
    limit: 0,
    period: 'daily',
    description: 'Not available',
  },
  managed_indie: {
    limit: 0,
    period: 'monthly',
    description: 'Not available',
  },
  managed_pro: {
    limit: 0,
    period: 'monthly',
    description: 'Not available',
  },
  managed_expert: {
    limit: 0,
    period: 'monthly',
    description: 'Not available',
  },
  managed_production: {
    limit: 0,
    period: 'monthly',
    description: 'Not available',
  },
  pro: {
    limit: 0,
    period: 'monthly',
    description: 'Not available',
  },
  free: {
    limit: 0,
    period: 'daily',
    description: 'Not available',
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
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: '',
    description: 'Perfect for testing',
    limitType: 'monthly',
    limit: 10,
    deepResearchLimit: 10,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: false,
    features: [
      '10 deep research / month',
      '3-iteration agentic loop',
      'Community support',
    ],
  },
  managed_indie: {
    name: 'Managed Indie',
    price: 8,
    priceLabel: '$8',
    period: '/month',
    description: 'For solo developers',
    limitType: 'monthly',
    limit: 25,
    deepResearchLimit: 25,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: false,
    features: [
      '25 deep research / month',
      '3-iteration agentic loop',
      'System API keys',
      'Email support',
    ],
  },
  managed_pro: {
    name: 'Pro',
    price: 29,
    priceLabel: '$29',
    period: '/month',
    description: 'For growing teams',
    limitType: 'monthly',
    limit: 100,
    deepResearchLimit: 100,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      '100 deep research / month',
      '3-iteration agentic loop',
      'Priority support',
    ],
  },
  managed_expert: {
    name: 'Expert',
    price: 200,
    priceLabel: '$200',
    period: '/month',
    description: 'For high-volume production',
    limitType: 'monthly',
    limit: 800,
    deepResearchLimit: 800,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      '800 deep research / month',
      '3-iteration agentic loop',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
  managed_production: {
    name: 'Managed Production',
    price: 200,
    priceLabel: '$200',
    period: '/month',
    description: 'For enterprise & high-volume',
    limitType: 'monthly',
    limit: 800,
    deepResearchLimit: 800,
    deepResearchPeriod: 'monthly',
    duration: 2592000000, // 30 days
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      '800 deep research / month',
      '3-iteration agentic loop',
      'System API keys',
      'Priority support',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
  pro: {
    // Legacy mapping for 'pro' -> managed_pro
    name: 'Managed Pro',
    price: 20,
    priceLabel: '$20',
    period: '/month',
    description: 'For small teams & startups',
    limitType: 'monthly',
    limit: 70,
    deepResearchLimit: 70,
    deepResearchPeriod: 'monthly',
    duration: 2592000000,
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: true,
    features: [
      '70 deep research / month',
      '3-iteration agentic loop',
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
    description: 'Perfect for testing',
    limitType: 'daily',
    limit: 3,
    deepResearchLimit: 3,
    deepResearchPeriod: 'daily',
    duration: 86400000,
    searchEnabled: false,
    requiresUserKeys: false,
    isPriority: false,
    features: [
      '3 deep research / day',
      '3-iteration agentic loop',
      'Community support',
    ],
  },
};

// Helper functions
export function isManagedPlan(plan: ApiPlan): boolean {
  return plan === 'sandbox' || plan === 'managed_indie' || plan === 'managed_pro' ||
    plan === 'managed_expert' || plan === 'managed_production';
}

export function isPaidPlan(plan: ApiPlan): boolean {
  return plan === 'managed_indie' || plan === 'managed_pro' ||
    plan === 'managed_expert' || plan === 'managed_production';
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
