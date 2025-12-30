# Payment Model Implementation - Technical Documentation

**Date:** December 30, 2025  
**Author:** Development Team  
**Status:** Ready for Review  
**Reviewer:** Senior Developer

---

## Overview

Migration from token-based system to subscription-based model with two tiers:
- **Atlas Starter (Free)** - Rate-limited features
- **Atlas Pro ($6.99/month)** - Unlimited access

Payment processor: **Polar** (polar.sh)

---

## 1. Subscription Configuration

### File: `web/lib/subscription.ts`

```typescript
// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

// Pro product ID from Polar dashboard
export const PRO_PRODUCT_ID = 'ea4378a7-1373-4fb7-b7e4-bb1b293e10c8';

// Feature limits by tier
export const LIMITS = {
  free: {
    spaces: 3,                    // Max 3 active spaces
    notes: Infinity,              // Unlimited notes
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: false,
    searchRateLimit: 5,           // 5 searches per minute
    researchSearch: false,        // LOCKED
    contentGapAudit: 'teaser',    // Limited preview
    morningReport: 'daily',       // Daily only
  },
  pro: {
    spaces: Infinity,             // Unlimited
    notes: Infinity,
    qa_pairs: Infinity,
    flashcard_sets: Infinity,
    schedule: true,
    searchRateLimit: Infinity,    // Unlimited
    researchSearch: true,         // Full access
    contentGapAudit: 'full',
    morningReport: 'full',        // Full history
  },
};

// AI Model selection by tier
export const FREE_TIER_MODEL = 'llama-3.1-8b-instant';
export const PRO_TIER_MODEL = 'llama-3.3-70b-versatile';
```

### Helper Functions

```typescript
// Check if user has Pro subscription
export function isPro(profile: SubscriptionProfile): boolean {
  return profile.subscription_tier === 'pro' && 
         hasActiveAccess(profile);
}

// Get model for user's tier
export function getModelForTier(tier: SubscriptionTier): string {
  return tier === 'pro' ? PRO_TIER_MODEL : FREE_TIER_MODEL;
}

// Check if subscription is active (considers grace period)
export function hasActiveAccess(profile: SubscriptionProfile): boolean {
  if (profile.subscription_status === 'active' || 
      profile.subscription_status === 'trialing') {
    return true;
  }
  
  // Canceled but not expired
  if (profile.subscription_status === 'canceled' && 
      profile.subscription_ends_at) {
    return new Date(profile.subscription_ends_at) > new Date();
  }
  
  // Past due with grace period
  if (profile.subscription_status === 'past_due' && 
      profile.grace_period_ends_at) {
    return new Date(profile.grace_period_ends_at) > new Date();
  }
  
  return false;
}
```

---

## 2. Database Schema

### Profiles Table (Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `subscription_tier` | text | 'free' or 'pro' |
| `subscription_status` | text | 'active', 'inactive', 'canceled', 'past_due', 'trialing' |
| `polar_subscription_id` | text | Polar subscription ID |
| `polar_customer_id` | text | Polar customer ID |
| `subscription_ends_at` | timestamp | When subscription access ends |
| `subscription_started_at` | timestamp | First subscription date |
| `current_period_start` | timestamp | Current billing period start |
| `current_period_end` | timestamp | Current billing period end |
| `next_billing_date` | timestamp | Next charge date |
| `canceled_at` | timestamp | When user canceled |
| `grace_period_ends_at` | timestamp | Grace period for failed payments |
| `auto_renew` | boolean | Will renew at period end |

**Note:** `tokens_balance` column still exists but is no longer used. Set to 0.

---

## 3. API Endpoints

### GET `/api/subscription`
Returns current user's subscription info and limits.

**Response:**
```json
{
  "subscription": {
    "tier": "free",
    "status": "inactive",
    "tokens_balance": 0,
    "ends_at": null,
    "next_billing": null,
    "auto_renew": true
  },
  "limits": {
    "spaces": 3,
    "notes": "Unlimited",
    "searchRateLimit": 5,
    "researchSearch": false,
    "contentGapAudit": "teaser",
    "morningReport": "daily"
  },
  "usage": {
    "projects": 2,
    "notes": 15
  }
}
```

### POST `/api/subscription/checkout`
Creates Polar checkout session.

**Request:**
```json
{
  "productId": "ea4378a7-1373-4fb7-b7e4-bb1b293e10c8"
}
```

**Response:**
```json
{
  "url": "https://checkout.polar.sh/...",
  "checkoutId": "checkout_xxx"
}
```

---

## 4. Polar Webhook Integration

### File: `web/app/api/webhooks/polar/route.ts`

### Endpoint: POST `/api/webhooks/polar`

### Handled Events:

| Event | Action |
|-------|--------|
| `checkout.updated` | Backup activation if order.paid doesn't arrive |
| `subscription.created` | Activate subscription |
| `subscription.updated` | Update subscription details |
| `subscription.active` | Activate subscription |
| `subscription.canceled` | Mark canceled, keep access until period end |
| `subscription.revoked` | Immediately downgrade to free |
| `subscription.uncanceled` | Restore auto-renew |
| `order.paid` | Primary activation for new subscriptions |
| `charge.failed` | Set past_due with 7-day grace period |
| `charge.succeeded` | Recover from past_due |

### Product ID Mapping:
```typescript
const PRODUCT_TO_TIER: Record<string, string> = {
  'ea4378a7-1373-4fb7-b7e4-bb1b293e10c8': 'pro',
  [process.env.POLAR_PRO_PRODUCT_ID || '']: 'pro', // Env override
};
```

### Signature Verification:
- Uses Standard Webhooks format
- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- HMAC-SHA256 with `POLAR_WEBHOOK_SECRET`
- 5-minute timestamp tolerance for replay attack prevention

### Idempotency:
- Uses `webhook_events` table to track processed events
- Event ID format: `delivery:{webhook-id}` or `{type}:{entity}:{timestamp}`
- Prevents duplicate processing

---

## 5. Frontend Components

### GlobalSidebar Props Change

**Before (Token-based):**
```typescript
interface GlobalSidebarProps {
  onTokenClick?: () => void
  tokenBalance?: number
}
```

**After (Subscription-based):**
```typescript
interface GlobalSidebarProps {
  isPro?: boolean
  onUpgradeClick?: () => void
}
```

### UpgradeModal Component

**File:** `web/components/ui/upgrade-modal.tsx`

```typescript
interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}
```

**Checkout Flow:**
1. User clicks "Upgrade Now"
2. POST to `/api/subscription/checkout` with `PRO_PRODUCT_ID`
3. Redirect to Polar checkout URL
4. Polar processes payment
5. Webhook updates profile
6. User returns to `/dashboard/settings?subscription=success`

---

## 6. AI Feature Access Control

### Updated API Routes

All AI generation routes now check subscription status instead of tokens:

| Route | Change |
|-------|--------|
| `/api/flashcards` | Removed token check/deduction |
| `/api/quiz/generate` | Removed token check/deduction |
| `/api/study/generate` | Removed token check/deduction |
| `/api/notes/summarize` | Removed token check/deduction |
| `/api/notes/leafai` | Removed token check/deduction |
| `/api/leafai/chat` | Removed token check/deduction |

### Access Check Pattern:
```typescript
const subscription = await getUserSubscription(user.id);

// Check subscription is valid
if (!hasActiveAccess(subscription) && subscription.subscription_tier !== 'free') {
  return NextResponse.json(
    { error: 'Your subscription has expired.' },
    { status: 403 }
  );
}

// Free users can still use AI features (unlimited in new model)
```

---

## 7. Environment Variables

```env
# Polar Configuration
POLAR_ACCESS_TOKEN=polar_at_xxx
POLAR_WEBHOOK_SECRET=polar_whs_xxx
POLAR_SANDBOX=false  # Set to 'true' for testing

# Optional override (defaults to hardcoded ID)
POLAR_PRO_PRODUCT_ID=ea4378a7-1373-4fb7-b7e4-bb1b293e10c8
```

---

## 8. Migration Checklist

### Completed:
- [x] Updated `subscription.ts` with new tiers and limits
- [x] Created `UpgradeModal` component
- [x] Updated `GlobalSidebar` to show Pro badge / Upgrade button
- [x] Updated all pages to use `UpgradeModal`
- [x] Removed token deduction from all API routes
- [x] Updated Polar webhook for new product ID
- [x] Updated checkout route to accept `productId`

### Files Deprecated (can be deleted):
- [ ] `web/components/ui/token-purchase-modal.tsx`
- [ ] `web/lib/useTokenRefresh.ts`
- [ ] `web/lib/useTokenSubscription.ts`

### Database Cleanup (optional):
- [ ] Remove `tokens_balance` column from profiles
- [ ] Drop `token_transactions` table
- [ ] Drop `token_purchases` table

---

## 9. Testing Checklist

### Free Tier:
- [ ] User can create up to 3 spaces
- [ ] User sees "Upgrade" button in sidebar
- [ ] User can generate flashcards/quizzes (unlimited)
- [ ] Search is rate-limited to 5/min
- [ ] Research Search shows locked state
- [ ] Content Gap Audit shows teaser

### Pro Tier:
- [ ] User can create unlimited spaces
- [ ] User sees "Pro" badge in sidebar
- [ ] All features unlocked
- [ ] No rate limits

### Subscription Flow:
- [ ] Clicking "Upgrade" opens modal
- [ ] "Upgrade Now" redirects to Polar
- [ ] Successful payment activates Pro
- [ ] Cancellation keeps access until period end
- [ ] Failed payment triggers grace period

### Webhook:
- [ ] Signature verification works
- [ ] Idempotency prevents duplicates
- [ ] All subscription events handled

---

## 10. Enforcement Implementation (Completed)

### 1. Space Limit Enforcement ✅
**File:** `web/app/api/projects/create/route.ts`

```typescript
// Check space limit for free users
const subscription = await getUserSubscription(user.id)
const limit = isPro(subscription) ? LIMITS.pro.spaces : LIMITS.free.spaces

// Count existing projects
const { count } = await supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)

if (count !== null && count >= limit) {
  return NextResponse.json(
    { error: 'Free limit reached. Upgrade to Atlas Pro to create unlimited spaces.' },
    { status: 403 }
  )
}
```

### 2. Search Rate Limiting ✅
**File:** `web/app/api/leafai/search/route.ts`

- Implemented sliding window counter (5 requests/60 seconds for free users)
- Returns 429 Too Many Requests when exceeded
- Includes `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- Pro users have unlimited searches

```typescript
// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number }

// Usage in POST handler:
if (!userIsPro) {
  const rateLimit = checkRateLimit(userId)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded...`, upgradeRequired: true, resetIn: ... },
      { status: 429 }
    )
  }
}
```

### 3. Research Mode Lock ✅
**File:** `web/app/api/leafai/search/route.ts`

```typescript
// Check research mode access
if (mode === 'research' && !userIsPro) {
  return NextResponse.json(
    { 
      error: 'Research mode requires Atlas Pro. Upgrade to access deep research features.',
      upgradeRequired: true 
    },
    { status: 403 }
  )
}
```

---

## 11. Known Issues / TODOs (Resolved)

All critical enforcement items have been implemented:
- ✅ Space limits enforced in `/api/projects/create`
- ✅ Rate limiting enforced in `/api/leafai/search`
- ✅ Research mode locked for free users

### Remaining Considerations:
1. **Rate Limit Store:** Currently using in-memory Map. For production with multiple serverless instances, consider Redis or database-backed rate limiting.
2. **Usage Indicator UI:** Show "Requests: X/5" indicator near search bar for free users (frontend task)

### Answered Questions:
1. ~~Should we show a "usage" indicator for free tier search rate?~~ **Yes**, implement in frontend
2. ~~What should happen when a Pro user downgrades mid-cycle?~~ Keep Pro until `current_period_end` (handled by `subscription_ends_at`)
3. ~~Do we need email notifications for subscription events?~~ Let Polar handle transactional emails
4. Should we implement annual pricing option? (Future consideration)

---

**End of Document**
