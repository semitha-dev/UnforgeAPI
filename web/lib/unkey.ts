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
 * - Rule B (BYOK Exemption): BYOK users (byok_starter, byok_pro) skip these limits.
 * - Rule C (Tier-Based Limits): Limits are now dynamic based on subscription tier from PLAN_CONFIG
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
export const UNKEY_NAMESPACES = {
  WEB_SEARCH: 'web_search',      // For RESEARCH intent (chat route)
  DEEP_RESEARCH: 'deep_research' // For DEEP_RESEARCH intent (deep-research route)
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
    limit: 3,  // Default for sandbox - will be overridden by tier-based limits
    duration: '24 hours',
    durationMs: 86400000
  }
}

/**
 * Get tier-based limit for a feature namespace
 * 
 * @param plan - The user's subscription tier
 * @param namespace - The feature namespace ('web_search' or 'deep_research')
 * @returns The limit for this feature based on user's tier
 */
function getTierBasedLimit(plan: string, namespace: UnkeyNamespace): number {
  if (namespace === 'web_search') {
    const limitConfig = WEB_SEARCH_LIMITS[plan as keyof typeof WEB_SEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.web_search.limit
  } else if (namespace === 'deep_research') {
    const limitConfig = DEEP_RESEARCH_LIMITS[plan as keyof typeof DEEP_RESEARCH_LIMITS]
    return limitConfig?.limit !== undefined ? limitConfig.limit : NAMESPACE_LIMITS.deep_research.limit
  }
  
  // Fallback to default limits
  return namespace === 'web_search' ? NAMESPACE_LIMITS.web_search.limit : NAMESPACE_LIMITS.deep_research.limit
}

/**
 * Check rate limit for a specific feature namespace using Unkey's ratelimit API
 *
 * @param identifier - The identifier for rate limiting (workspaceId for account-level limits)
 * @param namespace - The feature namespace to check ('web_search' or 'deep_research')
 * @param plan - The user's subscription tier (optional, defaults to sandbox)
 * @returns Rate limit result with success status and remaining quota
 *
 * NOTE: This function uses Unkey's standalone ratelimit API, not the key verification API.
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
    // Use Unkey's ratelimit API with namespace isolation
    const response = await fetch('https://api.unkey.dev/v1/ratelimits.limit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unkeyRootKey}`
      },
      body: JSON.stringify({
        namespace: namespace,
        identifier: identifier,  // workspaceId for account-level limits
        limit: namespaceConfig.limit,  // Use tier-based limit
        duration: namespaceConfig.durationMs,
        async: false  // Sync mode for accurate count
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

    const result: UnkeyRateLimitResponse = await response.json()
    
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

  // deep_research
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
    upgrade_hint: 'Upgrade to Managed Pro ($20/mo) for 50 reports/month, or use BYOK for unlimited reports with your own keys.'
  }
}
