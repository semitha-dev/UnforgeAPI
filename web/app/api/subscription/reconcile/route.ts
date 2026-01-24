import { createClient } from '@/app/lib/supabaseServer';
import { createAdminClient } from '@/app/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Daily Subscription Reconciliation Job
 * 
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
 * to reconcile subscription state with Polar in case webhooks are missed.
 * 
 * Recommended: Run daily at a low-traffic time (e.g., 3 AM UTC)
 * 
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/subscription/reconcile",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */

const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true'
  ? 'https://sandbox-api.polar.sh/v1'
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

// Map product IDs to subscription tiers (must match webhook handler)
const PRODUCT_TO_TIER: Record<string, string> = {
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro', // Legacy
  [process.env.POLAR_MANAGED_PRO_PRODUCT_ID || '']: 'managed_pro',
  [process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID || '']: 'managed_expert',
  [process.env.POLAR_BYOK_PRO_PRODUCT_ID || '']: 'byok_pro',
};

// Unkey API URL for key management
const UNKEY_API_URL = 'https://api.unkey.dev';

/**
 * Downgrade API keys when subscription expires
 * Mirrors the logic in webhook handler
 */
async function downgradeUserApiKeys(userId: string): Promise<void> {
  const supabaseAdmin = createAdminClient();

  // Get user's workspace
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single();

  const workspaceId = profile?.default_workspace_id || userId;

  // Get all paid tier API keys for this workspace
  const { data: keys, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, unkey_id, tier, name')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .in('tier', ['managed_pro', 'managed_expert', 'byok_pro', 'pro']);

  if (error || !keys?.length) {
    return;
  }

  console.log(`[Reconcile:Keys] Downgrading ${keys.length} keys for user ${userId}`);

  for (const key of keys) {
    try {
      const newPlan = ['managed_pro', 'managed_expert', 'pro'].includes(key.tier) ? 'sandbox' : 'byok_starter';
      const rateLimitConfig = { type: 'fast' as const, limit: 50, duration: 86400000 }; // 50/day

      // Update key in Unkey
      const unkeyResponse = await fetch(`${UNKEY_API_URL}/v1/keys.updateKey`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNKEY_ROOT_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyId: key.unkey_id,
          meta: {
            plan: newPlan,
            tier: newPlan,
            searchEnabled: true,
            requiresUserKeys: newPlan === 'byok_starter',
            downgradedAt: new Date().toISOString(),
            downgradedBy: 'reconcile_job'
          },
          ratelimit: rateLimitConfig
        })
      });

      if (!unkeyResponse.ok) {
        console.error(`[Reconcile:Keys] Failed to downgrade Unkey key ${key.unkey_id}`);
        continue;
      }

      // Update key in database
      await supabaseAdmin
        .from('api_keys')
        .update({
          tier: newPlan,
          metadata: {
            plan: newPlan,
            searchEnabled: true,
            requiresUserKeys: newPlan === 'byok_starter',
            downgradedAt: new Date().toISOString(),
            downgradedBy: 'reconcile_job'
          }
        })
        .eq('id', key.id);

      console.log(`[Reconcile:Keys] Downgraded key ${key.name} to ${newPlan}`);
    } catch (err) {
      console.error(`[Reconcile:Keys] Error downgrading key ${key.unkey_id}:`, err);
    }
  }
}

// Token allocation per tier
const MONTHLY_TOKENS: Record<string, number> = {
  free: 0,
  pro: 5000,
  premium: 10000,
};

export async function POST(request: NextRequest) {
  console.log('=== SUBSCRIPTION RECONCILIATION JOB STARTED ===');
  const startTime = Date.now();
  
  try {
    // Verify authorization - accept either:
    // 1. Vercel Cron's built-in header (for Vercel cron jobs)
    // 2. Bearer token with CRON_SECRET (for manual/external triggers)
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron) {
      // Not a Vercel cron job - require CRON_SECRET
      if (!CRON_SECRET) {
        console.error('CRON_SECRET not configured - reconciliation endpoint disabled for security');
        return NextResponse.json({ error: 'Endpoint not configured' }, { status: 503 });
      }
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        console.error('Invalid or missing cron secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Polar not configured' }, { status: 500 });
    }

    const supabase = await createClient();
    const now = new Date();
    const results = {
      checked: 0,
      updated: 0,
      expired: 0,
      errors: 0,
      details: [] as string[],
    };

    // 1. Find all users with active paid subscriptions that need checking
    const { data: paidUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, polar_subscription_id, polar_customer_id, subscription_tier, subscription_status, subscription_ends_at, current_period_start, tokens_balance')
      .not('polar_subscription_id', 'is', null)
      .in('subscription_status', ['active', 'canceled', 'past_due', 'trialing']);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    console.log(`Found ${paidUsers?.length || 0} users with paid subscriptions to check`);
    results.checked = paidUsers?.length || 0;

    // 2. Check each user's subscription in Polar
    for (const user of paidUsers || []) {
      try {
        // Skip if no subscription ID
        if (!user.polar_subscription_id) continue;

        // Fetch subscription from Polar
        const polarResponse = await fetch(
          `${POLAR_API_URL}/subscriptions/${user.polar_subscription_id}`,
          {
            headers: {
              'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!polarResponse.ok) {
          if (polarResponse.status === 404) {
            // Subscription not found in Polar - might have been deleted
            console.log(`Subscription ${user.polar_subscription_id} not found in Polar for user ${user.email}`);
            results.details.push(`${user.email}: Subscription not found in Polar`);
            
            // If subscription_ends_at has passed, downgrade
            if (user.subscription_ends_at && new Date(user.subscription_ends_at) <= now) {
              // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
              await supabase
                .from('profiles')
                .update({
                  subscription_tier: 'free',
                  subscription_status: 'inactive',
                  polar_subscription_id: null,
                  auto_renew: false,
                  updated_at: now.toISOString(),
                })
                .eq('id', user.id);

              // Downgrade API keys to match free tier
              await downgradeUserApiKeys(user.id);

              results.expired++;
              results.details.push(`${user.email}: Downgraded to free (subscription not found)`);
            }
            continue;
          }
          
          console.error(`Error fetching subscription for ${user.email}:`, polarResponse.status);
          results.errors++;
          continue;
        }

        const polarSub = await polarResponse.json();
        
        // SECURITY: Verify subscription belongs to this user
        const polarSubEmail = polarSub.customer?.email || polarSub.user?.email || polarSub.email;
        if (polarSubEmail && polarSubEmail.toLowerCase() !== user.email?.toLowerCase()) {
          console.error(`SECURITY: Subscription ${user.polar_subscription_id} belongs to ${polarSubEmail}, not ${user.email}`);
          results.details.push(`${user.email}: SECURITY - subscription email mismatch, downgrading`);
          
          // This is a security issue - clear the mismatched subscription
          // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'inactive',
              polar_subscription_id: null,
              polar_customer_id: null,
              auto_renew: false,
              updated_at: now.toISOString(),
            })
            .eq('id', user.id);
          results.errors++;
          continue;
        }
        
        const polarStatus = polarSub.status || 'active';
        const polarPeriodStart = polarSub.current_period_start;
        const polarPeriodEnd = polarSub.current_period_end || polarSub.ends_at;
        const polarCancelAtPeriodEnd = polarSub.cancel_at_period_end;

        // Determine tier from product
        const productId = polarSub.product_id || polarSub.product?.id;
        let tier = 'free';
        if (productId && PRODUCT_TO_TIER[productId]) {
          tier = PRODUCT_TO_TIER[productId];
        } else if (polarSub.product?.name) {
          const name = polarSub.product.name.toLowerCase();
          if (name.includes('premium')) tier = 'premium';
          else if (name.includes('pro')) tier = 'pro';
        }

        // Check for discrepancies and update
        const updates: Record<string, any> = {};
        let needsUpdate = false;

        // Status mismatch
        if (user.subscription_status !== polarStatus && 
            !(user.subscription_status === 'canceled' && polarStatus === 'active' && polarCancelAtPeriodEnd)) {
          updates.subscription_status = polarStatus;
          needsUpdate = true;
          results.details.push(`${user.email}: Status ${user.subscription_status} -> ${polarStatus}`);
        }

        // Tier mismatch
        if (user.subscription_tier !== tier) {
          updates.subscription_tier = tier;
          needsUpdate = true;
          results.details.push(`${user.email}: Tier ${user.subscription_tier} -> ${tier}`);
        }

        // Period end mismatch (important for access control)
        if (polarPeriodEnd) {
          const localEnd = user.subscription_ends_at ? new Date(user.subscription_ends_at).getTime() : 0;
          const polarEnd = new Date(polarPeriodEnd).getTime();
          if (Math.abs(localEnd - polarEnd) > 60000) { // More than 1 minute difference
            updates.subscription_ends_at = new Date(polarPeriodEnd).toISOString();
            updates.current_period_end = new Date(polarPeriodEnd).toISOString();
            needsUpdate = true;
          }
        }

        // Period start change = new billing cycle = token reset
        if (polarPeriodStart) {
          const localStart = user.current_period_start ? new Date(user.current_period_start).getTime() : 0;
          const polarStart = new Date(polarPeriodStart).getTime();
          if (polarStart > localStart) {
            // New billing period detected - reset tokens
            updates.current_period_start = new Date(polarPeriodStart).toISOString();
            updates.tokens_balance = MONTHLY_TOKENS[tier] || 0;
            updates.tokens_reset_date = new Date(polarPeriodStart).toISOString();
            needsUpdate = true;
            results.details.push(`${user.email}: Token reset (new billing period)`);
          }
        }

        // Handle cancellation state
        if (polarCancelAtPeriodEnd && !user.subscription_status?.includes('canceled')) {
          updates.subscription_status = 'canceled';
          updates.auto_renew = false;
          updates.next_billing_date = null;
          needsUpdate = true;
        }

        // Apply updates if needed
        if (needsUpdate) {
          updates.updated_at = now.toISOString();
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) {
            console.error(`Error updating user ${user.email}:`, updateError);
            results.errors++;
          } else {
            results.updated++;
            console.log(`Updated subscription for ${user.email}:`, updates);
          }
        }

      } catch (userError: any) {
        console.error(`Error processing user ${user.email}:`, userError.message);
        results.errors++;
      }
    }

    // 3. Handle expired subscriptions (canceled with past end date)
    const { data: expiredUsers, error: expiredError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('subscription_status', 'canceled')
      .lt('subscription_ends_at', now.toISOString());

    if (!expiredError && expiredUsers) {
      for (const user of expiredUsers) {
        // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            polar_subscription_id: null,
            auto_renew: false,
            current_period_start: null,
            current_period_end: null,
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        // Downgrade API keys to match free tier
        await downgradeUserApiKeys(user.id);

        results.expired++;
        results.details.push(`${user.email}: Expired, downgraded to free`);
      }
    }

    // 4. Handle expired grace periods
    const { data: pastDueUsers, error: pastDueError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('subscription_status', 'past_due')
      .lt('grace_period_ends_at', now.toISOString());

    if (!pastDueError && pastDueUsers) {
      for (const user of pastDueUsers) {
        // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
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
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        // Downgrade API keys to match free tier
        await downgradeUserApiKeys(user.id);

        results.expired++;
        results.details.push(`${user.email}: Grace period expired, downgraded to free`);
      }
    }

    // 5. Clean up old webhook events (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('webhook_events')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    const duration = Date.now() - startTime;
    console.log(`=== RECONCILIATION COMPLETE in ${duration}ms ===`);
    console.log('Results:', results);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      results,
    });

  } catch (error: any) {
    console.error('=== RECONCILIATION ERROR ===');
    console.error('Error:', error.message);
    return NextResponse.json(
      { error: 'Reconciliation failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check job status/health
export async function GET() {
  return NextResponse.json({
    status: 'Subscription reconciliation endpoint active',
    description: 'POST to this endpoint to reconcile subscription state with Polar',
    recommendation: 'Run daily via cron job (e.g., Vercel Cron at 3 AM UTC)',
    auth: 'Requires Authorization: Bearer <CRON_SECRET> header (CRON_SECRET env var must be set)',
    configured: !!CRON_SECRET,
  });
}
