import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// Use sandbox API for testing, production API for live
const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true'
  ? 'https://sandbox-api.polar.sh/v1'
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

// Cancel subscription - schedules cancellation at period end (user keeps access)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_subscription_id, subscription_ends_at, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.polar_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    console.log('Canceling subscription:', profile.polar_subscription_id);

    // Cancel subscription in Polar (this schedules cancellation at period end)
    const response = await fetch(`${POLAR_API_URL}/subscriptions/${profile.polar_subscription_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Polar cancel response:', response.status, responseText);

    if (!response.ok && response.status !== 404) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      console.error('Polar cancel error:', errorData);
      return NextResponse.json({ error: 'Failed to cancel subscription with payment provider' }, { status: 500 });
    }

    // Calculate subscription end date (current period end)
    // If we have it stored, use it; otherwise calculate 30 days from now
    let subscriptionEndsAt = profile.subscription_ends_at;
    if (!subscriptionEndsAt) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      subscriptionEndsAt = endDate.toISOString();
    }

    // Update local subscription status - DON'T downgrade tier yet!
    // User keeps their tier until subscription_ends_at
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        canceled_at: new Date().toISOString(),
        subscription_ends_at: subscriptionEndsAt,
        next_billing_date: null,
        auto_renew: false,
        updated_at: new Date().toISOString(),
        // IMPORTANT: Keep subscription_tier as-is!
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile after cancel:', updateError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription canceled',
      access_until: subscriptionEndsAt,
      tier: profile.subscription_tier,
      note: `You will retain ${profile.subscription_tier} access until ${new Date(subscriptionEndsAt).toLocaleDateString()}`
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// Reactivate a canceled subscription (if still in period) - calls Polar API to uncancel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_subscription_id, subscription_status, subscription_ends_at, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.polar_subscription_id) {
      return NextResponse.json({ error: 'No subscription to reactivate' }, { status: 400 });
    }

    if (profile.subscription_status !== 'canceled') {
      return NextResponse.json({ error: 'Subscription is not canceled' }, { status: 400 });
    }

    // Check if still within the subscription period
    if (profile.subscription_ends_at && new Date(profile.subscription_ends_at) <= new Date()) {
      return NextResponse.json({ 
        error: 'Subscription period has ended. Please subscribe again.' 
      }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    console.log('Reactivating subscription in Polar:', profile.polar_subscription_id);

    // Call Polar API to uncancel/reactivate the subscription
    // Polar uses PATCH to update subscription properties
    const polarResponse = await fetch(`${POLAR_API_URL}/subscriptions/${profile.polar_subscription_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_period_end: false, // This uncancels the subscription
      }),
    });

    const polarResponseText = await polarResponse.text();
    console.log('Polar reactivate response:', polarResponse.status, polarResponseText);

    if (!polarResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(polarResponseText);
      } catch {
        errorData = { message: polarResponseText };
      }
      
      // If Polar doesn't support uncanceling, we can still update locally
      // and the webhook will correct the state on next event
      console.warn('Polar API reactivation failed, updating local state:', errorData);
    }

    // Update local status regardless (webhook will sync if different)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        canceled_at: null,
        auto_renew: true,
        next_billing_date: profile.subscription_ends_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile after reactivation:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription reactivated',
      tier: profile.subscription_tier,
      next_billing: profile.subscription_ends_at,
    });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}

// Get customer portal URL
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's customer ID and subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        polar_customer_id, 
        email, 
        subscription_tier,
        subscription_status,
        subscription_ends_at,
        next_billing_date,
        canceled_at,
        auto_renew,
        tokens_balance
      `)
      .eq('id', user.id)
      .single();

    const isSandbox = process.env.POLAR_SANDBOX === 'true';
    const polarBase = isSandbox ? 'https://sandbox.polar.sh' : 'https://polar.sh';

    // Return subscription details along with portal URL
    return NextResponse.json({ 
      portalUrl: `${polarBase}/purchases/subscriptions`,
      subscription: {
        tier: profile?.subscription_tier || 'free',
        status: profile?.subscription_status || 'inactive',
        ends_at: profile?.subscription_ends_at,
        next_billing: profile?.next_billing_date,
        canceled_at: profile?.canceled_at,
        auto_renew: profile?.auto_renew ?? true,
        tokens_balance: profile?.tokens_balance || 0,
      }
    });
  } catch (error: any) {
    console.error('Error getting portal URL:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription info' },
      { status: 500 }
    );
  }
}
