import { createAdminClient } from '@/app/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { PRO_PRODUCT_ID } from '@/lib/subscription';

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [Polar/Webhook:${tag}]`, JSON.stringify(data, null, 2))
  }
}

// Detailed debug for webhook payload inspection
function debugPayload(tag: string, payload: any, maxDepth: number = 3) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    const simplified = simplifyObject(payload, maxDepth)
    console.log(`${timestamp} [Polar/Webhook:${tag}]`, JSON.stringify(simplified, null, 2))
  }
}

// Helper to simplify large objects for logging
function simplifyObject(obj: any, depth: number, currentDepth: number = 0): any {
  if (currentDepth >= depth) {
    return '[truncated]'
  }
  
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 5).map(item => simplifyObject(item, depth, currentDepth + 1))
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = simplifyObject(value, depth, currentDepth + 1)
    }
    return result
  }
  
  return obj
}

// Log webhook event to database for debugging
async function logWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  eventType: string,
  payload: any,
  status: 'received' | 'processing' | 'success' | 'error',
  details?: any
) {
  try {
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: eventType,
        payload: payload,
        status: status,
        details: details,
        created_at: new Date().toISOString()
      })
  } catch (err) {
    console.error('Failed to log webhook event:', err)
  }
}

// Product IDs for different tiers (from environment variables)
const MANAGED_PRO_PRODUCT_ID = process.env.POLAR_MANAGED_PRO_PRODUCT_ID!;
const MANAGED_EXPERT_PRODUCT_ID = process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID!;
const BYOK_PRO_PRODUCT_ID = process.env.POLAR_BYOK_PRO_PRODUCT_ID!;

// Product IDs to tier mapping (subscriptions)
// Pro subscription product ID from subscription.ts
const PRODUCT_TO_TIER: Record<string, string> = {
  [PRO_PRODUCT_ID]: 'pro', // Legacy
  [MANAGED_PRO_PRODUCT_ID]: 'managed_pro',
  [MANAGED_EXPERT_PRODUCT_ID]: 'managed_expert',
  [BYOK_PRO_PRODUCT_ID]: 'byok_pro',
  // Also support environment variable override for testing
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro',
};

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

// Unkey API URL
const UNKEY_API_URL = 'https://api.unkey.dev';

/**
 * Upgrade existing API keys when user subscription changes
 * This upgrades keys of the same type (BYOK or Managed) to pro tier
 */
async function upgradeUserApiKeys(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  newTier: string
): Promise<void> {
  console.log(`[Keys Upgrade] Upgrading keys for user ${userId} to tier ${newTier}`);
  
  // Get user's workspace
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single();
  
  const workspaceId = profile?.default_workspace_id || userId;
  
  // Get all API keys for this workspace
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, unkey_id, tier, name')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);
  
  if (error || !keys?.length) {
    console.log(`[Keys Upgrade] No keys found for workspace ${workspaceId}`);
    return;
  }
  
  // Determine which keys to upgrade based on new subscription tier
  // If user gets byok_pro, upgrade byok_starter keys to byok_pro
  // If user gets managed_pro or managed_expert, upgrade sandbox/managed_pro keys
  const keysToUpgrade = keys.filter(key => {
    if (newTier === 'byok_pro' && (key.tier === 'byok_starter' || key.tier === 'byok')) {
      return true;
    }
    // managed_pro upgrades sandbox keys
    if ((newTier === 'managed_pro' || newTier === 'pro') && key.tier === 'sandbox') {
      return true;
    }
    // managed_expert upgrades sandbox AND managed_pro keys
    if (newTier === 'managed_expert' && (key.tier === 'sandbox' || key.tier === 'managed_pro')) {
      return true;
    }
    return false;
  });
  
  if (!keysToUpgrade.length) {
    console.log(`[Keys Upgrade] No keys need upgrading for tier ${newTier}`);
    return;
  }
  
  console.log(`[Keys Upgrade] Upgrading ${keysToUpgrade.length} keys to ${newTier}`);
  
  // Determine the new plan based on subscription tier
  const newPlan = newTier === 'byok_pro' ? 'byok_pro' : newTier; // Keep managed_pro or managed_expert as-is
  
  // Get rate limit config for the new plan
  const rateLimitConfig = newPlan === 'byok_pro' 
    ? { type: 'fast' as const, limit: 10, duration: 1000 } // 10 req/sec
    : newPlan === 'managed_expert'
    ? { type: 'fast' as const, limit: 250000, duration: 2592000000 } // 250k/month for Expert
    : { type: 'fast' as const, limit: 50000, duration: 2592000000 }; // 50k/month for Pro
  
  for (const key of keysToUpgrade) {
    try {
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
            searchEnabled: true, // Pro tiers have search enabled
            requiresUserKeys: newPlan === 'byok_pro'
          },
          ratelimit: rateLimitConfig
        })
      });
      
      if (!unkeyResponse.ok) {
        const error = await unkeyResponse.json();
        console.error(`[Keys Upgrade] Failed to upgrade Unkey key ${key.unkey_id}:`, error);
        continue;
      }
      
      // Update key in our database
      await supabase
        .from('api_keys')
        .update({
          tier: newPlan,
          metadata: {
            plan: newPlan,
            searchEnabled: true,
            requiresUserKeys: newPlan === 'byok_pro',
            upgradedAt: new Date().toISOString()
          }
        })
        .eq('id', key.id);
      
      console.log(`[Keys Upgrade] ✅ Upgraded key ${key.name} (${key.unkey_id}) to ${newPlan}`);
    } catch (err) {
      console.error(`[Keys Upgrade] Error upgrading key ${key.unkey_id}:`, err);
    }
  }
}

/**
 * Downgrade API keys when subscription is revoked
 * This downgrades paid keys back to free tier
 */
async function downgradeUserApiKeys(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<void> {
  console.log(`[Keys Downgrade] Downgrading keys for user ${userId} to free tier`);
  
  // Get user's workspace
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_workspace_id')
    .eq('id', userId)
    .single();
  
  const workspaceId = profile?.default_workspace_id || userId;
  
  // Get all API keys for this workspace that are paid tiers
  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, unkey_id, tier, name')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .in('tier', ['managed_pro', 'managed_expert', 'byok_pro']);
  
  if (error || !keys?.length) {
    console.log(`[Keys Downgrade] No paid keys found for workspace ${workspaceId}`);
    return;
  }
  
  console.log(`[Keys Downgrade] Downgrading ${keys.length} keys to free tier`);
  
  for (const key of keys) {
    try {
      // Determine new free tier based on current tier
      const newPlan = ['managed_pro', 'managed_expert'].includes(key.tier) ? 'sandbox' : 'byok_starter';
      
      // Get rate limit config for the free plan
      // byok_starter: 50/day (matches subscription-constants.ts PLAN_CONFIG)
      const rateLimitConfig = newPlan === 'sandbox'
        ? { type: 'fast' as const, limit: 50, duration: 86400000 } // 50/day
        : { type: 'fast' as const, limit: 50, duration: 86400000 }; // 50/day for byok_starter
      
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
            searchEnabled: true, // Sandbox now has limited search
            requiresUserKeys: newPlan === 'byok_starter',
            downgradedAt: new Date().toISOString()
          },
          ratelimit: rateLimitConfig
        })
      });
      
      if (!unkeyResponse.ok) {
        const error = await unkeyResponse.json();
        console.error(`[Keys Downgrade] Failed to downgrade Unkey key ${key.unkey_id}:`, error);
        continue;
      }
      
      // Update key in our database
      await supabase
        .from('api_keys')
        .update({
          tier: newPlan,
          metadata: {
            plan: newPlan,
            searchEnabled: true,
            requiresUserKeys: newPlan === 'byok_starter',
            downgradedAt: new Date().toISOString()
          }
        })
        .eq('id', key.id);
      
      console.log(`[Keys Downgrade] ✅ Downgraded key ${key.name} (${key.unkey_id}) to ${newPlan}`);
    } catch (err) {
      console.error(`[Keys Downgrade] Error downgrading key ${key.unkey_id}:`, err);
    }
  }
}

/**
 * Verify webhook signature from Polar
 * Polar uses standard webhooks format with webhook-id, webhook-timestamp, and webhook-signature headers
 * Signature format: v1,base64signature
 */
function verifyWebhookSignature(
  payload: string, 
  signature: string | null,
  webhookId: string | null,
  webhookTimestamp: string | null
): { valid: boolean; reason: string } {
  // SECURITY: Always require webhook secret - reject if not configured
  if (!POLAR_WEBHOOK_SECRET || POLAR_WEBHOOK_SECRET === 'your_webhook_secret') {
    // Even in development, we should enforce security for payment webhooks
    console.error('POLAR_WEBHOOK_SECRET not configured!');
    return { valid: false, reason: 'Webhook secret not configured' };
  }

  if (!signature) {
    return { valid: false, reason: 'No signature provided in request' };
  }

  // SECURITY: Validate timestamp to prevent replay attacks (5 minute window)
  if (webhookTimestamp) {
    const timestamp = parseInt(webhookTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const tolerance = 300; // 5 minutes
    
    if (Math.abs(now - timestamp) > tolerance) {
      return { valid: false, reason: 'Webhook timestamp too old or in future' };
    }
  }

  try {
    // Polar uses Standard Webhooks format
    // The signature header contains: v1,base64_signature
    // The signed content is: webhook_id.webhook_timestamp.payload
    
    // Parse signature - format is "v1,base64signature" or multiple signatures separated by space
    const signatures = signature.split(' ');
    
    for (const sig of signatures) {
      const [version, providedSig] = sig.split(',');
      
      if (version !== 'v1' || !providedSig) {
        continue;
      }

      // Build the signed content: id.timestamp.payload
      const signedContent = `${webhookId || ''}.${webhookTimestamp || ''}.${payload}`;
      
      // Polar uses the full webhook secret as-is (including the polar_whs_ prefix)
      const secretBytes = Buffer.from(POLAR_WEBHOOK_SECRET, 'utf8');
      
      const expectedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');
      
      if (providedSig === expectedSignature) {
        return { valid: true, reason: 'Signature verified' };
      }
    }
    
    // If we get here, no signature matched
    return { valid: false, reason: 'Invalid signature' };
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, reason: 'Signature verification failed' };
  }
}

/**
 * Calculate subscription end date (current period end)
 */
function calculatePeriodEnd(startDate: Date): Date {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + 1);
  return end;
}

// Polar Webhook Handler
// Handles all subscription lifecycle events from Polar
export async function POST(request: NextRequest) {
  debug('POST:start', { timestamp: new Date().toISOString() })
  
  try {
    const rawBody = await request.text();
    
    // Polar uses Standard Webhooks format with these headers
    const webhookId = request.headers.get('webhook-id');
    const webhookTimestamp = request.headers.get('webhook-timestamp');
    const webhookSignature = request.headers.get('webhook-signature');
    
    debug('POST:headers', { 
      webhookId, 
      webhookTimestamp, 
      hasSignature: !!webhookSignature,
      signatureLength: webhookSignature?.length || 0
    })
    
    // Always verify signature when configured (security critical)
    const signatureCheck = verifyWebhookSignature(rawBody, webhookSignature, webhookId, webhookTimestamp);
    if (!signatureCheck.valid) {
      debug('POST:signature:fail', { reason: signatureCheck.reason })
      return NextResponse.json({ error: signatureCheck.reason }, { status: 401 });
    }
    
    debug('POST:signature:success', { reason: signatureCheck.reason })
    
    const body = JSON.parse(rawBody);
    const { type, data } = body;
    
    debug('POST:event', { type, dataId: data?.id })
    debugPayload('POST:payload:full', body, 4)
    
    // Use admin client for webhooks - no user session available
    const supabase = createAdminClient();
    
    // Log webhook event received
    await logWebhookEvent(supabase, type, data, 'received', { webhookId, webhookTimestamp })
    
    // Extract event ID for idempotency
    // Use webhook-id header (unique per delivery) if available, otherwise construct from data
    // This ensures each webhook delivery is processed exactly once
    const webhookDeliveryId = webhookId; // This is unique per delivery from Polar
    const entityId = data.id || body.id;
    
    // Prefer webhook-id for idempotency (most reliable)
    // Fallback to type:entity:timestamp for older webhooks
    const eventId = webhookDeliveryId 
      ? `delivery:${webhookDeliveryId}`
      : `${type}:${entityId}:${data.modified_at || data.created_at || Date.now()}`;

    // Idempotency check: See if we've already processed this event
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, processed_at')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record this event as being processed (insert first to prevent race conditions)
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: type,
        payload: data,
        status: 'processing'
      });

    if (insertError) {
      // If insert fails due to unique constraint, another instance is processing it
      if (insertError.code === '23505') { // Unique violation
        console.log(`Event ${eventId} is being processed by another instance. Skipping.`);
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error('Error recording webhook event:', insertError);
      // Continue processing even if we can't record (non-critical)
    }

    // Handle different webhook events
    switch (type) {
      case 'checkout.created': {
        console.log('Checkout started:', data.id);
        break;
      }

      case 'checkout.updated': {
        // Handle confirmed checkout with successful payment as backup activation method
        const checkoutStatus = data.status;
        const intentStatus = data.payment_processor_metadata?.intent_status;
        const metadataUserId = data.metadata?.user_id;
        const customerEmail = data.customer_email;
        const productId = data.product_id;
        
        console.log('Checkout updated:', data.id, 'Status:', checkoutStatus, 'Intent:', intentStatus);
        
        // If checkout is confirmed and payment succeeded, activate subscription
        // This is a backup in case order.paid webhook doesn't arrive
        if ((checkoutStatus === 'confirmed' || checkoutStatus === 'succeeded') && intentStatus === 'succeeded') {
          console.log('✅ Checkout confirmed with successful payment, activating subscription...');
          
          // Determine tier from product
          let tier = 'free';
          if (productId && PRODUCT_TO_TIER[productId]) {
            tier = PRODUCT_TO_TIER[productId];
          } else {
            const productName = data.product?.name?.toLowerCase() || '';
            if (productName.includes('pro')) {
              tier = 'pro';
            }
          }
          
          // Find user by email or metadata user_id
          let profile: { id: string } | null = null;
          
          if (customerEmail) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', customerEmail)
              .single();
            profile = profileByEmail;
          }
          
          if (!profile && metadataUserId) {
            console.log('Email lookup failed, trying metadata user_id:', metadataUserId);
            const { data: profileById } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', metadataUserId)
              .single();
            profile = profileById;
          }
          
          if (!profile) {
            console.error('User not found for checkout activation:', customerEmail, metadataUserId);
            break;
          }
          
          // Calculate period end (1 month for monthly subscriptions)
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          
          // Update user subscription
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              polar_customer_id: data.payment_processor_metadata?.customer_id || null,
              subscription_ends_at: periodEnd.toISOString(),
              next_billing_date: periodEnd.toISOString(),
              auto_renew: true,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              subscription_started_at: now.toISOString(),
              canceled_at: null,
              grace_period_ends_at: null,
              updated_at: now.toISOString(),
            })
            .eq('id', profile.id);
            
          if (updateError) {
            console.error('Error updating profile from checkout:', updateError);
          } else {
            console.log(`✅ Subscription activated from checkout for user ${profile.id}: tier=${tier}`);
            
            // Upgrade existing API keys when subscription is activated (paid tiers)
            if (['managed_pro', 'managed_expert', 'byok_pro', 'pro'].includes(tier)) {
              try {
                await upgradeUserApiKeys(supabase, profile.id, tier);
              } catch (keyErr) {
                console.error('Error upgrading API keys from checkout:', keyErr);
              }
            }
          }
        }
        break;
      }

      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        debug('subscription:start', { eventType: type })
        
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        const subscriptionId = data.id;
        const status = data.status || 'active';
        const productId = data.product_id || data.product?.id;
        const metadataUserId = data.metadata?.user_id;
        
        debug('subscription:extracted', {
          customerEmail,
          subscriptionId,
          status,
          productId,
          metadataUserId,
          hasCustomer: !!data.customer,
          hasProduct: !!data.product
        })
        
        // Extract billing dates from Polar webhook - these are authoritative
        const currentPeriodStart = data.current_period_start || data.started_at || new Date().toISOString();
        const currentPeriodEnd = data.current_period_end || data.ends_at;
        const cancelAt = data.cancel_at_period_end ? currentPeriodEnd : null;
        const trialEnd = data.trial_end || data.trial_ends_at;
        
        debug('subscription:dates', {
          currentPeriodStart,
          currentPeriodEnd,
          cancelAt,
          trialEnd,
          cancelAtPeriodEnd: data.cancel_at_period_end
        })
        
        console.log('Processing subscription event:');
        console.log('- Customer email:', customerEmail);
        console.log('- Subscription ID:', subscriptionId);
        console.log('- Status:', status);
        console.log('- Product ID:', productId);
        console.log('- Period start:', currentPeriodStart);
        console.log('- Period end:', currentPeriodEnd);
        console.log('- Cancel at:', cancelAt);
        console.log('- Metadata user_id:', metadataUserId);

        // Determine tier
        let tier = 'free';
        if (productId && PRODUCT_TO_TIER[productId]) {
          tier = PRODUCT_TO_TIER[productId];
        } else {
          const productName = data.product?.name?.toLowerCase() || '';
          if (productName.includes('pro')) {
            tier = 'pro';
          }
        }

        debug('subscription:tier', { productId, determinedTier: tier, productName: data.product?.name })
        console.log('Tier:', tier);

        // Find user by email first, then fall back to metadata user_id
        let profile: { id: string; email: string; subscription_started_at: string | null; current_period_start: string | null } | null = null;
        
        if (customerEmail) {
          debug('subscription:lookup:email', { email: customerEmail })
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id, email, subscription_started_at, current_period_start')
            .eq('email', customerEmail)
            .single();
          profile = profileByEmail;
          debug('subscription:lookup:email:result', { found: !!profile, profileId: profile?.id })
        }
        
        // Fallback: try to find by user_id from metadata (Supabase user ID)
        if (!profile && metadataUserId) {
          console.log('Email lookup failed, trying metadata user_id:', metadataUserId);
          debug('subscription:lookup:userId', { userId: metadataUserId })
          const { data: profileById } = await supabase
            .from('profiles')
            .select('id, email, subscription_started_at, current_period_start')
            .eq('id', metadataUserId)
            .single();
          profile = profileById;
          debug('subscription:lookup:userId:result', { found: !!profile, profileId: profile?.id })
        }

        if (!profile) {
          console.error('User not found for email:', customerEmail, 'or user_id:', metadataUserId);
          debug('subscription:lookup:failed', { customerEmail, metadataUserId })
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Calculate dates
        const now = new Date();
        const periodEnd = currentPeriodEnd 
          ? new Date(currentPeriodEnd) 
          : calculatePeriodEnd(new Date(currentPeriodStart));
        
        const nextBilling = data.cancel_at_period_end ? null : periodEnd.toISOString();

        // Update user's subscription with all dates
        const updateData: Record<string, any> = {
          subscription_tier: tier,
          subscription_status: status === 'active' ? 'active' : status,
          polar_subscription_id: subscriptionId,
          polar_customer_id: data.customer?.id || data.customer_id,
          subscription_ends_at: periodEnd.toISOString(),
          next_billing_date: nextBilling,
          auto_renew: !data.cancel_at_period_end,
          current_period_start: currentPeriodStart,
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
          // Clear cancellation data when activating a new subscription
          canceled_at: null,
          grace_period_ends_at: null,
        };

        // Set subscription start date only on first activation
        if (!profile.subscription_started_at && status === 'active') {
          updateData.subscription_started_at = currentPeriodStart;
        }

        // Handle trial
        if (trialEnd) {
          updateData.trial_ends_at = trialEnd;
          if (status === 'trialing') {
            updateData.subscription_status = 'trialing';
          }
        }

        debug('subscription:update', { 
          profileId: profile.id, 
          updateData,
          isNewSubscription: !profile.subscription_started_at 
        })
        console.log('Updating profile with:', updateData);

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          debug('subscription:update:error', { error: updateError })
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        console.log(`✅ Updated subscription for ${customerEmail}: tier=${tier}, status=${status}, ends_at=${periodEnd.toISOString()}`);
        debug('subscription:success', { 
          customerEmail, 
          tier, 
          status, 
          periodEnd: periodEnd.toISOString() 
        })
        
        // Log success to webhook logs
        await logWebhookEvent(supabase, type, data, 'success', { 
          profileId: profile.id,
          tier,
          status,
          periodEnd: periodEnd.toISOString()
        })
        
        // Upgrade existing API keys when subscription is activated
        if (status === 'active' && (tier === 'managed_pro' || tier === 'managed_expert' || tier === 'byok_pro' || tier === 'pro')) {
          try {
            debug('subscription:keys:upgrade:start', { profileId: profile.id, tier })
            await upgradeUserApiKeys(supabase, profile.id, tier);
            debug('subscription:keys:upgrade:success', { profileId: profile.id, tier })
          } catch (keyErr) {
            console.error('Error upgrading API keys:', keyErr);
            debug('subscription:keys:upgrade:error', { error: keyErr })
            // Don't fail the webhook - key upgrade is non-critical
          }
        }
        break;
      }

      case 'subscription.canceled': {
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        const currentPeriodEnd = data.current_period_end || data.ends_at;
        const canceledSubscriptionId = data.id;
        
        console.log('Processing cancellation for:', customerEmail);
        console.log('Canceled subscription ID:', canceledSubscriptionId);
        console.log('Access until:', currentPeriodEnd);

        if (!customerEmail) {
          console.error('No customer email found in webhook data');
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_tier, polar_subscription_id')
          .eq('email', customerEmail)
          .single();

        if (profile) {
          // CRITICAL: Only apply cancellation if this is the CURRENT subscription
          // This prevents old canceled subscriptions from overwriting new active ones
          if (profile.polar_subscription_id && profile.polar_subscription_id !== canceledSubscriptionId) {
            console.log(`⚠️ Ignoring cancellation for old subscription ${canceledSubscriptionId}, current is ${profile.polar_subscription_id}`);
            break;
          }

          // Calculate when subscription actually ends
          const endsAt = currentPeriodEnd 
            ? new Date(currentPeriodEnd)
            : calculatePeriodEnd(new Date());

          // DON'T downgrade immediately - user keeps access until period ends
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              canceled_at: new Date().toISOString(),
              subscription_ends_at: endsAt.toISOString(),
              next_billing_date: null, // No more billing
              auto_renew: false,
              updated_at: new Date().toISOString(),
              // Keep subscription_tier as-is until period ends!
            })
            .eq('id', profile.id);

          console.log(`✅ Subscription canceled for ${customerEmail}. Access until: ${endsAt.toISOString()}`);
        }
        break;
      }

      case 'subscription.revoked':
      case 'subscription.uncanceled': {
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        const webhookSubscriptionId = data.id;
        
        if (!customerEmail) {
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, polar_subscription_id')
          .eq('email', customerEmail)
          .single();

        if (profile) {
          // Only process if this is the current subscription
          if (profile.polar_subscription_id && profile.polar_subscription_id !== webhookSubscriptionId) {
            console.log(`⚠️ Ignoring ${type} for old subscription ${webhookSubscriptionId}, current is ${profile.polar_subscription_id}`);
            break;
          }

          if (type === 'subscription.revoked') {
            // Immediate revocation - downgrade now
            await supabase
              .from('profiles')
              .update({
                subscription_tier: 'free',
                subscription_status: 'inactive',
                polar_subscription_id: null,
                subscription_ends_at: null,
                next_billing_date: null,
                auto_renew: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);
            console.log(`✅ Subscription revoked for ${customerEmail}`);
            
            // Downgrade API keys back to free tier
            try {
              await downgradeUserApiKeys(supabase, profile.id);
            } catch (keyErr) {
              console.error('Error downgrading API keys:', keyErr);
            }
          } else {
            // Uncanceled - restore auto-renew
            const periodEnd = data.current_period_end || data.ends_at;
            await supabase
              .from('profiles')
              .update({
                subscription_status: 'active',
                canceled_at: null,
                next_billing_date: periodEnd,
                auto_renew: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);
            console.log(`✅ Subscription uncanceled for ${customerEmail}`);
          }
        }
        break;
      }

      case 'order.created':
      case 'order.updated':
      case 'order.paid': {
        debug('order:start', { eventType: type })
        
        // Handle order events - subscription purchases
        const billingReason = data.billing_reason;
        const orderStatus = data.status;
        const productId = data.product_id;
        
        debug('order:extracted', {
          billingReason,
          orderStatus,
          productId,
          hasSubscription: !!data.subscription,
          hasCustomer: !!data.customer
        })
        
        // Handle subscription creation
        if (orderStatus === 'paid' && billingReason === 'subscription_create' && data.subscription) {
          debug('order:subscription:create', { orderId: data.id })
          
          const subscription = data.subscription;
          const customerEmail = data.customer?.email || data.user?.email;
          const metadataUserId = data.metadata?.user_id || subscription.metadata?.user_id;
          
          debug('order:subscription:data', {
            subscriptionId: subscription.id,
            customerEmail,
            metadataUserId,
            subscriptionStatus: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end
          })
          
          console.log('Metadata user_id:', metadataUserId);
          
          // Determine tier from product
          let tier = 'free';
          if (productId && PRODUCT_TO_TIER[productId]) {
            tier = PRODUCT_TO_TIER[productId];
          } else {
            const productName = data.product?.name?.toLowerCase() || '';
            if (productName.includes('pro')) {
              tier = 'pro';
            }
          }
          
          debug('order:tier', { productId, determinedTier: tier, productName: data.product?.name })
          
          // Find user by email first, then fall back to metadata user_id
          let profile: { id: string; email: string } | null = null;
          
          if (customerEmail) {
            debug('order:lookup:email', { email: customerEmail })
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('email', customerEmail)
              .single();
            profile = profileByEmail;
            debug('order:lookup:email:result', { found: !!profile, profileId: profile?.id })
          }
          
          // Fallback: try to find by user_id from metadata (Supabase user ID)
          if (!profile && metadataUserId) {
            console.log('Email lookup failed, trying metadata user_id:', metadataUserId);
            debug('order:lookup:userId', { userId: metadataUserId })
            const { data: profileById } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', metadataUserId)
              .single();
            profile = profileById;
            debug('order:lookup:userId:result', { found: !!profile, profileId: profile?.id })
          }
            
          if (!profile) {
            console.error('User not found for email:', customerEmail, 'or user_id:', metadataUserId);
            console.log('⚠️ Subscription payment received but user profile not found.');
            debug('order:lookup:failed', { customerEmail, metadataUserId })
            break;
          }
          
          const periodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end)
            : calculatePeriodEnd(new Date(subscription.current_period_start || subscription.started_at));
          
          debug('order:update', {
            profileId: profile.id,
            tier,
            periodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          })
          
          // Update user subscription
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              polar_subscription_id: subscription.id,
              polar_customer_id: data.customer_id,
              subscription_ends_at: periodEnd.toISOString(),
              next_billing_date: subscription.cancel_at_period_end ? null : periodEnd.toISOString(),
              auto_renew: !subscription.cancel_at_period_end,
              current_period_start: subscription.current_period_start || subscription.started_at,
              current_period_end: periodEnd.toISOString(),
              subscription_started_at: subscription.started_at,
              canceled_at: null,
              grace_period_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
            
          if (updateError) {
            console.error('Error updating profile from order:', updateError);
            debug('order:update:error', { error: updateError })
          } else {
            console.log(`✅ Subscription activated from order for ${customerEmail}: tier=${tier}`);
            debug('order:success', { customerEmail, tier, periodEnd: periodEnd.toISOString() })
            
            // Log success to webhook logs
            await logWebhookEvent(supabase, type, data, 'success', { 
              profileId: profile.id,
              tier,
              periodEnd: periodEnd.toISOString()
            })
          }
        }
        break;
      }

      case 'charge.failed':
      case 'subscription.payment_failed': {
        // Payment failed - set user to past_due with grace period
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        console.log('Payment failed for:', customerEmail);

        if (!customerEmail) {
          console.error('No customer email found in payment failed webhook');
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_tier, subscription_ends_at')
          .eq('email', customerEmail)
          .single();

        if (profile) {
          // Set grace period (7 days to fix payment)
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              grace_period_ends_at: gracePeriodEnd.toISOString(),
              auto_renew: false,
              updated_at: new Date().toISOString(),
              // Keep tier - user retains access during grace period
            })
            .eq('id', profile.id);

          console.log(`✅ Payment failed for ${customerEmail}. Grace period until: ${gracePeriodEnd.toISOString()}`);
        }
        break;
      }

      case 'charge.succeeded':
      case 'subscription.payment_succeeded': {
        // Payment succeeded - could be renewal, reset tokens on billing cycle
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        console.log('Payment succeeded for:', customerEmail);

        if (customerEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, subscription_tier, subscription_status')
            .eq('email', customerEmail)
            .single();

          if (profile && profile.subscription_status === 'past_due') {
            // Payment recovered from past_due state
            await supabase
              .from('profiles')
              .update({
                subscription_status: 'active',
                grace_period_ends_at: null,
                auto_renew: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);

            console.log(`✅ Payment recovered for ${customerEmail}. Status restored to active.`);
          }
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', type);
    }

    // Mark event as successfully processed
    await supabase
      .from('webhook_events')
      .update({ status: 'processed' })
      .eq('event_id', eventId);

    return NextResponse.json({ received: true, eventId });
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({ error: 'Webhook handler failed', details: error.message }, { status: 500 });
  }
}

// Allow GET for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'Polar webhook endpoint active', 
    timestamp: new Date().toISOString(),
    events_handled: [
      'checkout.created',
      'checkout.updated', 
      'subscription.created',
      'subscription.updated',
      'subscription.active',
      'subscription.canceled',
      'subscription.revoked',
      'subscription.uncanceled',
      'order.created',
      'order.paid',
      'charge.failed',
      'charge.succeeded',
      'subscription.payment_failed',
      'subscription.payment_succeeded'
    ],
    features: {
      idempotent: true,
      signature_verified: true,
      subscription_tiers: ['free', 'pro']
    }
  });
}
