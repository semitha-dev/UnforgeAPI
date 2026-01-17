# Usage Tracking System - Detailed Technical Report

**Report Date:** 2025-01-17  
**System:** UnforgeAPI Usage Tracking  
**Status:** Analysis Complete

---

## Executive Summary

This report provides a comprehensive technical analysis of the usage tracking system in the UnforgeAPI codebase. It covers the complete data flow from API request to dashboard display, identifies potential issues, and provides actionable recommendations.

**Key Finding:** The system uses a "fire-and-forget" architecture for usage logging. While this ensures API performance, it introduces a **single point of failure** where network issues or server downtime can result in lost usage data.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow: Step-by-Step](#data-flow-step-by-step)
3. [Component Analysis](#component-analysis)
4. [Database Schema](#database-schema)
5. [Potential Issues & Failure Points](#potential-issues--failure-points)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Recommendations](#recommendations)

---

## System Architecture

### High-Level Overview

```
┌─────────────┐
│   Client    │ (API Request)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   /api/v1/chat (Route)        │
│   - Authenticates via Unkey     │
│   - Processes Request          │
│   - Generates Response         │
└──────┬────────────────────────┘
       │
       │ 1. Fire-and-Forget POST
       ▼
┌─────────────────────────────────┐
│   /api/usage (POST Handler)    │
│   - Receives usage payload     │
│   - Inserts into Supabase     │
│   - Updates api_keys table     │
└──────┬────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Supabase Database            │
│   - api_usage table            │
│   - api_keys table             │
└──────┬────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Dashboard Usage Page         │
│   - GET /api/usage            │
│   - Aggregates & Displays     │
└─────────────────────────────────┘
```

### Key Design Patterns

1. **Fire-and-Forget Logging**: The main API route (`/api/v1/chat`) does not wait for the usage logging to complete before returning the response to the user.
2. **Stateless Design**: The chat route is designed to be stateless, relying on external services (Unkey, Supabase) for state management.
3. **Async Processing**: Usage logging happens asynchronously via `fetch()` without `await`.

---

## Data Flow: Step-by-Step

### Phase 1: API Request Processing

**File:** [`web/app/api/v1/chat/route.ts`](web/app/api/v1/chat/route.ts)

1. **Authentication** (Lines 318-366)
   - Client sends request with `Authorization: Bearer <api_key>`
   - System verifies key via Unkey API (`https://api.unkey.dev/v1/keys.verifyKey`)
   - Extracts metadata: `plan`, `tier`, `workspaceId`, `keyId`

2. **Request Processing** (Lines 649-846)
   - Classifies intent (CHAT, CONTEXT, RESEARCH)
   - Executes appropriate logic (generate chat, use context, or search web)
   - Calculates latency: `performance.now() - startTime`

3. **Usage Logging Trigger** (Lines 897-904)
   - **CRITICAL STEP**: Calls `logUsage()` function
   - Passes: `workspaceId`, `keyId`, `intent`, `latencyMs`, `query`
   - **Does NOT await** the result

### Phase 2: Usage Logging (Fire-and-Forget)

**File:** [`web/app/api/v1/chat/route.ts`](web/app/api/v1/chat/route.ts) (Lines 138-175)

```typescript
async function logUsage(data: {
  workspaceId?: string
  keyId?: string
  intent: string
  latencyMs: number
  query: string
}, context?: DebugContext) {
  
  // Fire and forget - don't await
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId: data.workspaceId,
      keyId: data.keyId,
      intent: data.intent,
      latencyMs: data.latencyMs,
      query: data.query
    })
  }).then(response => {
    // Logs success/failure but doesn't propagate errors
    debug('logUsage:complete', { 
      status: response.status,
      ok: response.ok
    }, context)
  }).catch(err => {
    // Silent fail - usage logging shouldn't break the API
    debugError('logUsage', err, context)
  })
}
```

**Key Characteristics:**
- **Non-blocking**: The main API response returns immediately
- **No retry logic**: If the fetch fails, the usage event is lost
- **Error suppression**: Errors are logged but not propagated
- **Internal fetch**: Makes an HTTP call to the same server (`NEXT_PUBLIC_APP_URL`)

### Phase 3: Database Insertion

**File:** [`web/app/api/usage/route.ts`](web/app/api/usage/route.ts) (Lines 179-232)

1. **Receives Payload** (Lines 183-193)
   - Extracts: `workspaceId`, `keyId`, `intent`, `latencyMs`, `query`

2. **Inserts into `api_usage` table** (Lines 196-204)
   ```typescript
   const { error } = await supabaseAdmin
     .from('api_usage')
     .insert({
       workspace_id: workspaceId,
       key_id: keyId,
       intent,
       latency_ms: latencyMs,
       query_preview: query?.substring(0, 100) // First 100 chars for debugging
     })
   ```

3. **Updates `api_keys` table** (Lines 213-221)
   ```typescript
   const { error: updateError } = await supabaseAdmin
     .from('api_keys')
     .update({ last_used_at: new Date().toISOString() })
     .eq('unkey_id', keyId)
   ```

4. **Error Handling** (Lines 206-221)
   - If Supabase insert fails: Logs warning, returns success anyway
   - If key update fails: Logs warning, returns success anyway
   - **Non-blocking**: Returns `{ success: true }` even if database operations fail

### Phase 4: Dashboard Display

**File:** [`web/app/(pages)/dashboard/usage/page.tsx`](web/app/(pages)/dashboard/usage/page.tsx) (Lines 135-224)

1. **Fetches Usage Data** (Lines 166-180)
   ```typescript
   const usageUrl = `/api/usage?workspaceId=${workspaceId}&range=${timeRange}${selectedKeyId !== 'all' ? `&keyId=${selectedKeyId}` : ''}`
   const usageResponse = await fetch(usageUrl)
   const usageData = await usageResponse.json()
   ```

2. **GET Handler** (File: [`web/app/api/usage/route.ts`](web/app/api/usage/route.ts), Lines 20-176)
   - Queries `api_usage` table
   - Filters by `workspaceId` and date range
   - Aggregates: total requests, daily breakdown, intent distribution
   - Returns JSON with statistics

3. **Displays Metrics** (Lines 355-646)
   - Total requests
   - Requests today/week/month
   - Intent breakdown (CHAT vs CONTEXT vs RESEARCH)
   - Daily usage chart
   - Deep research quota

---

## Component Analysis

### 1. Chat API Route (`/api/v1/chat`)

**Location:** [`web/app/api/v1/chat/route.ts`](web/app/api/v1/chat/route.ts)

**Responsibility:** Main API endpoint for chat requests

**Usage Logging Code:**
```typescript
// Line 897-904
logUsage({
  workspaceId: result.meta?.workspaceId,
  keyId: result.keyId,
  intent,
  latencyMs,
  query
}, ctx)
```

**Issues:**
- ❌ **No verification** that `workspaceId` exists in `result.meta`
- ❌ **No fallback** if `result.keyId` is missing
- ❌ **Silent failures** - if `logUsage` fails, no one knows

### 2. Usage API Route (`/api/usage`)

**Location:** [`web/app/api/usage/route.ts`](web/app/api/usage/route.ts)

**Responsibility:** Receives usage events and stores in database

**POST Handler (Logging):**
```typescript
// Lines 196-204
const { error } = await supabaseAdmin
  .from('api_usage')
  .insert({
    workspace_id: workspaceId,
    key_id: keyId,
    intent,
    latency_ms: latencyMs,
    query_preview: query?.substring(0, 100)
  })
```

**Issues:**
- ❌ **No validation** that `workspaceId` or `keyId` actually exist
- ❌ **Silent failures** - returns success even on database errors
- ❌ **No retry logic** for transient failures

**GET Handler (Retrieval):**
```typescript
// Lines 49-54
const { data: usageLogs, error } = await supabaseAdmin
  .from('api_usage')
  .select('*')
  .eq('workspace_id', workspaceId)
  .gte('created_at', startDate.toISOString())
  .order('created_at', { ascending: false })
```

**Issues:**
- ⚠️ **No error handling** if table doesn't exist (though there's a fallback)
- ⚠️ **Returns empty stats** on error instead of propagating error

### 3. Dashboard Usage Page

**Location:** [`web/app/(pages)/dashboard/usage/page.tsx`](web/app/(pages)/dashboard/usage/page.tsx)

**Responsibility:** Display usage analytics to users

**Data Fetching:**
```typescript
// Lines 166-180
const usageUrl = `/api/usage?workspaceId=${workspaceId}&range=${timeRange}${selectedKeyId !== 'all' ? `&keyId=${selectedKeyId}` : ''}`
const usageResponse = await fetch(usageUrl)
const usageData = await usageResponse.json()

if (usageResponse.ok) {
  setStats(usageData)
} else {
  // Sets empty stats on error
  setStats({
    totalRequests: 0,
    requestsToday: 0,
    // ... empty stats
  })
}
```

**Issues:**
- ❌ **No error message** shown to user when fetch fails
- ❌ **Silent fallback** to empty stats without indication
- ⚠️ **Depends on `default_workspace_id`** being set in profiles table

---

## Database Schema

### `api_usage` Table

**Purpose:** Stores individual API usage events

**Inferred Schema:**
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL,
  key_id TEXT NOT NULL,
  intent TEXT NOT NULL, -- 'CHAT', 'CONTEXT', 'RESEARCH', 'DEEP_RESEARCH'
  latency_ms INTEGER,
  query_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (likely needed for performance)
CREATE INDEX idx_api_usage_workspace_created ON api_usage(workspace_id, created_at);
CREATE INDEX idx_api_usage_key_id ON api_usage(key_id);
```

**Fields:**
- `workspace_id`: Links to workspaces table
- `key_id`: Links to `api_keys` table (via `unkey_id`)
- `intent`: Classification of the request
- `latency_ms`: Request processing time
- `query_preview`: First 100 chars of query for debugging
- `created_at`: Timestamp of the usage event

### `api_keys` Table

**Purpose:** Stores API key metadata

**Relevant Fields:**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT,
  key_hash TEXT,
  tier TEXT NOT NULL, -- 'sandbox', 'managed_pro', 'byok_starter', 'byok_pro'
  unkey_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);
```

**Update Logic:**
- `last_used_at` is updated by `/api/usage` POST handler
- `tier` is updated by Polar webhooks on subscription changes

---

## Potential Issues & Failure Points

### Issue 1: Fire-and-Forget Architecture

**Severity:** 🔴 HIGH

**Description:** The usage logging is completely asynchronous with no retry logic. If the internal fetch fails, the usage event is permanently lost.

**Failure Scenarios:**
1. **Network timeout**: The internal fetch to `/api/usage` times out
2. **Server restart**: If the server restarts between the fetch and the POST handler
3. **Database connection**: If Supabase is temporarily unavailable
4. **Rate limiting**: If the internal API rate limits itself

**Impact:** Usage data will be incomplete, showing fewer requests than actually made.

**Evidence:**
```typescript
// web/app/api/v1/chat/route.ts:156
fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
  method: 'POST',
  // ...
}).catch(err => {
  // Silent fail - usage logging shouldn't break the API
  debugError('logUsage', err, context)
})
```

### Issue 2: Missing Workspace ID

**Severity:** 🟡 MEDIUM

**Description:** If `result.meta?.workspaceId` is undefined or null, the usage event will be logged with an empty/invalid workspace ID.

**Evidence:**
```typescript
// web/app/api/v1/chat/route.ts:899
workspaceId: result.meta?.workspaceId, // Could be undefined
```

**Impact:** Usage events may not be associated with the correct workspace, causing them to not appear in the dashboard.

### Issue 3: No Error Visibility

**Severity:** 🟡 MEDIUM

**Description:** When usage logging fails, there's no way for users or admins to know. The dashboard just shows empty stats.

**Evidence:**
```typescript
// web/app/api/usage/route.ts:206-210
if (error) {
  debug('POST:supabase:error', { error: error.message })
  // Don't fail request if logging fails
  console.warn('[API/usage:POST] Failed to log usage:', error.message)
}
```

**Impact:** Users may think their API isn't working when in reality, usage logging is failing.

### Issue 4: Internal Fetch Dependency

**Severity:** 🟡 MEDIUM

**Description:** The usage logging depends on an internal HTTP fetch to `NEXT_PUBLIC_APP_URL`. This URL must be correctly configured and accessible.

**Evidence:**
```typescript
// web/app/api/v1/chat/route.ts:156
fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
```

**Impact:** If `NEXT_PUBLIC_APP_URL` is misconfigured or points to an inaccessible URL, usage logging will fail silently.

### Issue 5: No Validation of Workspace/Key Existence

**Severity:** 🟢 LOW

**Description:** The `/api/usage` POST handler doesn't validate that the `workspaceId` or `keyId` actually exist in the database.

**Evidence:**
```typescript
// web/app/api/usage/route.ts:196-204
const { error } = await supabaseAdmin
  .from('api_usage')
  .insert({
    workspace_id: workspaceId, // No validation
    key_id: keyId,           // No validation
    // ...
  })
```

**Impact:** Orphaned usage records may accumulate if keys are deleted but usage events continue to be logged.

### Issue 6: Dashboard Silent Failures

**Severity:** 🟢 LOW

**Description:** The dashboard doesn't show error messages when fetching usage data fails.

**Evidence:**
```typescript
// web/app/(pages)/dashboard/usage/page.tsx:181-194
if (usageResponse.ok) {
  setStats(usageData)
} else {
  setStats({
    totalRequests: 0,
    requestsToday: 0,
    // ... empty stats - no error message
  })
}
```

**Impact:** Users see empty usage stats without knowing why.

---

## Troubleshooting Guide

### Symptom: Usage page shows "No usage data yet"

**Possible Causes:**

1. **API requests not being made**
   - Check if you're actually making API requests to `/api/v1/chat`
   - Verify your API key is valid

2. **Usage logging failing silently**
   - Check server logs for `[API/usage:POST] Failed to log usage` errors
   - Check for `[UnforgeAPI:logUsage:ERROR]` errors

3. **Workspace ID not set**
   - Check if your user profile has `default_workspace_id` set
   - Query: `SELECT id, default_workspace_id FROM profiles WHERE id = 'your-user-id'`

4. **Database table missing**
   - Check if `api_usage` table exists in Supabase
   - Query: `SELECT * FROM information_schema.tables WHERE table_name = 'api_usage'`

5. **NEXT_PUBLIC_APP_URL misconfigured**
   - Check if `NEXT_PUBLIC_APP_URL` is set correctly
   - Should be your production URL (e.g., `https://your-app.com`)

### Symptom: Usage data incomplete (missing some requests)

**Possible Causes:**

1. **Fire-and-forget failures**
   - Check server logs for network errors during internal fetch
   - Look for `fetch failed` or `ECONNREFUSED` errors

2. **Database connection issues**
   - Check Supabase logs for connection errors
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

3. **Rate limiting**
   - Check if internal API is rate limiting itself
   - Look for 429 errors in logs

### Symptom: Usage data shows but latency is 0

**Possible Causes:**

1. **Latency calculation error**
   - Check if `performance.now()` is working correctly
   - Look for negative latency values in logs

2. **Database field type**
   - Check if `latency_ms` column allows NULL values
   - Query: `SELECT * FROM api_usage WHERE latency_ms IS NULL LIMIT 10`

### Debugging Steps

1. **Enable Debug Logging**
   ```typescript
   // Set environment variables
   DEBUG=true
   DEBUG_VERBOSE=true
   ```

2. **Check Server Logs**
   ```bash
   # Look for these log patterns
   grep "logUsage:start" logs/server.log
   grep "logUsage:complete" logs/server.log
   grep "logUsage:ERROR" logs/server.log
   grep "API/usage:POST" logs/server.log
   ```

3. **Query Database Directly**
   ```sql
   -- Check if usage logs are being inserted
   SELECT 
     COUNT(*) as total_logs,
     MIN(created_at) as first_log,
     MAX(created_at) as last_log
   FROM api_usage
   WHERE workspace_id = 'your-workspace-id';

   -- Check for logs in last hour
   SELECT * FROM api_usage
   WHERE workspace_id = 'your-workspace-id'
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

4. **Test API Endpoints Directly**
   ```bash
   # Test usage logging
   curl -X POST http://localhost:3000/api/usage \
     -H "Content-Type: application/json" \
     -d '{
       "workspaceId": "test-workspace",
       "keyId": "test-key",
       "intent": "CHAT",
       "latencyMs": 100,
       "query": "test query"
     }'

   # Test usage retrieval
   curl "http://localhost:3000/api/usage?workspaceId=test-workspace&range=30d"
   ```

---

## Recommendations

### Immediate Fixes (High Priority)

1. **Add Retry Logic to Usage Logging**
   ```typescript
   async function logUsageWithRetry(data: any, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(data)
         });
         if (response.ok) return;
       } catch (err) {
         if (i === maxRetries - 1) throw err;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   }
   ```

2. **Validate Workspace ID Before Logging**
   ```typescript
   if (!result.meta?.workspaceId) {
     console.error('[logUsage] Missing workspaceId in Unkey metadata', {
       keyId: result.keyId,
       meta: result.meta
     });
     return; // Don't log without workspace ID
   }
   ```

3. **Add Error Notifications**
   - Implement a dead letter queue for failed usage events
   - Send alerts when usage logging failure rate exceeds threshold
   - Display error messages on dashboard when data fetch fails

### Medium-Term Improvements

4. **Replace Internal Fetch with Direct Database Call**
   - Instead of fetching `/api/usage`, call Supabase directly
   - Eliminates network overhead and failure points
   - Example:
     ```typescript
     async function logUsage(data: any) {
       await supabaseAdmin.from('api_usage').insert({
         workspace_id: data.workspaceId,
         key_id: data.keyId,
         intent: data.intent,
         latency_ms: data.latencyMs,
         query_preview: data.query?.substring(0, 100)
       });
     }
     ```

5. **Add Usage Event Queue**
   - Use a message queue (Redis, SQS) for reliable delivery
   - Implement worker process to handle queue
   - Guarantees at-least-once delivery

6. **Add Data Validation**
   ```typescript
   // Validate workspace exists
   const { data: workspace } = await supabaseAdmin
     .from('workspaces')
     .select('id')
     .eq('id', workspaceId)
     .single();
   
   if (!workspace) {
     console.error('[API/usage] Invalid workspaceId', { workspaceId });
     return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 });
   }
   ```

### Long-Term Improvements

7. **Implement Usage Aggregation**
   - Pre-aggregate usage data in background jobs
   - Store aggregated stats in separate table
   - Improves dashboard query performance

8. **Add Real-Time Usage Updates**
   - Use Supabase Realtime for live updates
   - Show usage stats in real-time on dashboard

9. **Add Usage Export**
   - Allow users to export usage data as CSV
   - Useful for billing and analysis

10. **Add Usage Alerts**
    - Notify users when approaching limits
    - Send email/SMS alerts

---

## Conclusion

The UnforgeAPI usage tracking system is functional but has several weaknesses due to its fire-and-forget architecture. While this design prioritizes API performance, it creates reliability issues that can lead to incomplete usage data.

**Key Takeaways:**
- ✅ System correctly tracks and stores usage when everything works
- ❌ No retry logic or error recovery for failed usage events
- ❌ Silent failures make debugging difficult
- ⚠️ Depends on internal HTTP fetch which can fail

**Recommended Action Plan:**
1. **Immediate**: Add retry logic and validation (1-2 days)
2. **Short-term**: Replace internal fetch with direct DB calls (3-5 days)
3. **Medium-term**: Implement usage queue and worker (1-2 weeks)
4. **Long-term**: Add aggregation, real-time updates, and alerts (1 month)

---

## Appendix: Code References

| File | Lines | Purpose |
|------|-------|---------|
| [`web/app/api/v1/chat/route.ts`](web/app/api/v1/chat/route.ts) | 138-175 | `logUsage` function definition |
| [`web/app/api/v1/chat/route.ts`](web/app/api/v1/chat/route.ts) | 897-904 | Usage logging trigger |
| [`web/app/api/usage/route.ts`](web/app/api/usage/route.ts) | 179-232 | POST handler - inserts usage |
| [`web/app/api/usage/route.ts`](web/app/api/usage/route.ts) | 20-176 | GET handler - retrieves usage |
| [`web/app/(pages)/dashboard/usage/page.tsx`](web/app/(pages)/dashboard/usage/page.tsx) | 135-224 | Dashboard data fetching |
| [`web/app/(pages)/dashboard/usage/page.tsx`](web/app/(pages)/dashboard/usage/page.tsx) | 355-646 | Dashboard display logic |

---

**End of Report**
