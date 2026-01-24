import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription, SUBSCRIPTION_TIERS } from '@/lib/subscription';

// Disable caching for this route - token balance must always be fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/subscription - Get current user's subscription info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);

    return NextResponse.json({
      subscription: {
        tier: subscription.subscription_tier || 'free',
        status: subscription.subscription_status || 'inactive',
        ends_at: subscription.subscription_ends_at,
        next_billing: subscription.next_billing_date,
        canceled_at: subscription.canceled_at,
        auto_renew: subscription.auto_renew ?? true,
        grace_period_ends_at: subscription.grace_period_ends_at,
        trial_ends_at: subscription.trial_ends_at,
        subscription_started_at: subscription.subscription_started_at,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
      },
      _timestamp: Date.now(), // Debug: verify fresh data
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription info' },
      { status: 500 }
    );
  }
}
