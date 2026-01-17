# Polar Webhook Debugging Guide

## Overview

This guide provides comprehensive information about debugging Polar payment webhooks in your application. The webhook system has been enhanced with extensive debugging capabilities to help track subscription purchases and verify that all subscription details are correctly received and processed.

## Table of Contents

1. [Webhook Architecture](#webhook-architecture)
2. [Debugging Configuration](#debugging-configuration)
3. [Webhook Event Flow](#webhook-event-flow)
4. [Expected Webhook Payloads](#expected-webhook-payloads)
5. [Debug Log Format](#debug-log-format)
6. [Testing Webhooks](#testing-webhooks)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Database Schema](#database-schema)

---

## Webhook Architecture

### Webhook Endpoint
- **URL**: `/api/webhooks/polar`
- **Methods**: `GET` (health check), `POST` (webhook events)
- **Security**: HMAC signature verification using `POLAR_WEBHOOK_SECRET`

### Supported Event Types

| Event Type | Description | Handler |
|------------|-------------|----------|
| `checkout.created` | Checkout session started | Logs checkout ID |
| `checkout.updated` | Checkout status changed | Activates subscription on confirmed payment |
| `subscription.created` | New subscription created | Updates user profile with subscription details |
| `subscription.updated` | Subscription modified | Updates user profile |
| `subscription.active` | Subscription activated | Updates user profile and upgrades API keys |
| `subscription.canceled` | Subscription canceled | Sets status to canceled, keeps access until period end |
| `subscription.revoked` | Subscription revoked | Immediate downgrade to free tier |
| `subscription.uncanceled` | Subscription restored | Restores active status |
| `order.created` | Order created | Logs order details |
| `order.updated` | Order updated | Logs order details |
| `order.paid` | Order paid | Activates subscription from order |
| `charge.failed` | Payment failed | Sets grace period (7 days) |
| `charge.succeeded` | Payment succeeded | Restores from past_due if applicable |
| `subscription.payment_failed` | Subscription payment failed | Sets grace period |
| `subscription.payment_succeeded` | Subscription payment succeeded | Restores from past_due |

---

## Debugging Configuration

### Environment Variables

Ensure these are set in your `.env.local` file:

```bash
# Enable debug mode
DEBUG=true

# Polar Configuration
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=polar_whs_...
POLAR_SANDBOX=false  # Set to true for testing

# Product IDs
POLAR_MANAGED_PRO_PRODUCT_ID=dce7621a-0a26-4d40-927c-7aa0aa95debd
POLAR_MANAGED_EXPERT_PRODUCT_ID=98fab49a-04ab-4920-848c-f6ee0a5850bd
POLAR_BYOK_PRO_PRODUCT_ID=c4a4824d-8be3-411e-8c15-b198371ebc37

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Debug Mode

Debug mode is enabled when:
- `NODE_ENV === 'development'`
- `DEBUG === 'true'`

When enabled, all webhook events are logged to the console with detailed information.

---

## Webhook Event Flow

### 1. Checkout Flow

```
User clicks "Subscribe"
    ↓
POST /api/subscription/checkout
    ↓
Creates Polar checkout session
    ↓
Redirects user to Polar checkout page
    ↓
User completes payment
    ↓
Polar sends webhook events:
    - checkout.updated (confirmed)
    - order.paid (subscription_create)
    - subscription.created/updated
    - subscription.active
```

### 2. Subscription Activation Flow

```
Webhook received: subscription.created/updated
    ↓
Verify signature
    ↓
Extract subscription data:
    - customer email
    - subscription ID
    - product ID
    - billing period dates
    - metadata (user_id)
    ↓
Find user by email or user_id
    ↓
Update user profile:
    - subscription_tier
    - subscription_status
    - polar_subscription_id
    - polar_customer_id
    - subscription_ends_at
    - next_billing_date
    - auto_renew
    - current_period_start
    - current_period_end
    ↓
Upgrade API keys (if applicable)
    ↓
Log success
```

### 3. Cancellation Flow

```
User cancels subscription
    ↓
Polar sends: subscription.canceled
    ↓
Update user profile:
    - subscription_status = 'canceled'
    - canceled_at = now
    - next_billing_date = null
    - auto_renew = false
    - Keep subscription_tier until period ends
    ↓
User retains access until subscription_ends_at
    ↓
After period ends:
    - Downgrade to free tier
    - Downgrade API keys
```

---

## Expected Webhook Payloads

### subscription.created / subscription.updated / subscription.active

```json
{
  "type": "subscription.created",
  "data": {
    "id": "sub_abc123...",
    "status": "active",
    "product_id": "dce7621a-0a26-4d40-927c-7aa0aa95debd",
    "product": {
      "id": "dce7621a-0a26-4d40-927c-7aa0aa95debd",
      "name": "Managed Pro",
      "price_amount": 1999,
      "price_currency": "usd"
    },
    "customer": {
      "id": "cus_xyz789...",
      "email": "user@example.com"
    },
    "current_period_start": "2026-01-17T00:00:00Z",
    "current_period_end": "2026-02-17T00:00:00Z",
    "cancel_at_period_end": false,
    "trial_end": null,
    "metadata": {
      "user_id": "supabase_user_id_here"
    }
  }
}
```

### order.paid

```json
{
  "type": "order.paid",
  "data": {
    "id": "ord_def456...",
    "status": "paid",
    "billing_reason": "subscription_create",
    "product_id": "dce7621a-0a26-4d40-927c-7aa0aa95debd",
    "customer": {
      "id": "cus_xyz789...",
      "email": "user@example.com"
    },
    "subscription": {
      "id": "sub_abc123...",
      "status": "active",
      "current_period_start": "2026-01-17T00:00:00Z",
      "current_period_end": "2026-02-17T00:00:00Z",
      "cancel_at_period_end": false,
      "started_at": "2026-01-17T00:00:00Z",
      "metadata": {
        "user_id": "supabase_user_id_here"
      }
    },
    "metadata": {
      "user_id": "supabase_user_id_here"
    }
  }
}
```

### checkout.updated

```json
{
  "type": "checkout.updated",
  "data": {
    "id": "chk_ghi789...",
    "status": "confirmed",
    "customer_email": "user@example.com",
    "product_id": "dce7621a-0a26-4d40-927c-7aa0aa95debd",
    "metadata": {
      "user_id": "supabase_user_id_here",
      "product_type": "managed_pro"
    },
    "payment_processor_metadata": {
      "intent_status": "succeeded",
      "customer_id": "cus_xyz789..."
    }
  }
}
```

---

## Debug Log Format

### Console Logs

All debug logs follow this format:

```
2026-01-17T15:46:28.514Z [Polar/Webhook:TAG] { ...data... }
2026-01-17T15:46:28.514Z [Checkout:TAG] { ...data... }
2026-01-17T15:46:28.514Z [Subscription:TAG] { ...data... }
```

### Webhook Log Tags

| Tag | Description |
|------|-------------|
| `POST:start` | Webhook request received |
| `POST:headers` | Request headers (webhook-id, webhook-timestamp, signature) |
| `POST:signature:success` | Signature verified successfully |
| `POST:signature:fail` | Signature verification failed |
| `POST:event` | Event type and data ID |
| `POST:payload:full` | Full webhook payload (truncated at depth 4) |
| `subscription:start` | Processing subscription event |
| `subscription:extracted` | Extracted subscription data |
| `subscription:dates` | Billing period dates |
| `subscription:tier` | Determined subscription tier |
| `subscription:lookup:email` | Looking up user by email |
| `subscription:lookup:userId` | Looking up user by metadata user_id |
| `subscription:update` | Updating user profile |
| `subscription:success` | Subscription updated successfully |
| `order:start` | Processing order event |
| `order:subscription:create` | Creating subscription from order |
| `order:success` | Order processed successfully |

### Checkout Log Tags

| Tag | Description |
|------|-------------|
| `POST:start` | Checkout request received |
| `auth:result` | Authentication result |
| `body:parsed` | Request body parsed |
| `productId:final` | Final product ID determined |
| `polar:request:prepared` | Polar API request prepared |
| `polar:response:raw` | Polar API response |
| `polar:success` | Checkout created successfully |

### Subscription Utility Log Tags

| Tag | Description |
|------|-------------|
| `getUserSubscription:start` | Getting user subscription |
| `getUserSubscription:profile` | User profile data |
| `getUserSubscription:expired` | Subscription expired |
| `getUserSubscription:graceExpired` | Grace period expired |
| `checkSubscriptionLimit:start` | Checking feature limit |
| `checkSubscriptionLimit:result` | Limit check result |

---

## Testing Webhooks

### Local Testing with ngrok

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Start your development server:
   ```bash
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

5. Update Polar webhook URL:
   - Go to Polar dashboard
   - Add webhook: `https://abc123.ngrok.io/api/webhooks/polar`
   - Set webhook secret

6. Create a test checkout and monitor console logs

### Testing with Polar Sandbox

1. Enable sandbox mode in `.env.local`:
   ```bash
   POLAR_SANDBOX=true
   ```

2. Use sandbox API URL is automatic when `POLAR_SANDBOX=true`

3. Create test products in Polar sandbox

4. Test checkout flow without real payments

### Manual Webhook Testing

Use curl to test webhook endpoint:

```bash
curl -X POST http://localhost:3000/api/webhooks/polar \
  -H "Content-Type: application/json" \
  -H "webhook-id: test_123" \
  -H "webhook-timestamp: $(date +%s)" \
  -H "webhook-signature: v1,GENERATED_SIGNATURE_HERE" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_test123",
      "status": "active",
      "product_id": "dce7621a-0a26-4d40-927c-7aa0aa95debd",
      "customer": {
        "id": "cus_test123",
        "email": "test@example.com"
      },
      "current_period_start": "2026-01-17T00:00:00Z",
      "current_period_end": "2026-02-17T00:00:00Z",
      "cancel_at_period_end": false,
      "metadata": {
        "user_id": "your_supabase_user_id"
      }
    }
  }'
```

**Note**: You need to generate a valid HMAC signature for the webhook-secret.

---

## Common Issues and Solutions

### Issue 1: User not found after purchase

**Symptoms**: Webhook logs show "User not found for email: X or user_id: Y"

**Causes**:
- User email in Polar doesn't match email in Supabase
- `metadata.user_id` not passed during checkout creation
- User hasn't signed up yet

**Solutions**:
1. Ensure checkout includes `metadata.user_id`:
   ```typescript
   const checkoutPayload = {
     products: [finalProductId],
     success_url: `${APP_URL}/dashboard/billing?subscription=success`,
     customer_email: user.email,
     metadata: {
       user_id: user.id,  // Critical!
       product_type: productType
     }
   };
   ```

2. Verify user email matches between systems

3. Check webhook logs for extracted email and user_id

### Issue 2: Subscription not activated

**Symptoms**: Payment successful but user still on free tier

**Causes**:
- Webhook not received
- Webhook signature verification failed
- Database update failed
- Wrong product ID mapping

**Solutions**:
1. Check webhook logs for errors
2. Verify `PRODUCT_TO_TIER` mapping includes your product ID
3. Check database for update errors
4. Verify webhook URL is correct in Polar dashboard

### Issue 3: API keys not upgraded

**Symptoms**: Subscription active but API keys still on free tier

**Causes**:
- `upgradeUserApiKeys` function failed
- No API keys exist for user
- Wrong tier mapping

**Solutions**:
1. Check logs for `[Keys Upgrade]` messages
2. Verify user has API keys in database
3. Check tier mapping in `upgradeUserApiKeys`

### Issue 4: Duplicate webhook processing

**Symptoms**: Same webhook processed multiple times

**Causes**:
- Idempotency check failing
- `webhook_events` table not recording events

**Solutions**:
1. Check `webhook_events` table for duplicates
2. Verify `event_id` generation is unique
3. Check database constraints

### Issue 5: Signature verification fails

**Symptoms**: All webhooks return 401 Unauthorized

**Causes**:
- Wrong `POLAR_WEBHOOK_SECRET`
- Timestamp too old/future
- Signature format mismatch

**Solutions**:
1. Verify webhook secret matches Polar dashboard
2. Check system time is correct
3. Review signature verification logic

---

## Database Schema

### profiles table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  polar_subscription_id TEXT UNIQUE,
  polar_customer_id TEXT,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT false,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  default_workspace_id UUID
);
```

### webhook_events table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'processing',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### webhook_logs table (for debugging)

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### api_keys table

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  unkey_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'sandbox',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Webhook Success Rate**
   - Monitor `webhook_logs` table for failed events
   - Alert on >5% failure rate

2. **Subscription Activation Time**
   - Time between `order.paid` and profile update
   - Alert on >30 second delays

3. **User Lookup Failures**
   - Count of "User not found" errors
   - Alert on >10 per hour

4. **Signature Verification Failures**
   - Count of signature failures
   - Alert on >5 per hour

### Dashboard Queries

```sql
-- Recent webhook events
SELECT 
  event_type,
  status,
  COUNT(*) as count
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, status
ORDER BY count DESC;

-- Failed webhooks
SELECT *
FROM webhook_logs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 20;

-- Subscription activations by tier
SELECT 
  subscription_tier,
  COUNT(*) as count
FROM profiles
WHERE subscription_status = 'active'
GROUP BY subscription_tier;
```

---

## Product ID Mapping

The webhook handler maps Polar product IDs to subscription tiers:

```typescript
const PRODUCT_TO_TIER: Record<string, string> = {
  'dce7621a-0a26-4d40-927c-7aa0aa95debd': 'managed_pro',
  '98fab49a-04ab-4920-848c-f6ee0a5850bd': 'managed_expert',
  'c4a4824d-8be3-411e-8c15-b198371ebc37': 'byok_pro',
  'ea4378a7-1373-4fb7-b7e4-bb1b293e10c8': 'pro', // Legacy
};
```

**Important**: Ensure your product IDs in Polar dashboard match these values.

---

## Summary

The Polar webhook system is now fully instrumented with comprehensive debugging capabilities:

✅ **Webhook Handler**: Detailed logging for all events
✅ **Checkout Route**: Step-by-step checkout flow logging
✅ **Subscription Utilities**: User subscription and limit checking logs
✅ **Database Logging**: Webhook events stored for audit trail
✅ **Signature Verification**: Security with detailed error messages
✅ **Idempotency**: Duplicate event prevention
✅ **API Key Management**: Automatic upgrade/downgrade on subscription changes

When testing subscriptions, monitor the console logs for the `[Polar/Webhook:*]`, `[Checkout:*]`, and `[Subscription:*]` prefixes to track the complete flow from checkout to activation.
