# Payment System Debugging Summary

## Overview
This document summarizes all the debugging enhancements and fixes made to the Polar webhook payment system.

## Problem Identified
After a user purchased a "Managed Pro" subscription, the billing page was still showing "Sandbox" tier with 50 requests/day limit instead of the correct "Managed Pro" tier with 50,000 requests/month.

### Root Cause
The billing page was using `useUser()` hook from `UserContext` which has a `subscriptionTier` field, but:
1. The app's provider tree wraps `SubscriptionProvider` (from `SubscriptionContext`)
2. `SubscriptionContext` correctly fetches `subscription_tier` from the database
3. The billing page was not using the correct context
4. There was a 30-minute cache in `UserContext` preventing updated subscription data from being displayed

## Files Modified

### 1. web/app/api/webhooks/polar/route.ts
**Purpose:** Handles all Polar webhook events for subscription lifecycle management

**Changes Made:**
- Added comprehensive debug logging functions:
  - `debugPayload()` - Simplifies webhook payloads for logging
  - `simplifyObject()` - Recursively simplifies objects for logging
  - `logWebhookEvent()` - Logs webhook events with step-by-step tracking
- Enhanced logging for all webhook events:
  - Signature verification logging with detailed error messages
  - Detailed logging for `subscription.created`, `subscription.updated`, `subscription.active` events
  - Detailed logging for `order.paid` events
  - Database logging to `webhook_logs` table for audit trail
- Added idempotency checks using `webhook_events` table to prevent duplicate processing

**Key Debug Outputs:**
```typescript
[Polar/Webhook:*] Event type received
[Polar/Webhook:*] Signature verification result
[Polar/Webhook:*] Processing step details
[Polar/Webhook:*] Database update results
```

### 2. web/app/api/subscription/checkout/route.ts
**Purpose:** Creates Polar checkout sessions for subscription purchases

**Changes Made:**
- Added detailed debug logging for checkout creation flow
- Product ID resolution tracking
- Polar API request/response logging
- Error handling with stack traces

**Key Debug Outputs:**
```typescript
[Checkout:*] Product ID resolution
[Checkout:*] Polar API request
[Checkout:*] Checkout session created
```

### 3. web/lib/subscription.ts
**Purpose:** Server-side subscription utilities for fetching and checking subscription data

**Changes Made:**
- Added debug logging for `getUserSubscription()` function
- Logging for subscription expiration detection
- Logging for grace period expiration
- Enhanced `checkSubscriptionLimit()` with detailed logging

**Key Debug Outputs:**
```typescript
[Subscription:*] Fetching subscription for user
[Subscription:*] Subscription tier found
[Subscription:*] Subscription expired
[Subscription:*] Grace period expired
```

### 4. web/lib/UserContext.tsx
**Purpose:** User context for managing user authentication and profile data

**Changes Made:**
- Added cache expiration logging
- Added `clearSubscriptionCache()` utility function (for future use)

**Key Debug Outputs:**
```typescript
[UserContext:*] Cache expiration detected
[UserContext:*] Cache cleared
```

### 5. web/lib/SubscriptionContext.tsx
**Purpose:** Subscription-specific context provider

**Changes Made:**
- Added `useSubscription()` export function as an alias for `useSubscriptionContext()`
- Updated `isPro` check to handle all pro tiers: `pro`, `managed_pro`, `managed_expert`, `byok_pro`
- Updated `useSubscriptionTier()` helper to handle all pro tiers

### 6. web/app/(pages)/dashboard/billing/page.tsx
**Purpose:** Billing page displaying subscription and usage information

**Changes Made:**
- Changed import to use `useSubscription()` from `SubscriptionContext`
- Added `useUser()` for user profile data (workspace ID, subscription status, etc.)
- Added Refresh button to header for manual subscription data refresh
- Added comprehensive debug logging for subscription state
- Updated all references to use the correct context data
- Force refetch on page mount for both user and subscription data

**Key Debug Outputs:**
```typescript
[Billing Page] Force refetching user and subscription data on mount
[Billing Page] Current subscription state: { tier, isSubscriptionPro, subscriptionLoading }
[Billing Page] Manual refresh triggered
[Billing Page] Refresh complete, new tier: <tier>
```

### 7. web/POLAR_WEBHOOK_DEBUGGING_GUIDE.md (Created)
**Purpose:** Comprehensive documentation for debugging Polar webhooks

**Content:**
- Webhook architecture overview
- Event types and their purposes
- Payload examples for each event type
- Testing instructions
- Common issues and solutions
- Database schema for webhook tracking

### 8. web/SUBSCRIPTION_CACHE_ISSUE_FIX.md (Created)
**Purpose:** Documentation of the subscription cache issue and fix

**Content:**
- Root cause explanation
- Timeline of events
- Solutions implemented
- Verification steps
- Long-term improvement options

## How to Test

### 1. Verify Webhook Processing
1. Make a test purchase through Polar checkout
2. Monitor browser console for `[Polar/Webhook:*]` logs
3. Check database for updated `subscription_tier` in `profiles` table
4. Verify `webhook_logs` table contains the event

### 2. Verify Billing Page Display
1. After purchase, navigate to the billing page
2. Click the "Refresh" button in the header
3. Check browser console for `[Billing Page]` logs showing correct tier
4. Verify the page displays:
   - "Managed Pro" as current plan
   - "50,000 requests/mo" as usage limit
   - "Active" status badge

### 3. Verify API Key Upgrades
1. Check `api_keys` table for keys associated with the user's workspace
2. Verify keys have `tier: "managed_pro"` and `metadata.plan: "managed_pro"`

## Debug Mode

All debugging is controlled by the `DEBUG=true` environment variable. Set this in your `.env.local` file:

```env
DEBUG=true
```

## Database Tables

### webhook_logs
Stores all webhook events for audit trail:
- `id` - UUID
- `event_type` - Event type (e.g., `subscription.created`)
- `event_id` - Event ID from Polar
- `payload` - Full webhook payload (JSON)
- `processed_at` - Timestamp when processed
- `status` - Processing status (success/error)
- `error_message` - Error message if failed

### webhook_events
Tracks processed events for idempotency:
- `id` - UUID
- `event_id` - Event ID from Polar
- `processed_at` - Timestamp when processed

## Key Insights

### Webhook Flow
1. Polar sends webhook to `/api/webhooks/polar`
2. Signature is verified using `POLAR_WEBHOOK_SECRET`
3. Event type is identified
4. User is looked up by email
5. Subscription data is extracted from payload
6. Database is updated with new subscription tier
7. API keys are upgraded/downgraded accordingly
8. Event is logged to `webhook_logs` and `webhook_events`

### Subscription Data Flow
1. Webhook updates `profiles.subscription_tier` in database
2. `SubscriptionContext` fetches `subscription_tier` from database
3. Billing page uses `useSubscription()` to get tier from `SubscriptionContext`
4. Page displays correct plan based on tier

### Cache Behavior
- `UserContext` has 30-minute cache for profile data
- `SubscriptionContext` has 5-minute cache for subscription data
- Both caches are cleared on manual refresh
- Both caches are bypassed when `force=true` is passed to `refetch()`

## Common Issues

### Issue: Billing page shows wrong tier after purchase
**Solution:** Click the "Refresh" button on the billing page to force cache clear

### Issue: Webhook not processing
**Solution:** Check that `POLAR_WEBHOOK_SECRET` is set correctly and matches Polar dashboard

### Issue: Subscription not updating in database
**Solution:** Check webhook logs for errors, verify user email matches Polar customer email

### Issue: API keys not upgrading
**Solution:** Check that workspace ID is set in user profile, verify Unkey API is accessible

## Next Steps

1. **Monitor Production:** Watch webhook logs for any errors or issues
2. **Add Alerts:** Set up alerts for failed webhook processing
3. **Add Metrics:** Track webhook processing times and success rates
4. **Add Retry Logic:** Implement retry logic for failed webhook events
5. **Add Webhook UI:** Create admin UI for viewing and retrying webhooks

## Related Files

- `web/app/api/webhooks/polar/route.ts` - Webhook handler
- `web/app/api/subscription/checkout/route.ts` - Checkout creation
- `web/lib/subscription.ts` - Subscription utilities
- `web/lib/UserContext.tsx` - User context
- `web/lib/SubscriptionContext.tsx` - Subscription context
- `web/app/(pages)/dashboard/billing/page.tsx` - Billing page
- `web/POLAR_WEBHOOK_DEBUGGING_GUIDE.md` - Webhook debugging guide
- `web/SUBSCRIPTION_CACHE_ISSUE_FIX.md` - Cache issue documentation
