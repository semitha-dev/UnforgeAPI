import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Token allocation per tier
const MONTHLY_TOKENS: Record<string, number> = {
  free: 0,
  pro: 5000,
  premium: 10000,
};

// Product IDs to tier mapping
const PRODUCT_TO_TIER: Record<string, string> = {
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro',
  [process.env.POLAR_PREMIUM_PRODUCT_ID || '']: 'premium',
};

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

/**
 * Verify webhook signature from Polar
 * SECURITY: Always verify signature when secret is configured
 */
function verifyWebhookSignature(payload: string, signature: string | null): { valid: boolean; reason: string } {
  // If no secret is configured, reject in production, warn in development
  if (!POLAR_WEBHOOK_SECRET || POLAR_WEBHOOK_SECRET === 'your_webhook_secret') {
    if (process.env.NODE_ENV === 'production') {
      console.error('POLAR_WEBHOOK_SECRET not configured in production!');
      return { valid: false, reason: 'Webhook secret not configured' };
    }
    console.warn('⚠️ Webhook signature verification skipped - POLAR_WEBHOOK_SECRET not set (development only)');
    return { valid: true, reason: 'Development mode - signature check skipped' };
  }

  if (!signature) {
    return { valid: false, reason: 'No signature provided in request' };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', POLAR_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    // Handle both raw signature and prefixed signature (sha256=xxx)
    const providedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );
    
    return { valid: isValid, reason: isValid ? 'Signature verified' : 'Invalid signature' };
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
  console.log('=== POLAR WEBHOOK RECEIVED ===');
  
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-polar-signature') || 
                      request.headers.get('polar-signature') || 
                      request.headers.get('webhook-signature');
    
    // Always verify signature when configured (security critical)
    const signatureCheck = verifyWebhookSignature(rawBody, signature);
    if (!signatureCheck.valid) {
      console.error('Webhook signature validation failed:', signatureCheck.reason);
      return NextResponse.json({ error: signatureCheck.reason }, { status: 401 });
    }
    console.log('Signature check:', signatureCheck.reason);
    
    const body = JSON.parse(rawBody);
    const { type, data } = body;
    
    // Extract event ID for idempotency
    const eventId = data.id || body.id || `${type}-${Date.now()}`;

    console.log('Webhook type:', type);
    console.log('Event ID:', eventId);
    console.log('Webhook data:', JSON.stringify(data, null, 2));

    const supabase = await createClient();

    // Idempotency check: See if we've already processed this event
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, processed_at')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.log(`Event ${eventId} already processed at ${existingEvent.processed_at}. Skipping.`);
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
        // Checkout completed - subscription should be created
        if (data.status === 'succeeded') {
          console.log('Checkout succeeded:', data.id);
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

        if (!customerEmail) {
          console.error('No customer email found in webhook data');
          const metadata = data.metadata || data.checkout?.metadata;
          console.log('Metadata:', metadata);
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

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

        // Find user by email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, tokens_balance, email, subscription_started_at, current_period_start, tokens_reset_date')
          .eq('email', customerEmail)
          .single();

        if (profileError || !profile) {
          console.error('User not found for email:', customerEmail);
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
        
        console.log('Processing cancellation for:', customerEmail);
        console.log('Access until:', currentPeriodEnd);

        if (!customerEmail) {
          console.error('No customer email found in webhook data');
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, subscription_tier')
          .eq('email', customerEmail)
          .single();

        if (profile) {
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
        
        if (!customerEmail) {
          return NextResponse.json({ error: 'No customer email' }, { status: 400 });
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (profile) {
          if (type === 'subscription.revoked') {
            // Immediate revocation - downgrade now
            await supabase
              .from('profiles')
              .update({
                subscription_tier: 'free',
                subscription_status: 'inactive',
                tokens_balance: 0,
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

      case 'order.created': {
        // One-time purchase or renewal payment
        console.log('Order created:', data.id);
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
