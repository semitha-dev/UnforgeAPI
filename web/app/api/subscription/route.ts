import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription, getValidTokenBalance, getTokenBreakdown, SUBSCRIPTION_TIERS, LIMITS } from '@/lib/subscription';

// GET /api/subscription - Get current user's subscription info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);
    const tier = subscription.subscription_tier || SUBSCRIPTION_TIERS.FREE;
    const limits = LIMITS[tier];

    // Get valid (non-expired) token balance and breakdown
    const [validBalance, tokenBreakdown] = await Promise.all([
      getValidTokenBalance(user.id),
      getTokenBreakdown(user.id),
    ]);

    // Get current usage counts
    const [projectsResult, notesResult, flashcardsResult, qaResult] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('flashcard_sets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('qa_pairs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    return NextResponse.json({
      subscription: {
        tier: subscription.subscription_tier || 'free',
        status: subscription.subscription_status || 'inactive',
        tokens_balance: validBalance, // Use valid (non-expired) token balance
        tokens_breakdown: tokenBreakdown, // Include breakdown for UI
        tokens_reset_date: subscription.tokens_reset_date,
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
      limits: {
        projects: limits.projects === Infinity ? 'Unlimited' : limits.projects,
        notes: limits.notes === Infinity ? 'Unlimited' : limits.notes,
        flashcard_sets: limits.flashcard_sets === Infinity ? 'Unlimited' : limits.flashcard_sets,
        qa_pairs: limits.qa_pairs === Infinity ? 'Unlimited' : limits.qa_pairs,
        schedule: limits.schedule,
      },
      usage: {
        projects: projectsResult.count || 0,
        notes: notesResult.count || 0,
        flashcard_sets: flashcardsResult.count || 0,
        qa_pairs: qaResult.count || 0,
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
