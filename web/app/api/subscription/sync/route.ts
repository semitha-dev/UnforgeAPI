import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true'
  ? 'https://sandbox-api.polar.sh/v1'
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

// Map product IDs to subscription tiers
const PRODUCT_TO_TIER: Record<string, string> = {
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro',
  [process.env.POLAR_PREMIUM_PRODUCT_ID || '']: 'premium',
};

// Token allocation per tier
const MONTHLY_TOKENS: Record<string, number> = {
  free: 0,
  pro: 5000,
  premium: 10000,
};

export async function POST(request: NextRequest) {
  console.log('=== SYNC SUBSCRIPTION CALLED ===');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      console.log('Not authenticated:', authError?.message);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('User:', user.id, user.email);

    if (!POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    const customerEmail = user.email;
    console.log('Searching for customer with email:', customerEmail);

    // Get all subscriptions for this customer email (including canceled ones)
    const subsResponse = await fetch(
      `${POLAR_API_URL}/subscriptions/?customer_email=${encodeURIComponent(customerEmail || '')}`,
      {
        headers: {
          'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Polar subscriptions response status:', subsResponse.status);
    const subsData = await subsResponse.json();
    console.log('Polar subscriptions data:', JSON.stringify(subsData, null, 2));

    if (!subsResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch subscriptions from Polar',
        details: subsData 
      }, { status: 500 });
    }

    const subscriptions = subsData.items || [];
    console.log('Found subscriptions:', subscriptions.length);

    // SECURITY: Only consider subscriptions that EXACTLY match this user's email
    // Polar API might return subscriptions for the organization, so we must filter
    const userSubscriptions = subscriptions.filter((s: any) => {
      const subEmail = s.customer?.email || s.user?.email || s.email;
      return subEmail && subEmail.toLowerCase() === customerEmail?.toLowerCase();
    });
    
    console.log('Subscriptions matching user email:', userSubscriptions.length);

    // Find active or most recent subscription FOR THIS USER ONLY
    const activeSubscription = userSubscriptions.find((s: any) => s.status === 'active') 
      || userSubscriptions.find((s: any) => s.status === 'trialing');
    
    // DO NOT fall back to subscriptions[0] - that could be another user's subscription!

    if (!activeSubscription) {
      console.log('No active subscriptions found for this user, setting to free tier');
      
      // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          polar_subscription_id: null,
          polar_customer_id: null,
          subscription_ends_at: null,
          next_billing_date: null,
          canceled_at: null,
          auto_renew: false,
        })
        .eq('id', user.id);

      if (updateError) {
        console.log('Error updating profile:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'No subscription found',
        tier: 'free' 
      });
    }

    console.log('Processing subscription:', activeSubscription);

    // SECURITY: Double-check subscription belongs to this user
    const subscriptionEmail = activeSubscription.customer?.email || activeSubscription.user?.email || activeSubscription.email;
    if (!subscriptionEmail || subscriptionEmail.toLowerCase() !== customerEmail?.toLowerCase()) {
      console.error('SECURITY: Subscription email mismatch!', { subscriptionEmail, customerEmail });
      return NextResponse.json({ 
        error: 'Subscription does not belong to this user',
        tier: 'free'
      }, { status: 403 });
    }

    // Determine tier
    const productId = activeSubscription.product_id || activeSubscription.product?.id;
    let tier = PRODUCT_TO_TIER[productId] || 'free';
    
    if (tier === 'free' && activeSubscription.product?.name) {
      const productName = activeSubscription.product.name.toLowerCase();
      if (productName.includes('premium')) {
        tier = 'premium';
      } else if (productName.includes('pro')) {
        tier = 'pro';
      }
    }

    console.log('Determined tier:', tier);

    // Extract all subscription dates
    const status = activeSubscription.status || 'active';
    const currentPeriodStart = activeSubscription.current_period_start || activeSubscription.started_at;
    const currentPeriodEnd = activeSubscription.current_period_end || activeSubscription.ends_at;
    const canceledAt = activeSubscription.canceled_at;
    const trialEnd = activeSubscription.trial_end || activeSubscription.trial_ends_at;
    const cancelAtPeriodEnd = activeSubscription.cancel_at_period_end;

    // Calculate subscription end date
    let subscriptionEndsAt = currentPeriodEnd;
    if (!subscriptionEndsAt && currentPeriodStart) {
      const endDate = new Date(currentPeriodStart);
      endDate.setMonth(endDate.getMonth() + 1);
      subscriptionEndsAt = endDate.toISOString();
    }

    // Determine next billing date (null if canceled)
    const nextBillingDate = (status === 'canceled' || cancelAtPeriodEnd) ? null : subscriptionEndsAt;

    // Get current profile to check if we should reset tokens
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('subscription_tier, tokens_balance, tokens_reset_date, subscription_started_at')
      .eq('id', user.id)
      .single();

    // Determine if tokens should be reset
    let tokensBalance = currentProfile?.tokens_balance || 0;
    let tokensResetDate = currentProfile?.tokens_reset_date;
    
    // Reset tokens if:
    // 1. Tier is upgrading
    // 2. It's been 30+ days since last reset and subscription is active
    const isUpgrade = tier !== 'free' && currentProfile?.subscription_tier === 'free';
    const shouldResetTokens = isUpgrade || (
      status === 'active' && 
      tokensResetDate && 
      (Date.now() - new Date(tokensResetDate).getTime()) >= 30 * 24 * 60 * 60 * 1000
    );

    if (shouldResetTokens) {
      tokensBalance = MONTHLY_TOKENS[tier] || 0;
      tokensResetDate = new Date().toISOString();
    }

    // Build update data
    const updateData: Record<string, any> = {
      subscription_tier: tier,
      subscription_status: status,
      polar_subscription_id: activeSubscription.id,
      polar_customer_id: activeSubscription.customer_id || activeSubscription.customer?.id,
      subscription_ends_at: subscriptionEndsAt,
      next_billing_date: nextBillingDate,
      auto_renew: !cancelAtPeriodEnd && status !== 'canceled',
      updated_at: new Date().toISOString(),
    };

    if (canceledAt) {
      updateData.canceled_at = canceledAt;
    }

    if (trialEnd) {
      updateData.trial_ends_at = trialEnd;
    }

    if (currentPeriodStart && !currentProfile?.subscription_started_at) {
      updateData.subscription_started_at = currentPeriodStart;
    }

    if (shouldResetTokens) {
      updateData.tokens_balance = tokensBalance;
      updateData.tokens_reset_date = tokensResetDate;
    }

    console.log('Updating profile with:', updateData);

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.log('Error updating profile:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('Profile updated successfully');

    return NextResponse.json({
      message: 'Subscription synced successfully',
      subscription: {
        tier: tier,
        status: status,
        subscription_id: activeSubscription.id,
        ends_at: subscriptionEndsAt,
        next_billing_date: nextBillingDate,
        canceled_at: canceledAt,
        auto_renew: !cancelAtPeriodEnd && status !== 'canceled',
        tokens_balance: tokensBalance,
      }
    });

  } catch (error: any) {
    console.log('=== SYNC ERROR ===');
    console.log('Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to sync subscription', details: error.message },
      { status: 500 }
    );
  }
}
