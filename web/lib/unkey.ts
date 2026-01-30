/**
 * Unkey.dev Feature Rate Limiting Utilities
 *
 * Implements DECOUPLED rate limits using Unkey Namespaces:
 * - web_search: Dynamic limit based on subscription tier (RESEARCH intent)
 * - deep_research: Dynamic limit based on subscription tier (DEEP_RESEARCH intent)
 *
 * CRITICAL RULES:
 * - Rule A (Independence): Each namespace is checked independently.
 *   Hitting one limit does NOT affect the other.
 * - Rule B (Tier-Based Limits): Limits are now dynamic based on subscription tier from PLAN_CONFIG
 * - Rule C (No Unlimited Defaults): If tier is missing, default to sandbox limits
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
export const UNKEY_NAMESPACES = {
  WEB_SEARCH: 'web_search',           // For RESEARCH intent (chat route)
  DEEP_RESEARCH: 'deep_research'      // For DEEP_RESEARCH intent (shared pool)
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
    limit: 0,  // Deprecated - web search not available
    duration: '30 days',
    durationMs: 2592000000  // 30 * 24 * 60 * 60 * 1000
  },
  deep_research: {
    limit: 10,  // Default for sandbox (Free tier) - 10/month
    duration: '30 days',
    durationMs: 2592000000
  }
}

/**
 * Check if a plan is BYOK (Bring Your Own Key) and thus exempt from rate limiting
 * BYOK users provide their own API keys, so they don't consume our quotas
 * 
 * @param plan - The user's subscription tier
 * @returns true if the plan is a BYOK plan (exempt from rate limiting)
 */
export function isByokExempt(plan?: string): boolean {
  if (!plan) return false
  // BYOK plans start with 'byok_' prefix
  return plan.startsWith('byok_')
}

/**
 * Get tier-based limit for a feature namespace
 * 
 * @param plan - The user's subscription tier
 * @param namespace - The feature namespace ('web_search' or 'deep_research')
 * @returns The limit for this feature based on user's tier
 */
function getTierBasedLimit(plan: string, namespace: UnkeyNamespace): number {
  // Default to sandbox if tier is missing (Rule C: No Unlimited Defaults)
  const safePlan = plan || 'sandbox'

  if (namespace === 'web_search') {
    const limitConfig = WEB_SEARCH_LIMITS[safePlan as keyof typeof WEB_SEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.web_search.limit
  } else if (namespace === 'deep_research') {
    // Shared credit pool for standard + agentic
    const limitConfig = DEEP_RESEARCH_LIMITS[safePlan as keyof typeof DEEP_RESEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.deep_research.limit
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
      error: `Monthly web search limit reached. Resets ${resetDate.toLocaleString()}.`,
      code: 'RESEARCH_LIMIT_EXCEEDED',
      limit: config.limit,
      remaining: 0,
      reset_at: result.reset,
      period: period,
      upgrade_hint: 'Web search is deprecated. Use deep research instead.'
    }
  }

  // deep_research - standard by default, agentic_loop is optional parameter
  const limitConfig = DEEP_RESEARCH_LIMITS[plan as keyof typeof DEEP_RESEARCH_LIMITS]
  const period = limitConfig?.period || 'daily'
  const periodText = period === 'daily' ? 'day' : 'month'

  return {
    error: `Monthly deep research limit reached (${result.limit}/${periodText}). Resets ${resetDate.toLocaleString()}.`,
    code: 'DEEP_RESEARCH_LIMIT_EXCEEDED',
    limit: result.limit,
    remaining: 0,
    reset_at: result.reset,
    period: period,
    upgrade_hint: 'Upgrade to Pro ($29/mo) for 100 deep research/month, or Expert ($200/mo) for 800/month.'
  }
}
