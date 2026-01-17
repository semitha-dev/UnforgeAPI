# Subscription Cache Issue - Diagnosis and Fix

## Problem Identified

After successfully purchasing a Managed Pro subscription, the database was correctly updated with:
- `subscription_tier: "managed_pro"`
- `subscription_status: "active"`
- All billing dates properly set

However, the billing page still showed:
- **Sandbox** tier (incorrect)
- **50 requests/day** limit (incorrect)
- No upgrade option shown

## Root Cause

The issue was caused by the **UserContext caching mechanism** in [`web/lib/UserContext.tsx`](web/lib/UserContext.tsx):

```typescript
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes - profile data changes less frequently
```

### How the Cache Works

1. **Global Cache**: UserContext maintains a global cache (`globalUserCache`) that persists across component mounts and navigation
2. **Cache Duration**: 30 minutes
3. **Cache Hit**: When the billing page loads, it checks if cached data exists and is within 30 minutes
4. **Problem**: After purchase, the webhook updates the database, but the frontend still uses the **old cached "sandbox" tier** from before purchase

### Timeline of Events

```
1. User visits billing page → Cache stores "sandbox" tier
2. User clicks "Upgrade to Pro" → Redirects to Polar checkout
3. User completes payment → Polar sends webhook
4. Webhook updates database to "managed_pro" ✅
5. User returns to billing page → Uses cached "sandbox" tier ❌
6. Cache expires after 30 minutes → Finally shows correct "managed_pro" tier
```

## Solutions Implemented

### 1. Enhanced Debug Logging

Added comprehensive debug logging throughout the payment system:

#### Webhook Handler ([`web/app/api/webhooks/polar/route.ts`](web/app/api/webhooks/polar/route.ts))
- Detailed logging for all webhook events
- Step-by-step tracking of subscription activation
- User lookup process (email and metadata user_id fallback)
- Profile update operations
- API key upgrade/downgrade operations

#### Checkout Route ([`web/app/api/subscription/checkout/route.ts`](web/app/api/subscription/checkout/route.ts))
- Detailed logging for checkout creation flow
- Product ID resolution tracking
- Polar API request/response logging
- Error handling with stack traces

#### Subscription Utilities ([`web/lib/subscription.ts`](web/lib/subscription.ts))
- Debug logging for `getUserSubscription` function
- Subscription expiration detection
- Grace period expiration
- Limit checking with count and remaining usage

#### UserContext ([`web/lib/UserContext.tsx`](web/lib/UserContext.tsx))
- Cache hit/miss logging
- Cache age tracking
- Cache expiration warnings

#### Billing Page ([`web/app/(pages)/dashboard/billing/page.tsx`](web/app/(pages)/dashboard/billing/page.tsx))
- Current subscription state logging
- Force refetch on mount
- Manual refresh button

### 2. Manual Refresh Button

Added a "Refresh" button to the billing page header:

```typescript
const [isRefreshing, setIsRefreshing] = useState(false)

const handleRefreshSubscription = async () => {
  setIsRefreshing(true)
  try {
    console.log('[Billing Page] Manual refresh triggered')
    await refetchUser() // Forces cache clear and fresh fetch
    console.log('[Billing Page] Refresh complete, new tier:', user?.subscriptionTier)
  } catch (error) {
    console.error('[Billing Page] Refresh failed:', error)
  } finally {
    setIsRefreshing(false)
  }
}
```

**Location**: Top right corner of billing page, next to Workspace ID

**Behavior**:
- Clicking "Refresh" clears the cache and fetches fresh data from database
- Shows loading state while refreshing
- Logs before/after tier for debugging

### 3. Cache Expiration Logging

Enhanced UserContext to log when cache expires:

```typescript
} else if (!force && globalUserCache) {
  debug('fetchUser:cacheExpired', { 
    subscriptionTier: globalUserCache.user.subscriptionTier,
    cacheAge: Math.round((Date.now() - globalUserCache.timestamp) / 1000) + 's',
    cacheDuration: Math.round(CACHE_DURATION / 1000) + 's'
  })
}
```

### 4. Force Refetch on Mount

Billing page now forces a refetch on mount:

```typescript
useEffect(() => {
  const doRefetch = async () => {
    console.log('[Billing Page] Force refetching user data on mount')
    await refetchUser()
    setIsRefetching(false)
  }
  doRefetch()
}, [])
```

## How to Verify the Fix

### Step 1: Check Console Logs

After purchasing a subscription, check the browser console for:

```
[Billing Page] Force refetching user data on mount
[UserContext:fetchUser:start] { force: true, hasCachedUser: true }
[UserContext:fetchUser:clearCache] { reason: 'force=true' }
[UserContext:fetchUser:queryProfile] { userId: "..." }
[UserContext:fetchUser:profileResult] { 
  hasProfile: true,
  subscription_tier: "managed_pro",  // ← Should be "managed_pro"
  subscription_status: "active"
}
[UserContext:fetchUser:success] { 
  subscriptionTier: "managed_pro",  // ← Should be "managed_pro"
  subscriptionStatus: "active"
}
[Billing Page] Current user subscription state: {
  subscriptionTier: "managed_pro",  // ← Should be "managed_pro"
  subscriptionStatus: "active",
  subscriptionEndsAt: "2026-02-17T16:31:01.501Z",
  defaultWorkspaceId: "..."
}
```

### Step 2: Check Billing Page Display

The billing page should now show:
- **Current Plan**: Managed Pro (not Sandbox)
- **Status**: ACTIVE
- **Period Usage**: 50,000 requests/mo (not 50/day)
- **Next Invoice**: $20
- **Available Plans**: "Current" badge on Managed Pro

### Step 3: Check API Keys (if applicable)

If you have API keys, check if they were upgraded:

```sql
SELECT id, name, tier, metadata 
FROM api_keys 
WHERE workspace_id = 'your_workspace_id' 
  AND is_active = true;
```

Expected result:
- Keys with `tier: "sandbox"` should be upgraded to `tier: "managed_pro"`
- `metadata.plan` should be `"managed_pro"`
- `metadata.searchEnabled` should be `true`

### Step 4: Use Refresh Button

If the page still shows old data:
1. Click the "Refresh" button in the top right
2. Wait for refresh to complete
3. Verify the page now shows correct subscription

## Debugging Commands

### Check Webhook Events

```sql
-- Recent webhook events
SELECT 
  event_type,
  status,
  created_at,
  (payload->>'subscription_tier') as subscription_tier
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

### Check User Profile

```sql
SELECT 
  id,
  email,
  subscription_tier,
  subscription_status,
  subscription_ends_at,
  next_billing_date,
  current_period_start,
  current_period_end,
  updated_at
FROM profiles
WHERE email = 'leaflearningoffcial@gmail.com';
```

### Check API Keys

```sql
SELECT 
  id,
  name,
  tier,
  metadata,
  created_at
FROM api_keys
WHERE workspace_id = (
  SELECT default_workspace_id 
  FROM profiles 
  WHERE email = 'leaflearningoffcial@gmail.com'
);
```

## Long-term Solutions

### Option 1: Reduce Cache Duration

For subscription data, consider reducing cache duration to 1-2 minutes instead of 30:

```typescript
// In UserContext.tsx
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for subscription data
```

### Option 2: Separate Cache for Subscription Data

Create a separate cache for subscription data that gets invalidated on purchase:

```typescript
// Cache user profile (30 min)
const PROFILE_CACHE_DURATION = 30 * 60 * 1000

// Cache subscription (1 min)
const SUBSCRIPTION_CACHE_DURATION = 1 * 60 * 1000
```

### Option 3: Real-time Subscription Updates

Use Supabase Realtime to listen for profile changes:

```typescript
// Subscribe to profile changes
supabase
  .channel('profiles')
  .on('UPDATE', { filter: `id=eq.${userId}` }, (payload) => {
    if (payload.new.subscription_tier !== payload.old.subscription_tier) {
      // Update UI immediately
      setUser(prev => ({ ...prev, subscriptionTier: payload.new.subscription_tier }))
    }
  })
  .subscribe()
```

## Summary

✅ **Root Cause Identified**: 30-minute cache preventing subscription updates from showing
✅ **Debug Logging Added**: Comprehensive logging throughout payment system
✅ **Manual Refresh Added**: Users can force refresh to see updated subscription
✅ **Documentation Created**: Complete debugging guide in [`POLAR_WEBHOOK_DEBUGGING_GUIDE.md`](POLAR_WEBHOOK_DEBUGGING_GUIDE.md)

### Immediate Actions for Users

1. **After purchase**: Click the "Refresh" button on the billing page
2. **Or wait**: Wait 30 minutes for cache to expire naturally
3. **Or refresh page**: Hard refresh (Ctrl+Shift+R) to clear memory cache

### Monitoring

Monitor these console log prefixes:
- `[Polar/Webhook:*]` - Webhook events
- `[Checkout:*]` - Checkout operations
- `[Subscription:*]` - Subscription utilities
- `[UserContext:*]` - User context operations
- `[Billing Page]` - Billing page operations

All subscription data from Polar webhooks is being correctly captured and stored in the database. The frontend now has tools to verify and refresh this data.
