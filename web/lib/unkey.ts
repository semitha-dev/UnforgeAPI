/**
 * Unkey.dev Feature Rate Limiting Utilities
 *
 * Implements DECOUPLED rate limits using Unkey Namespaces:
 * - web_search: Dynamic limit based on subscription tier (RESEARCH intent)
 * - deep_research: Dynamic limit based on subscription tier (DEEP_RESEARCH intent)
 * - byok_pro_agentic: BYOK Pro agentic hard cap (100/month - Vercel protection)
 *
 * CRITICAL RULES:
 * - Rule A (Independence): Each namespace is checked independently.
 *   Hitting one limit does NOT affect the other.
 * - Rule B (BYOK Exemption): BYOK users skip deep_research limits (they use their own keys)
 * - Rule C (Tier-Based Limits): Limits are now dynamic based on subscription tier from PLAN_CONFIG
 * - Rule D (No Unlimited Defaults): If tier is missing, default to sandbox limits
 * - Rule E (BYOK Pro Rate Limit): BYOK Pro users have 10 req/sec rate limit enforced
 * - Rule F (BYOK Pro Agentic Cap): BYOK Pro agentic requests capped at 100/month
 */

import { PLAN_CONFIG, WEB_SEARCH_LIMITS, DEEP_RESEARCH_LIMITS } from './subscription-constants'
import type { ApiPlan } from './subscription-constants'

interface UnkeyRateLimitResponse {
  success: boolean
  remaining: number
  limit: number
  reset: number  // Unix timestamp in milliseconds
  error?: string
}

interface FeatureRateLimitResult {
  success: boolean
  remaining: number
  limit: number
  reset: number
  error?: string
  code?: string
}

// Namespace configuration
// SHARED CREDIT SYSTEM: Standard and Agentic share the same pool (deep_research)
// BYOK Pro agentic has a separate hard cap (100/month) for Vercel protection
export const UNKEY_NAMESPACES = {
  WEB_SEARCH: 'web_search',           // For RESEARCH intent (chat route)
  DEEP_RESEARCH: 'deep_research',     // For DEEP_RESEARCH intent (shared pool)
  BYOK_PRO_AGENTIC: 'byok_pro_agentic' // Hard cap for BYOK Pro agentic (100/month)
} as const

export type UnkeyNamespace = typeof UNKEY_NAMESPACES[keyof typeof UNKEY_NAMESPACES]

// Limits configuration (source of truth)
// These are DEFAULT limits for sandbox/free tier
// Actual limits are determined dynamically based on user's subscription tier
export const NAMESPACE_LIMITS: Record<UnkeyNamespace, {
  limit: number
  duration: string  // Human-readable for documentation
  durationMs: number
}> = {
  web_search: {
    limit: 5,  // Default for sandbox - will be overridden by tier-based limits
    duration: '24 hours',
    durationMs: 86400000  // 24 * 60 * 60 * 1000
  },
  deep_research: {
    limit: 3,  // Default for sandbox - shared pool for standard + agentic
    duration: '24 hours',
    durationMs: 86400000
  },
  byok_pro_agentic: {
    limit: 100,  // BYOK Pro agentic hard cap (Vercel protection)
    duration: '30 days',
    durationMs: 2592000000  // 30 * 24 * 60 * 60 * 1000
  }
}

// BYOK Pro Agentic Cap: 100 agentic requests per month
// This protects Vercel execution time on the $5 plan
export const BYOK_PRO_AGENTIC_CAP = 100

// BYOK Pro rate limiting: 10 req/sec
// This is enforced at the API level using a sliding window
const BYOK_PRO_RATE_LIMIT = 10  // requests per second
const BYOK_PRO_RATE_WINDOW_MS = 1000  // 1 second window

// In-memory rate limit tracking for BYOK Pro
// In production, this should be replaced with Redis or similar
const byokProRateLimitCache = new Map<string, {
  count: number
  resetTime: number
}>()

/**
 * Check BYOK Pro rate limit (10 req/sec)
 * 
 * @param workspaceId - The workspace ID for rate limiting
 * @returns Object indicating if request is allowed
 */
export function checkByokProRateLimit(workspaceId: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const cached = byokProRateLimitCache.get(workspaceId)

  if (!cached || now >= cached.resetTime) {
    // Reset or initialize
    byokProRateLimitCache.set(workspaceId, {
      count: 1,
      resetTime: now + BYOK_PRO_RATE_WINDOW_MS
    })
    return {
      allowed: true,
      remaining: BYOK_PRO_RATE_LIMIT - 1,
      resetTime: now + BYOK_PRO_RATE_WINDOW_MS
    }
  }

  if (cached.count < BYOK_PRO_RATE_LIMIT) {
    // Increment count
    cached.count += 1
    byokProRateLimitCache.set(workspaceId, cached)
    return {
      allowed: true,
      remaining: BYOK_PRO_RATE_LIMIT - cached.count,
      resetTime: cached.resetTime
    }
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: cached.resetTime
  }
}

/**
 * Get tier-based limit for a feature namespace
 * 
 * @param plan - The user's subscription tier
 * @param namespace - The feature namespace ('web_search', 'deep_research', or 'byok_pro_agentic')
 * @returns The limit for this feature based on user's tier
 */
function getTierBasedLimit(plan: string, namespace: UnkeyNamespace): number {
  // Default to sandbox if tier is missing (Rule D: No Unlimited Defaults)
  const safePlan = plan || 'sandbox'

  if (namespace === 'web_search') {
    const limitConfig = WEB_SEARCH_LIMITS[safePlan as keyof typeof WEB_SEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.web_search.limit
  } else if (namespace === 'deep_research') {
    // Shared credit pool for standard + agentic
    const limitConfig = DEEP_RESEARCH_LIMITS[safePlan as keyof typeof DEEP_RESEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.deep_research.limit
  } else if (namespace === 'byok_pro_agentic') {
    // BYOK Pro agentic hard cap - always 100/month
    return BYOK_PRO_AGENTIC_CAP
  }

  // Fallback to default limits
  return (NAMESPACE_LIMITS[namespace] as any)?.limit ?? 3
}

/**
 * Check rate limit for a specific feature namespace using Unkey's ratelimit API
 *
 * @param identifier - The identifier for rate limiting (workspaceId for account-level limits)
 * @param namespace - The feature namespace to check ('web_search' or 'deep_research')
 * @param plan - The user's subscription tier (optional, defaults to sandbox)
 * @returns Rate limit result with success status and remaining quota
 *
 * NOTE: This function uses Unkey's standalone ratelimit API, not key verification API.
 * The namespace ensures complete isolation between different feature limits.
 *
 * IMPORTANT: Rate limits are per-account (workspaceId), not per-key.
 * This prevents users from bypassing limits by creating new API keys.
 * 
 * DYNAMIC LIMITS: Limits are now determined based on user's subscription tier
 */
export async function checkFeatureRateLimit(
  identifier: string,
  namespace: UnkeyNamespace,
  plan?: string
): Promise<FeatureRateLimitResult> {
  // Determine limit based on tier
  const tierBasedLimit = getTierBasedLimit(plan || 'sandbox', namespace)
  const namespaceConfig = {
    limit: tierBasedLimit,
    duration: NAMESPACE_LIMITS[namespace].duration,
    durationMs: NAMESPACE_LIMITS[namespace].durationMs
  }

  if (!namespaceConfig) {
    return {
      success: false,
      remaining: 0,
      limit: 0,
      reset: Date.now(),
      error: `Invalid namespace: ${namespace}`,
      code: 'INVALID_NAMESPACE'
    }
  }

  const unkeyRootKey = process.env.UNKEY_ROOT_KEY
  if (!unkeyRootKey) {
    console.warn('[Unkey] UNKEY_ROOT_KEY not configured, skipping rate limit check')
    // Fail open - allow request if Unkey is not configured
    return {
      success: true,
      remaining: namespaceConfig.limit,
      limit: namespaceConfig.limit,
      reset: Date.now() + namespaceConfig.durationMs
    }
  }

  try {
    // V2 API endpoint - note: singular "ratelimit" not "ratelimits"
    const response = await fetch('https://api.unkey.com/v2/ratelimit.limit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unkeyRootKey}`
      },
      body: JSON.stringify({
        namespace: namespace,
        identifier: identifier,  // workspaceId for account-level limits
        limit: namespaceConfig.limit,  // Use tier-based limit
        duration: namespaceConfig.durationMs
        // Note: 'async' parameter was removed in Unkey v2 API
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Unkey:${namespace}] Rate limit API error:`, response.status, errorText)

      // Fail open on API errors - don't block users due to our infrastructure issues
      return {
        success: true,
        remaining: namespaceConfig.limit,
        limit: namespaceConfig.limit,
        reset: Date.now() + namespaceConfig.durationMs,
        error: `Unkey API error: ${response.status}`
      }
    }

    const rawResult = await response.json()
    // V2 API wraps result in a .data object (same as key verification)
    const result: UnkeyRateLimitResponse = rawResult.data || rawResult

    console.log(`[Unkey:${namespace}] Rate limit response:`, {
      identifier,
      rawResultKeys: Object.keys(rawResult),
      hasDataWrapper: !!rawResult.data,
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset
    })

    return {
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset
    }

  } catch (error: any) {
    console.error(`[Unkey:${namespace}] Rate limit check failed:`, error.message)

    // Fail open on network errors
    return {
      success: true,
      remaining: namespaceConfig.limit,
      limit: namespaceConfig.limit,
      reset: Date.now() + namespaceConfig.durationMs,
      error: `Network error: ${error.message}`
    }
  }
}

/**
 * Check if a plan is exempt from feature rate limits (BYOK plans)
 *
 * Rule B: BYOK users bring their own API keys, so they are not subject
 * to our managed rate limits. The API-level rate limit (50 req/day for starter,
 * 10 req/sec for pro) is their only constraint.
 */
export function isByokExempt(plan: string): boolean {
  return plan === 'byok_starter' || plan === 'byok_pro'
}

/**
 * Check if a plan requires BYOK Pro rate limiting (10 req/sec)
 */
export function requiresByokProRateLimit(plan: string): boolean {
  return plan === 'byok_pro'
}

/**
 * Get error response for a rate limit exceeded scenario
 */
export function getRateLimitErrorResponse(
  namespace: UnkeyNamespace,
  result: FeatureRateLimitResult,
  plan?: string
): {
  error: string
  code: string
  limit: number
  remaining: number
  reset_at: number
  period: string
  upgrade_hint: string
} {
  const config = NAMESPACE_LIMITS[namespace]
  const resetDate = new Date(result.reset)

  if (namespace === 'web_search') {
    // Determine period based on tier
    const limitConfig = WEB_SEARCH_LIMITS[plan as keyof typeof WEB_SEARCH_LIMITS]
    const period = limitConfig?.period || 'daily'
    const periodText = period === 'daily' ? 'day' : 'month'

    return {
      error: `${period === 'daily' ? 'Daily' : 'Monthly'} web search limit reached (${config.limit}/${periodText}). Resets ${resetDate.toLocaleString()}.`,
      code: 'RESEARCH_LIMIT_EXCEEDED',
      limit: config.limit,
      remaining: 0,
      reset_at: result.reset,
      period: period,
      upgrade_hint: 'Upgrade to Managed Pro ($20/mo) for 1,000 searches/month, or use BYOK for unlimited searches with your own Tavily key.'
    }
  }

  // deep_research - standard by default, agentic_loop is optional parameter
  const limitConfig = DEEP_RESEARCH_LIMITS[plan as keyof typeof DEEP_RESEARCH_LIMITS]
  const period = limitConfig?.period || 'daily'
  const periodText = period === 'daily' ? 'day' : 'month'

  return {
    error: `${period === 'daily' ? 'Daily' : 'Monthly'} deep research limit reached (${config.limit}/${periodText}). Resets ${resetDate.toLocaleString()}.`,
    code: 'DEEP_RESEARCH_LIMIT_EXCEEDED',
    limit: config.limit,
    remaining: 0,
    reset_at: result.reset,
    period: period,
    upgrade_hint: 'Upgrade to Managed Pro ($20/mo) for 50 deep research/month, or Managed Expert ($79/mo) for 200/month.'
  }
}
