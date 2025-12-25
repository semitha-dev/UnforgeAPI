import { createAdminClient } from '@/app/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Token allocation per tier (for subscription system - kept for backward compatibility)
const MONTHLY_TOKENS: Record<string, number> = {
  free: 0,
  pro: 5000,
  premium: 10000,
};

// Product IDs to tier mapping (subscriptions)
const PRODUCT_TO_TIER: Record<string, string> = {
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro',
  [process.env.POLAR_PREMIUM_PRODUCT_ID || '']: 'premium',
};

// Token pack product IDs to token amounts (one-time purchases)
const TOKEN_PACK_PRODUCTS: Record<string, number> = {
  '5ac0c69a-501f-4f9f-a17e-592e50bb45a8': 500,    // 500 tokens - $2
  '743c222a-bee4-4272-8011-12f6089a9c01': 1000,   // 1000 tokens - $3
  'ffc789b3-4e5a-4e3f-8afc-8e310973fd57': 2500,   // 2500 tokens - $5
  '367064f3-6219-4e15-8142-705e7267d75e': 10000,  // 10000 tokens - $8
};

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

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
  try {
    const rawBody = await request.text();
    
    // Polar uses Standard Webhooks format with these headers
    const webhookId = request.headers.get('webhook-id');
    const webhookTimestamp = request.headers.get('webhook-timestamp');
    const webhookSignature = request.headers.get('webhook-signature');
    
    // Always verify signature when configured (security critical)
    const signatureCheck = verifyWebhookSignature(rawBody, webhookSignature, webhookId, webhookTimestamp);
    if (!signatureCheck.valid) {
      console.error('Webhook signature validation failed:', signatureCheck.reason);
      return NextResponse.json({ error: signatureCheck.reason }, { status: 401 });
    }
    
    const body = JSON.parse(rawBody);
    const { type, data } = body;
    
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

    // Use admin client for webhooks - no user session available
    const supabase = createAdminClient();

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
        
        // Skip token pack purchases - they are handled by order.paid event
        if (productId && TOKEN_PACK_PRODUCTS[productId]) {
          console.log('Skipping checkout.updated for token pack purchase - handled by order.paid');
          break;
        }
        
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
            if (productName.includes('premium')) {
              tier = 'premium';
            } else if (productName.includes('pro')) {
              tier = 'pro';
            }
          }
          
          const tokens = MONTHLY_TOKENS[tier] || 0;
          
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
          
          // Calculate period end (1 year for yearly subscriptions)
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          
          // Update user subscription
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              polar_customer_id: data.payment_processor_metadata?.customer_id || null,
              tokens_balance: tokens,
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
            console.log(`✅ Subscription activated from checkout for user ${profile.id}: tier=${tier}, tokens=${tokens}`);
          }
        }
        break;
      }

      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        const customerEmail = data.customer?.email || data.user?.email || data.email;
        const subscriptionId = data.id;
        const status = data.status || 'active';
        const productId = data.product_id || data.product?.id;
        const metadataUserId = data.metadata?.user_id;
        
        // Extract billing dates from Polar webhook - these are authoritative
        const currentPeriodStart = data.current_period_start || data.started_at || new Date().toISOString();
        const currentPeriodEnd = data.current_period_end || data.ends_at;
        const cancelAt = data.cancel_at_period_end ? currentPeriodEnd : null;
        const trialEnd = data.trial_end || data.trial_ends_at;
        
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
          if (productName.includes('premium')) {
            tier = 'premium';
          } else if (productName.includes('pro')) {
            tier = 'pro';
          }
        }

        const tokens = MONTHLY_TOKENS[tier] || 0;
        console.log('Tier:', tier, 'Tokens:', tokens);

        // Find user by email first, then fall back to metadata user_id
        let profile: { id: string; tokens_balance: number; email: string; subscription_started_at: string | null; current_period_start: string | null; tokens_reset_date: string | null } | null = null;
        
        if (customerEmail) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('id, tokens_balance, email, subscription_started_at, current_period_start, tokens_reset_date')
            .eq('email', customerEmail)
            .single();
          profile = profileByEmail;
        }
        
        // Fallback: try to find by user_id from metadata (Supabase user ID)
        if (!profile && metadataUserId) {
          console.log('Email lookup failed, trying metadata user_id:', metadataUserId);
          const { data: profileById } = await supabase
            .from('profiles')
            .select('id, tokens_balance, email, subscription_started_at, current_period_start, tokens_reset_date')
            .eq('id', metadataUserId)
            .single();
          profile = profileById;
        }

        if (!profile) {
          console.error('User not found for email:', customerEmail, 'or user_id:', metadataUserId);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Calculate dates
        const now = new Date();
        const periodEnd = currentPeriodEnd 
          ? new Date(currentPeriodEnd) 
          : calculatePeriodEnd(new Date(currentPeriodStart));
        
        const nextBilling = data.cancel_at_period_end ? null : periodEnd.toISOString();

        // Determine if this is a new billing period (for token reset)
        // Compare stored current_period_start with incoming one
        const storedPeriodStart = profile.current_period_start;
        const newPeriodStart = new Date(currentPeriodStart);
        const isNewBillingPeriod = !storedPeriodStart || 
          new Date(storedPeriodStart).getTime() < newPeriodStart.getTime();

        // Update user's subscription with all dates
        // This handles upgrades, downgrades, and new subscriptions after cancellation
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

        // Reset tokens when:
        // 1. New subscription (subscription.created or subscription.active)
        // 2. New billing period detected (period_start changed)
        const shouldResetTokens = 
          type === 'subscription.created' || 
          type === 'subscription.active' ||
          isNewBillingPeriod;

        if (shouldResetTokens) {
          console.log(`Resetting tokens for ${customerEmail}: new billing period detected`);
          updateData.tokens_balance = tokens;
          updateData.tokens_reset_date = currentPeriodStart; // Align with billing cycle
        }

        console.log('Updating profile with:', updateData);

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        console.log(`✅ Updated subscription for ${customerEmail}: tier=${tier}, status=${status}, ends_at=${periodEnd.toISOString()}, tokens_reset=${shouldResetTokens}`);
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
            // NOTE: Do NOT reset tokens_balance - user may have purchased token packs
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
        // Handle order events - subscriptions and token pack purchases
        const billingReason = data.billing_reason;
        const orderStatus = data.status;
        const productId = data.product_id;
        const orderId = data.id;
        
        // Check if this is a token pack purchase (one-time purchase)
        // Process when status is 'paid', regardless of event type
        // Use order-specific idempotency to prevent double-processing
        if (orderStatus === 'paid' && TOKEN_PACK_PRODUCTS[productId]) {
          // Check if we've already processed this specific order for tokens
          const tokenPurchaseKey = `token_purchase:${orderId}`;
          
          const { data: existingPurchase } = await supabase
            .from('webhook_events')
            .select('id')
            .eq('event_id', tokenPurchaseKey)
            .single();
          
          if (existingPurchase) {
            break;
          }
          
          // Mark this order as processed for tokens
          await supabase.from('webhook_events').insert({
            event_id: tokenPurchaseKey,
            event_type: 'token_purchase',
            payload: { orderId, productId },
            status: 'processed',
            processed_at: new Date().toISOString()
          });
          
          const tokensToAdd = TOKEN_PACK_PRODUCTS[productId];
          const customerEmail = data.customer?.email || data.user?.email;
          const metadataUserId = data.metadata?.user_id;
          const pricePaid = data.total_amount || data.amount || 0;
          
          // Find user
          let profile: { id: string; email: string; tokens_balance: number } | null = null;
          
          if (customerEmail) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('id, email, tokens_balance')
              .eq('email', customerEmail)
              .single();
            profile = profileByEmail;
          }
          
          if (!profile && metadataUserId) {
            const { data: profileById } = await supabase
              .from('profiles')
              .select('id, email, tokens_balance')
              .eq('id', metadataUserId)
              .single();
            profile = profileById;
          }
          
          if (!profile) {
            console.error('User not found for token pack purchase:', customerEmail, metadataUserId);
            break;
          }
          
          // Double-check: See if a token transaction already exists for this order
          const { data: existingTransaction } = await supabase
            .from('token_transactions')
            .select('id')
            .eq('polar_order_id', orderId)
            .single();
          
          if (existingTransaction) {
            break;
          }
          
          // Insert into token_transactions (no expiration - tokens never expire)
          const { data: newTransaction, error: transactionError } = await supabase
            .from('token_transactions')
            .insert({
              user_id: profile.id,
              amount: tokensToAdd,
              remaining: tokensToAdd,
              source: 'purchase',
              expires_at: null, // Tokens never expire
              polar_order_id: orderId,
            })
            .select('id')
            .single();
          
          if (transactionError) {
            // Check if it's a duplicate key error
            if (transactionError.code === '23505') {
              break;
            }
            console.error('Error creating token transaction:', transactionError);
            break;
          }
          
          // Also update tokens_balance for backward compatibility (cached value)
          const newBalance = (profile.tokens_balance || 0) + tokensToAdd;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              tokens_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
          
          if (updateError) {
            console.error('Error updating cached token balance:', updateError);
            // Non-critical - token_transactions is the source of truth now
          }
          
          // Record the purchase (keep for analytics)
          const { error: purchaseError } = await supabase
            .from('token_purchases')
            .insert({
              user_id: profile.id,
              polar_order_id: orderId,
              polar_product_id: productId,
              tokens_amount: tokensToAdd,
              price_paid: pricePaid,
              currency: data.currency || 'usd',
            });
          
          if (purchaseError && purchaseError.code !== '23505') { // Ignore duplicate
            console.error('Error recording token purchase:', purchaseError);
          }
          
          break;
        }
        
        // Handle subscription creation (existing logic)
        if (orderStatus === 'paid' && billingReason === 'subscription_create' && data.subscription) {
          const subscription = data.subscription;
          const customerEmail = data.customer?.email || data.user?.email;
          const metadataUserId = data.metadata?.user_id || subscription.metadata?.user_id;
          console.log('Metadata user_id:', metadataUserId);
          
          // Determine tier from product
          let tier = 'free';
          if (productId && PRODUCT_TO_TIER[productId]) {
            tier = PRODUCT_TO_TIER[productId];
          } else {
            const productName = data.product?.name?.toLowerCase() || '';
            if (productName.includes('premium')) {
              tier = 'premium';
            } else if (productName.includes('pro')) {
              tier = 'pro';
            }
          }
          
          const tokens = MONTHLY_TOKENS[tier] || 0;
          
          // Find user by email first, then fall back to metadata user_id
          let profile: { id: string; email: string } | null = null;
          
          if (customerEmail) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('email', customerEmail)
              .single();
            profile = profileByEmail;
          }
          
          // Fallback: try to find by user_id from metadata (Supabase user ID)
          if (!profile && metadataUserId) {
            console.log('Email lookup failed, trying metadata user_id:', metadataUserId);
            const { data: profileById } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', metadataUserId)
              .single();
            profile = profileById;
          }
            
          if (!profile) {
            console.error('User not found for email:', customerEmail, 'or user_id:', metadataUserId);
            console.log('⚠️ Subscription payment received but user profile not found.');
            break;
          }
          
          const periodEnd = subscription.current_period_end 
            ? new Date(subscription.current_period_end)
            : calculatePeriodEnd(new Date(subscription.current_period_start || subscription.started_at));
          
          // Update user subscription
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              polar_subscription_id: subscription.id,
              polar_customer_id: data.customer_id,
              tokens_balance: tokens,
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
          } else {
            console.log(`✅ Subscription activated from order for ${customerEmail}: tier=${tier}, tokens=${tokens}`);
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
      'charge.failed',
      'charge.succeeded',
      'subscription.payment_failed',
      'subscription.payment_succeeded'
    ],
    features: {
      idempotent: true,
      signature_verified: true,
      billing_cycle_token_reset: true
    }
  });
}
