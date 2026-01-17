// Server-side subscription utilities
// Re-exports client-safe constants for convenience
import { createClient } from '@/app/lib/supabaseServer';

// Re-export all client-safe constants and types
export {
  SUBSCRIPTION_TIERS,
  PRO_PRODUCT_ID,
  LIMITS,
  FREE_TIER_MODEL,
  PRO_TIER_MODEL,
  FREE_TIER_RATE_LIMIT,
  hasActiveAccess,
  isPro,
  getModelForTier,
  getEffectiveTier,
} from './subscription-constants';

export type { SubscriptionTier, SubscriptionProfile } from './subscription-constants';

import type { SubscriptionProfile, SubscriptionTier } from './subscription-constants';
import { LIMITS, getEffectiveTier } from './subscription-constants';

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [Subscription:${tag}]`, JSON.stringify(data, null, 2))
  }
}

export async function getUserSubscription(userId: string): Promise<SubscriptionProfile> {
  debug('getUserSubscription:start', { userId })
  
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      subscription_tier, 
      subscription_status, 
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

  debug('getUserSubscription:query', { 
    userId, 
    error: error?.message,
    profileFound: !!profile 
  })

  const defaultProfile: SubscriptionProfile = {
    subscription_tier: 'free',
    subscription_status: 'inactive',
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
    debug('getUserSubscription:notFound', { 
      userId, 
      error: error?.message,
      returningDefault: true 
    })
    return defaultProfile;
  }

  debug('getUserSubscription:profile', {
    userId,
    subscription_tier: profile.subscription_tier,
    subscription_status: profile.subscription_status,
    polar_subscription_id: profile.polar_subscription_id,
    subscription_ends_at: profile.subscription_ends_at,
    next_billing_date: profile.next_billing_date
  })

  // Check if subscription has expired (for canceled subscriptions)
  const now = new Date();
  if (
    profile.subscription_status === 'canceled' && 
    profile.subscription_ends_at && 
    new Date(profile.subscription_ends_at) <= now
  ) {
    debug('getUserSubscription:expired', {
      userId,
      status: profile.subscription_status,
      endsAt: profile.subscription_ends_at,
      now: now.toISOString()
    })
    
    // Subscription period has ended, downgrade to free
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        polar_subscription_id: null,
        auto_renew: false,
        current_period_start: null,
        current_period_end: null,
      })
      .eq('id', userId);
    
    if (updateError) {
      debug('getUserSubscription:updateError', { error: updateError })
    }
    
    debug('getUserSubscription:downgraded', { userId, newTier: 'free' })
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
    debug('getUserSubscription:graceExpired', {
      userId,
      status: profile.subscription_status,
      gracePeriodEndsAt: profile.grace_period_ends_at,
      now: now.toISOString()
    })
    
    // Grace period has ended, downgrade to free
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        polar_subscription_id: null,
        auto_renew: false,
        grace_period_ends_at: null,
        current_period_start: null,
        current_period_end: null,
      })
      .eq('id', userId);
    
    if (updateError) {
      debug('getUserSubscription:updateError', { error: updateError })
    }
    
    debug('getUserSubscription:graceExpiredDowngraded', { userId, newTier: 'free' })
    return {
      ...defaultProfile,
      subscription_tier: 'free',
      subscription_status: 'inactive',
    };
  }

  debug('getUserSubscription:active', { 
    userId, 
    tier: profile.subscription_tier,
    status: profile.subscription_status 
  })
  return profile as SubscriptionProfile;
}

export async function checkSubscriptionLimit(
  userId: string, 
  feature: 'spaces' | 'notes' | 'qa_pairs' | 'flashcard_sets' | 'schedule'
): Promise<boolean> {
  debug('checkSubscriptionLimit:start', { userId, feature })
  
  const subscription = await getUserSubscription(userId);
  const effectiveTier = getEffectiveTier(subscription);
  const tierLimits = LIMITS[effectiveTier];
  const limit = tierLimits[feature as keyof typeof tierLimits];

  debug('checkSubscriptionLimit:limits', {
    userId,
    feature,
    subscription_tier: subscription.subscription_tier,
    subscription_status: subscription.subscription_status,
    effectiveTier,
    limit,
    limitType: typeof limit
  })

  if (limit === Infinity || limit === true) {
    debug('checkSubscriptionLimit:unlimited', { userId, feature })
    return true;
  }
  if (limit === false) {
    debug('checkSubscriptionLimit:denied', { userId, feature, reason: 'feature not available' })
    return false;
  }

  const supabase = await createClient();
  let count = 0;

  switch (feature) {
    case 'spaces':
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = projectCount || 0;
      debug('checkSubscriptionLimit:count:spaces', { userId, count })
      break;
    case 'notes':
      const { count: noteCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = noteCount || 0;
      debug('checkSubscriptionLimit:count:notes', { userId, count })
      break;
    case 'qa_pairs':
      const { count: qaCount } = await supabase
        .from('qa_pairs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = qaCount || 0;
      debug('checkSubscriptionLimit:count:qa_pairs', { userId, count })
      break;
    case 'flashcard_sets':
      const { count: flashcardCount } = await supabase
        .from('flashcard_sets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      count = flashcardCount || 0;
      debug('checkSubscriptionLimit:count:flashcard_sets', { userId, count })
      break;
  }

  const result = count < (limit as number);
  debug('checkSubscriptionLimit:result', {
    userId,
    feature,
    count,
    limit,
    result,
    remaining: (limit as number) - count
  })
  
  return result;
}
