/**
 * UnforgeAPI - Usage & Quota Endpoint
 * GET /api/v1/usage
 *
 * Returns current usage and remaining quota for the authenticated API key.
 * Auth via Bearer token (same as /v1/chat)
 */

import { NextRequest } from 'next/server'
import { checkFeatureRateLimit, UNKEY_NAMESPACES, NAMESPACE_LIMITS, isByokExempt } from '@/lib/unkey'

interface UnkeyVerifyResult {
  valid: boolean
  code?: string
  meta?: Record<string, any>
  keyId?: string
}

/**
 * Verify API key with Unkey (stateless)
 */
async function verifyApiKey(key: string): Promise<UnkeyVerifyResult> {
  try {
    const response = await fetch('https://api.unkey.dev/v1/keys.verifyKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })

    const rawResult = await response.json()
    const result = rawResult.data || rawResult

    if (!response.ok) {
      return {
        valid: false,
        code: result.code || rawResult.code || 'API_ERROR'
      }
    }

    return {
      valid: result.valid || false,
      code: result.code,
      meta: result.meta,
      keyId: result.keyId || result.id
    }
  } catch (error: any) {
    return { valid: false, code: 'NETWORK_ERROR' }
  }
}

/**
 * Get current rate limit status without consuming a request
 * Uses Unkey's ratelimits.limit with cost: 0 to query status
 *
 * NOTE: Rate limits are per-account (workspaceId), not per-key
 */
async function getRateLimitStatus(
  workspaceId: string,
  namespace: string
): Promise<{ remaining: number; limit: number; reset: number } | null> {
  const namespaceConfig = NAMESPACE_LIMITS[namespace as keyof typeof NAMESPACE_LIMITS]
  if (!namespaceConfig) return null

  const unkeyRootKey = process.env.UNKEY_ROOT_KEY
  if (!unkeyRootKey) {
    // If Unkey not configured, return full limits
    return {
      remaining: namespaceConfig.limit,
      limit: namespaceConfig.limit,
      reset: Date.now() + namespaceConfig.durationMs
    }
  }

  try {
    // Use cost: 0 to query status without consuming quota
    const response = await fetch('https://api.unkey.dev/v1/ratelimits.limit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unkeyRootKey}`
      },
      body: JSON.stringify({
        namespace: namespace,
        identifier: workspaceId,  // Per-account rate limiting
        limit: namespaceConfig.limit,
        duration: namespaceConfig.durationMs,
        cost: 0,  // Query only - don't consume
        async: false
      })
    })

    if (!response.ok) {
      return {
        remaining: namespaceConfig.limit,
        limit: namespaceConfig.limit,
        reset: Date.now() + namespaceConfig.durationMs
      }
    }

    const result = await response.json()
    return {
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset
    }
  } catch {
    return {
      remaining: namespaceConfig.limit,
      limit: namespaceConfig.limit,
      reset: Date.now() + namespaceConfig.durationMs
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    // ============================================
    // 1. AUTHENTICATE API KEY
    // ============================================
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return Response.json(
        { error: 'Missing API Key', code: 'MISSING_API_KEY' },
        { status: 401 }
      )
    }

    const result = await verifyApiKey(token)

    if (!result.valid) {
      return Response.json(
        { error: 'Invalid API Key', code: result.code || 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    // ============================================
    // 2. GET PLAN AND QUOTA INFO
    // ============================================
    const plan = result.meta?.plan || result.meta?.tier || 'sandbox'
    const workspaceId = result.meta?.workspaceId

    // BYOK users have unlimited feature usage (they use their own keys)
    const isByok = isByokExempt(plan)

    // ============================================
    // 3. BUILD USAGE RESPONSE
    // ============================================
    interface QuotaInfo {
      limit: number | string
      remaining: number | string
      used: number | string
      reset_at: number | null
      period: string
    }

    const quotas: Record<string, QuotaInfo> = {}

    if (isByok) {
      // BYOK users have unlimited feature access
      quotas.web_search = {
        limit: 'unlimited',
        remaining: 'unlimited',
        used: 'n/a',
        reset_at: null,
        period: 'n/a'
      }
      quotas.deep_research = {
        limit: 'unlimited',
        remaining: 'unlimited',
        used: 'n/a',
        reset_at: null,
        period: 'n/a'
      }
    } else if (workspaceId) {
      // Get rate limit status for each namespace (per-account, not per-key)
      const webSearchStatus = await getRateLimitStatus(workspaceId, UNKEY_NAMESPACES.WEB_SEARCH)
      const deepResearchStatus = await getRateLimitStatus(workspaceId, UNKEY_NAMESPACES.DEEP_RESEARCH)

      if (webSearchStatus) {
        quotas.web_search = {
          limit: webSearchStatus.limit,
          remaining: webSearchStatus.remaining,
          used: webSearchStatus.limit - webSearchStatus.remaining,
          reset_at: webSearchStatus.reset,
          period: 'daily'
        }
      }

      if (deepResearchStatus) {
        quotas.deep_research = {
          limit: deepResearchStatus.limit,
          remaining: deepResearchStatus.remaining,
          used: deepResearchStatus.limit - deepResearchStatus.remaining,
          reset_at: deepResearchStatus.reset,
          period: 'daily'
        }
      }
    }

    return Response.json({
      plan,
      is_byok: isByok,
      quotas,
      _note: isByok
        ? 'BYOK plans have unlimited feature access (you use your own API keys)'
        : 'Quota resets daily. Upgrade to BYOK for unlimited access.'
    })

  } catch (error: any) {
    console.error('[API/v1/usage:ERROR]', error)
    return Response.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
