import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [Subscription/Manage:${tag}]`, JSON.stringify(data, null, 2))
  }
}

// Use sandbox API for testing, production API for live
const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true'
  ? 'https://sandbox-api.polar.sh/v1'
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

// Cancel subscription - schedules cancellation at period end (user keeps access)
export async function DELETE(request: NextRequest) {
  debug('DELETE:start', { timestamp: new Date().toISOString() })
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      debug('DELETE:auth:fail', { reason: 'Not authenticated' })
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_subscription_id, subscription_ends_at, subscription_tier')
      .eq('id', user.id)
      .single();

    debug('DELETE:profile', { 
      userId: user.id,
      subscriptionId: profile?.polar_subscription_id,
      tier: profile?.subscription_tier,
      endsAt: profile?.subscription_ends_at
    })

    if (!profile?.polar_subscription_id) {
      debug('DELETE:fail', { reason: 'No active subscription' })
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      debug('DELETE:config:fail', { reason: 'Polar not configured' })
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    debug('DELETE:polar:request', { subscriptionId: profile.polar_subscription_id })

    // Cancel subscription in Polar (this schedules cancellation at period end)
    const response = await fetch(`${POLAR_API_URL}/subscriptions/${profile.polar_subscription_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    debug('DELETE:polar:response', { status: response.status, body: responseText.substring(0, 500) })

    if (!response.ok && response.status !== 404) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      debug('DELETE:polar:error', errorData)
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
      debug('DELETE:db:error', { error: updateError })
    }

    debug('DELETE:success', { 
      tier: profile.subscription_tier,
      accessUntil: subscriptionEndsAt 
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription canceled',
      access_until: subscriptionEndsAt,
      tier: profile.subscription_tier,
      note: `You will retain ${profile.subscription_tier} access until ${new Date(subscriptionEndsAt).toLocaleDateString()}`
    });
  } catch (error: any) {
    debug('DELETE:error', { name: error.name, message: error.message })
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// Reactivate a canceled subscription (if still in period) - calls Polar API to uncancel
export async function POST(request: NextRequest) {
  debug('POST:reactivate:start', { timestamp: new Date().toISOString() })
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      debug('POST:auth:fail', { reason: 'Not authenticated' })
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('polar_subscription_id, subscription_status, subscription_ends_at, subscription_tier')
      .eq('id', user.id)
      .single();

    debug('POST:profile', {
      userId: user.id,
      subscriptionId: profile?.polar_subscription_id,
      status: profile?.subscription_status,
      tier: profile?.subscription_tier,
      endsAt: profile?.subscription_ends_at
    })

    if (!profile?.polar_subscription_id) {
      debug('POST:fail', { reason: 'No subscription to reactivate' })
      return NextResponse.json({ error: 'No subscription to reactivate' }, { status: 400 });
    }

    if (profile.subscription_status !== 'canceled') {
      debug('POST:fail', { reason: 'Subscription is not canceled', currentStatus: profile.subscription_status })
      return NextResponse.json({ error: 'Subscription is not canceled' }, { status: 400 });
    }

    // Check if still within subscription period
    if (profile.subscription_ends_at && new Date(profile.subscription_ends_at) <= new Date()) {
      debug('POST:fail', { reason: 'Subscription period has ended', endsAt: profile.subscription_ends_at })
      return NextResponse.json({ 
        error: 'Subscription period has ended. Please subscribe again.' 
      }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      debug('POST:config:fail', { reason: 'Polar not configured' })
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    debug('POST:polar:request', { subscriptionId: profile.polar_subscription_id })

    // Call Polar API to uncancel/reactivate subscription
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
    debug('POST:polar:response', { status: polarResponse.status, body: polarResponseText.substring(0, 500) })

    if (!polarResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(polarResponseText);
      } catch {
        errorData = { message: polarResponseText };
      }
      
      // If Polar doesn't support uncanceling, we can still update locally
      // and the webhook will correct the state on the next event
      debug('POST:polar:warning', { message: 'Polar API reactivation failed, updating local state', error: errorData })
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
      debug('POST:db:error', { error: updateError })
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
    }

    debug('POST:success', { tier: profile.subscription_tier, nextBilling: profile.subscription_ends_at })

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription reactivated',
      tier: profile.subscription_tier,
      next_billing: profile.subscription_ends_at,
    });
  } catch (error: any) {
    debug('POST:error', { name: error.name, message: error.message })
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}

// Get customer portal URL
export async function GET(request: NextRequest) {
  debug('GET:portal:start', { timestamp: new Date().toISOString() })
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      debug('GET:auth:fail', { reason: 'Not authenticated' })
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

    debug('GET:profile', {
      userId: user.id,
      customerId: profile?.polar_customer_id,
      tier: profile?.subscription_tier,
      status: profile?.subscription_status
    })

    const isSandbox = process.env.POLAR_SANDBOX === 'true';
    const polarBase = isSandbox ? 'https://sandbox.polar.sh' : 'https://polar.sh';
    const orgSlug = process.env.POLAR_ORG_SLUG || 'leaflearning2';

    // Use email from user auth (more reliable) or profile
    const userEmail = user.email || profile?.email;

    let portalUrl: string;

    // If user has a Polar customer ID, try to create a customer session
    if (profile?.polar_customer_id && userEmail && POLAR_ACCESS_TOKEN) {
      debug('GET:create_session:start', { customerId: profile.polar_customer_id, email: userEmail })
      
      try {
        // Create customer session via Polar API
        const sessionResponse = await fetch(`${POLAR_API_URL}/customers/${profile.polar_customer_id}/portal_session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            return_url: `${request.nextUrl.origin}/dashboard/billing`,
          }),
        });

        debug('GET:create_session:response', { status: sessionResponse.status })

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          const customerSessionToken = sessionData.customer_session_token;
          
          // Build portal URL with customer session token
          const encodedEmail = encodeURIComponent(userEmail);
          portalUrl = `${polarBase}/${orgSlug}/portal?customer_session_token=${customerSessionToken}&id=${profile.polar_customer_id}&email=${encodedEmail}`;
          
          debug('GET:success', { hasCustomerId: true, portalUrl })
          
          return NextResponse.json({ 
            portalUrl,
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
        } else {
          const errorText = await sessionResponse.text();
          debug('GET:create_session:fail', { status: sessionResponse.status, error: errorText.substring(0, 200) })
          // Fall through to fallback URL
        }
      } catch (error) {
        debug('GET:create_session:error', { error: (error as Error).message })
        // Fall through to fallback URL
      }
    }

    // Fallback: return portal request URL or org's portal page
    if (profile?.polar_customer_id && userEmail) {
      const encodedEmail = encodeURIComponent(userEmail);
      portalUrl = `${polarBase}/${orgSlug}/portal/request?id=${profile.polar_customer_id}&email=${encodedEmail}`;
    } else {
      portalUrl = `${polarBase}/${orgSlug}/portal`;
    }
    
    debug('GET:success', { hasCustomerId: !!profile?.polar_customer_id, portalUrl })
    
    return NextResponse.json({ 
      portalUrl,
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
    debug('GET:error', { name: error.name, message: error.message })
    return NextResponse.json(
      { error: 'Failed to get subscription info' },
      { status: 500 }
    );
  }
}
