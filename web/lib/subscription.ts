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

export async function getUserSubscription(userId: string): Promise<SubscriptionProfile> {
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

  return profile as SubscriptionProfile;
}

export async function checkSubscriptionLimit(
  userId: string, 
  feature: 'spaces' | 'notes' | 'qa_pairs' | 'flashcard_sets' | 'schedule'
): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  const effectiveTier = getEffectiveTier(subscription);
  const tierLimits = LIMITS[effectiveTier];
  const limit = tierLimits[feature as keyof typeof tierLimits];

  if (limit === Infinity || limit === true) return true;
  if (limit === false) return false;

  const supabase = await createClient();
  let count = 0;

  switch (feature) {
    case 'spaces':
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
