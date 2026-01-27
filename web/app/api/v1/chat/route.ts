/**
 * UnforgeAPI - Hybrid RAG Router
 * POST /api/v1/chat
 * 
 * Fully STATELESS - No database connections
 * Auth via Unkey, BYOK-first logic
 */

import { NextRequest } from 'next/server'
import {
  classifyIntent,
  generateChat,
  generateFromContext,
  tavilySearch,
  synthesizeAnswer,
  didBreakCharacter,
  type Intent,
  type ChatMessage,
  type GenerationOptions,
  type GenerationResult
} from '@/lib/router'
import { Redis } from '@upstash/redis'
import { isPriorityPlan, type ApiPlan } from '@/lib/subscription-constants'
import { checkFeatureRateLimit, isByokExempt, getRateLimitErrorResponse, UNKEY_NAMESPACES } from '@/lib/unkey'

// ============================================
// ENHANCED DEBUG SYSTEM
// ============================================

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
const DEBUG_VERBOSE = process.env.DEBUG_VERBOSE === 'true'

interface DebugContext {
  requestId: string
  startTime: number
}

function debug(tag: string, data: any, context?: DebugContext) {
  if (!DEBUG) return

  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const reqId = context?.requestId || ''

  const prefix = `[UnforgeAPI:${tag}]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`

  if (DEBUG_VERBOSE) {
    console.log(`${timestamp} ${prefix}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
  }
}

// ============================================
// UPSTASH REDIS FOR PRIORITY QUEUE
// ============================================

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

function debugSuccess(tag: string, data: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const reqId = context?.requestId || ''
  const prefix = `✅ [UnforgeAPI:${tag}]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`
  console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
}

function debugError(tag: string, error: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const reqId = context?.requestId || ''
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const prefix = `❌ [UnforgeAPI:${tag}:ERROR]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`

  console.error(`${timestamp} ${prefix}`, {
    message: error?.message || String(error),
    name: error?.name,
    stack: DEBUG_VERBOSE ? error?.stack : undefined,
    code: error?.code,
    status: error?.status,
    cause: error?.cause
  })
}

interface RequestBody {
  query: string
  context?: string
  history?: ChatMessage[]
  // New parameters from customer feedback
  system_prompt?: string      // Custom system prompt for persona/behavior
  force_intent?: Intent       // Override intent classification
  temperature?: number        // LLM temperature (0.0 - 1.0)
  max_tokens?: number         // Max response tokens
  // Enterprise features
  strict_mode?: boolean       // Enforce system prompt as hard constraints
  grounded_only?: boolean     // Only use context, refuse if not found
  citation_mode?: boolean     // Return which parts of context were used
}

interface ResponseMeta {
  intent: Intent
  routed_to: Intent
  cost_saving: boolean
  latency_ms: number
  sources?: Array<{ title: string; url: string }>
  intent_forced?: boolean    // True if force_intent was used
  temperature_used?: number  // Actual temperature used
  max_tokens_used?: number   // Actual max_tokens used
  // Enterprise features
  confidence_score?: number  // 0.0 - 1.0 confidence in response
  grounded?: boolean         // True if grounded_only was used
  citations?: string[]       // Excerpts from context that were used
  refusal?: {                // Present if strict_mode blocked the query
    reason: string
    violated_instruction: string
  }
}

interface UnkeyVerifyResult {
  valid: boolean
  code?: string
  meta?: Record<string, any>
  keyId?: string
  ratelimit?: {
    limit: number
    remaining: number
    reset: number
  }
}

/**
 * Log usage to database (fire-and-forget)
 */
async function logUsage(data: {
  workspaceId?: string
  keyId?: string
  intent: string
  latencyMs: number
  query: string
}, context?: DebugContext) {
  debug('logUsage:start', {
    workspaceId: data.workspaceId,
    keyId: data.keyId,
    intent: data.intent,
    latencyMs: data.latencyMs
  }, context)

  if (!data.workspaceId || !data.keyId) {
    debug('logUsage:skipped', { reason: 'missing workspaceId or keyId' }, context)
    return
  }

  // Use the shared logger which writes directly to Supabase
  // This replaces the internal fetch call to avoid 504 timeouts and improve performance
  import('@/lib/logger').then(({ logUsage: logToSupabase }) => {
    logToSupabase({
      workspaceId: data.workspaceId!,
      keyId: data.keyId!,
      intent: data.intent,
      latencyMs: data.latencyMs,
      query: data.query
    }).catch(err => {
      debugError('logUsage', err, context)
    })
  })
}

/**
 * Single attempt to verify API key with Unkey (internal)
 */
async function verifyApiKeyOnce(key: string, context?: DebugContext): Promise<UnkeyVerifyResult & { shouldRetry?: boolean }> {
  const verifyStartTime = performance.now()

  try {
    // V2 API endpoint (V1 is deprecated)
    // V2 requires Authorization header with root key
    const unkeyRootKey = process.env.UNKEY_ROOT_KEY
    const response = await fetch('https://api.unkey.com/v2/keys.verifyKey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(unkeyRootKey && { 'Authorization': `Bearer ${unkeyRootKey}` })
      },
      body: JSON.stringify({ key })
    })

    const verifyLatency = Math.round(performance.now() - verifyStartTime)
    const rawResult = await response.json()
    // V2 wraps result in a .data object
    const result = rawResult.data || rawResult

    debug('verifyApiKey:response', {
      ok: response.ok,
      status: response.status,
      verifyLatencyMs: verifyLatency,
      valid: result.valid,
      code: result.code,
      hasMetadata: !!result.meta,
      keyId: result.keyId || result.id,
      ownerId: result.ownerId,
      requestId: rawResult.meta?.requestId,
      rawError: result.error || rawResult.error,
      ratelimit: result.ratelimit
    }, context)

    if (!response.ok) {
      debugError('verifyApiKey:httpError', {
        status: response.status,
        statusText: response.statusText,
        body: JSON.stringify(rawResult).substring(0, 500)
      }, context)
      // Retry on 5xx errors or 429 (rate limited at Unkey level)
      const shouldRetry = response.status >= 500 || response.status === 429
      return {
        valid: false,
        code: result.code || rawResult.code || 'API_ERROR',
        shouldRetry
      }
    }

    return {
      valid: result.valid || false,
      code: result.code,
      meta: result.meta,
      keyId: result.keyId || result.id,
      ratelimit: result.ratelimit,
      shouldRetry: false
    }
  } catch (error: any) {
    debugError('verifyApiKey:networkError', {
      errorName: error.name,
      errorMessage: error.message,
      verifyLatencyMs: Math.round(performance.now() - verifyStartTime)
    }, context)
    // Network errors are always retryable
    return { valid: false, code: 'NETWORK_ERROR', shouldRetry: true }
  }
}

/**
 * Verify API key with Unkey (stateless) - with automatic retry on transient errors
 */
const MAX_VERIFY_RETRIES = 2
const RETRY_DELAY_MS = 150

async function verifyApiKey(key: string, context?: DebugContext): Promise<UnkeyVerifyResult> {
  debug('verifyApiKey:start', { keyPrefix: key.substring(0, 10) + '...', keyLength: key.length, maxRetries: MAX_VERIFY_RETRIES }, context)

  let lastResult: UnkeyVerifyResult = { valid: false, code: 'UNKNOWN' }

  for (let attempt = 1; attempt <= MAX_VERIFY_RETRIES + 1; attempt++) {
    const result = await verifyApiKeyOnce(key, context)

    // Success - return immediately
    if (result.valid) {
      if (attempt > 1) {
        debug('verifyApiKey:retrySuccess', { attempt, totalAttempts: attempt }, context)
      }
      return {
        valid: result.valid,
        code: result.code,
        meta: result.meta,
        keyId: result.keyId
      }
    }

    lastResult = result

    // Don't retry if it's a definitive failure (key not found, expired, etc.)
    if (!result.shouldRetry) {
      debug('verifyApiKey:noRetry', { attempt, code: result.code }, context)
      break
    }

    // Don't retry if we've exhausted attempts
    if (attempt > MAX_VERIFY_RETRIES) {
      debug('verifyApiKey:exhaustedRetries', { attempt, code: result.code }, context)
      break
    }

    // Wait before retrying (with exponential backoff)
    const delay = RETRY_DELAY_MS * attempt
    debug('verifyApiKey:retrying', { attempt, nextAttempt: attempt + 1, delayMs: delay, code: result.code }, context)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  return {
    valid: lastResult.valid,
    code: lastResult.code,
    meta: lastResult.meta,
    keyId: lastResult.keyId,
    ratelimit: lastResult.ratelimit
  }
}

export async function POST(req: NextRequest) {
  const startTime = performance.now()
  const requestId = `api-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const ctx: DebugContext = { requestId, startTime }

  debug('POST:start', {
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    headers: {
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent')?.substring(0, 100),
      hasAuth: !!req.headers.get('Authorization'),
      hasGroqKey: !!req.headers.get('x-groq-key'),
      hasTavilyKey: !!req.headers.get('x-tavily-key')
    }
  }, ctx)

  try {
    // ============================================
    // 1. HEADER AUTHENTICATION (Stateless)
    // ============================================
    debug('auth:start', {}, ctx)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    debug('auth:check', {
      hasAuth: !!authHeader,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 10)
    }, ctx)

    if (!token) {
      debug('auth:fail', { reason: 'MISSING_API_KEY' }, ctx)
      return Response.json(
        { error: 'Missing API Key', code: 'MISSING_API_KEY' },
        { status: 401 }
      )
    }

    // ============================================
    // 2. UNKEY VERIFICATION (Stateless HTTP call)
    // ============================================
    debug('unkey:verifying', {}, ctx)
    const result = await verifyApiKey(token, ctx)

    debug('unkey:result', {
      valid: result.valid,
      code: result.code,
      tier: result.meta?.tier,
      keyId: result.keyId
    }, ctx)

    if (!result.valid) {
      // Check if rate limited
      if (result.code === 'RATE_LIMITED') {
        debug('unkey:ratelimited', { code: result.code }, ctx)
        return Response.json(
          { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
          { status: 429 }
        )
      }
      debug('unkey:invalid', { code: result.code }, ctx)
      return Response.json(
        { error: 'Invalid API Key', code: result.code || 'INVALID_API_KEY' },
        { status: 401 }
      )
    }

    // ============================================
    // 3. PARSE REQUEST & HEADERS (BYOK Logic)
    // ============================================
    debug('request:parsing', {}, ctx)

    let body: RequestBody
    try {
      body = await req.json()
      debug('request:body', {
        hasQuery: !!body.query,
        queryLength: body.query?.length,
        queryPreview: body.query?.substring(0, 100),
        hasContext: !!body.context,
        contextLength: body.context?.length,
        contextPreview: body.context?.substring(0, 100),
        hasHistory: !!body.history,
        historyLength: body.history?.length,
        hasSystemPrompt: !!body.system_prompt,
        forceIntent: body.force_intent,
        temperature: body.temperature,
        maxTokens: body.max_tokens,
        strictMode: body.strict_mode,
        groundedOnly: body.grounded_only,
        citationMode: body.citation_mode
      }, ctx)
    } catch (parseError: any) {
      debugError('request:parseError', parseError, ctx)
      return Response.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    const {
      query,
      context,
      history,
      system_prompt,
      force_intent,
      temperature,
      max_tokens,
      strict_mode,
      grounded_only,
      citation_mode
    } = body

    if (!query || typeof query !== 'string') {
      debug('request:invalid', { reason: 'missing query', queryType: typeof query }, ctx)
      return Response.json(
        { error: 'Missing required field: query', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    if (query.length > 10000) {
      debug('request:invalid', { reason: 'query too long', queryLength: query.length }, ctx)
      return Response.json(
        { error: 'Query too long (max 10000 characters)', code: 'QUERY_TOO_LONG' },
        { status: 400 }
      )
    }

    // Validate new parameters
    if (force_intent && !['CHAT', 'CONTEXT', 'RESEARCH'].includes(force_intent)) {
      debug('request:invalid', { reason: 'invalid force_intent', value: force_intent }, ctx)
      return Response.json(
        { error: 'Invalid force_intent. Must be one of: CHAT, CONTEXT, RESEARCH', code: 'INVALID_FORCE_INTENT' },
        { status: 400 }
      )
    }

    // Validate and clamp temperature
    const validTemperature = temperature !== undefined
      ? Math.max(0, Math.min(1, temperature))
      : undefined

    // Validate and clamp max_tokens
    const validMaxTokens = max_tokens !== undefined
      ? Math.max(50, Math.min(2000, max_tokens))
      : undefined

    debug('params:validated', {
      validTemperature,
      validMaxTokens,
      hasSystemPrompt: !!system_prompt,
      forceIntent: force_intent
    }, ctx)

    // Check if user provided their own keys in headers (BYOK)
    const userGroqKey = req.headers.get('x-groq-key')
    const userTavilyKey = req.headers.get('x-tavily-key')

    // Determine active keys (User's key > System Fallback)
    // This protects our wallet - BYOK users use their own credits
    const activeGroqKey = userGroqKey || process.env.GROQ_API_KEY
    const activeTavilyKey = userTavilyKey || process.env.TAVILY_API_KEY

    debug('byok:keys', {
      hasUserGroqKey: !!userGroqKey,
      hasUserTavilyKey: !!userTavilyKey,
      hasSystemGroq: !!process.env.GROQ_API_KEY,
      hasSystemTavily: !!process.env.TAVILY_API_KEY,
      usingSystemGroq: !userGroqKey,
      usingSystemTavily: !userTavilyKey
    }, ctx)

    if (!activeGroqKey) {
      debug('byok:noGroqKey', {}, ctx)
      return Response.json(
        { error: 'No Groq API key available', code: 'MISSING_LLM_KEY' },
        { status: 500 }
      )
    }

    // Get tier from Unkey metadata (if set)
    const plan = result.meta?.plan || result.meta?.tier || 'sandbox'
    const validPlanType = plan as ApiPlan
    const isByokPlan = plan === 'byok_starter' || plan === 'byok_pro'
    // Search is enabled for all plans - rate limits enforce fair usage
    const searchEnabled = result.meta?.searchEnabled !== false
    const requiresUserKeys = result.meta?.requiresUserKeys || isByokPlan
    const isPriority = isPriorityPlan(validPlanType)

    debug('tier:check', { plan, isByokPlan, searchEnabled, requiresUserKeys, isPriority }, ctx)

    // ============================================
    // PRIORITY QUEUE CHECK (Free users throttled under load)
    // ============================================
    if (!isPriority) {
      const redis = getRedisClient()
      if (redis) {
        try {
          // Check system load (requests in last minute from free users)
          const freeUserLoadKey = 'system:free_user_load'
          const currentLoad = await redis.incr(freeUserLoadKey)

          // Set expiry if this is a new key
          if (currentLoad === 1) {
            await redis.expire(freeUserLoadKey, 60)
          }

          // If more than 100 free user requests per minute, throttle
          const FREE_USER_THROTTLE_THRESHOLD = 100
          if (currentLoad > FREE_USER_THROTTLE_THRESHOLD) {
            debug('priority:throttled', {
              plan,
              currentLoad,
              threshold: FREE_USER_THROTTLE_THRESHOLD
            }, ctx)

            return Response.json({
              error: 'System is currently busy. Paid users are prioritized during high traffic.',
              code: 'SYSTEM_BUSY',
              hint: 'Please try again in a few seconds, or upgrade to a paid plan for priority access.',
              retry_after: 5,
              upgrade_url: 'https://www.unforgeapi.com/pricing'
            }, { status: 503 })
          }
        } catch (loadCheckError) {
          // Don't fail the request if load check fails
          debugError('priority:loadCheckError', loadCheckError, ctx)
        }
      }
    }

    // ============================================
    // BYOK KEY REQUIREMENT CHECK
    // ============================================
    // If plan requires user keys (byok_starter, byok_pro), enforce header requirements
    if (requiresUserKeys) {
      if (!userGroqKey) {
        debug('byok:missingGroqKey', { plan }, ctx)
        return Response.json(
          {
            error: 'BYOK plans require x-groq-key header',
            code: 'BYOK_MISSING_GROQ_KEY',
            hint: 'Add your Groq API key in the x-groq-key header'
          },
          { status: 400 }
        )
      }
      if (!userTavilyKey) {
        debug('byok:missingTavilyKey', { plan }, ctx)
        return Response.json(
          {
            error: 'BYOK plans require x-tavily-key header',
            code: 'BYOK_MISSING_TAVILY_KEY',
            hint: 'Add your Tavily API key in the x-tavily-key header'
          },
          { status: 400 }
        )
      }
    }

    // ============================================
    // 4. SMART ROUTING DECISION
    // ============================================
    // Priority: force_intent > smart routing > classifier

    let intent: Intent
    let classification: { intent: Intent; confidence: number; reason: string }

    // Check for force_intent override FIRST
    if (force_intent) {
      intent = force_intent
      classification = {
        intent: force_intent,
        confidence: 1.0,
        reason: 'User forced intent via force_intent parameter'
      }
      debug('router:forcedIntent', {
        forcedIntent: force_intent,
        hasContext: !!context
      }, ctx)
    } else if (context) {
      // CONTEXT PROVIDED → Always use context-aware path
      // Only question: Does user need external search too?
      debug('router:contextProvided', {
        queryPreview: query.substring(0, 100),
        contextLength: context.length
      }, ctx)

      const classifyStartTime = performance.now()
      classification = await classifyIntent(query, context, activeGroqKey)
      const classifyLatency = Math.round(performance.now() - classifyStartTime)

      // Override: If router says CHAT but we have context, use CONTEXT instead
      // This prevents the AI from ignoring company context
      if (classification.intent === 'CHAT') {
        intent = 'CONTEXT'
        debug('router:override', {
          originalIntent: 'CHAT',
          newIntent: 'CONTEXT',
          reason: 'Context provided - must use context-aware response'
        }, ctx)
      } else {
        intent = classification.intent
      }

      debug('router:classified', {
        originalIntent: classification.intent,
        finalIntent: intent,
        confidence: classification.confidence,
        reason: classification.reason,
        classifyLatencyMs: classifyLatency
      }, ctx)
    } else {
      // NO CONTEXT → Normal routing (CHAT vs RESEARCH)
      debug('router:noContext', {
        queryPreview: query.substring(0, 100)
      }, ctx)

      const classifyStartTime = performance.now()
      classification = await classifyIntent(query, context, activeGroqKey)
      const classifyLatency = Math.round(performance.now() - classifyStartTime)

      intent = classification.intent

      debug('router:classified', {
        intent,
        confidence: classification.confidence,
        reason: classification.reason,
        classifyLatencyMs: classifyLatency
      }, ctx)
    }

    // ============================================
    // 5. EXECUTION PATHS
    // ============================================
    let answer: string
    let sources: Array<{ title: string; url: string }> | undefined

    // Enterprise feature response fields
    let meta_confidence_score: number | undefined
    let meta_grounded: boolean | undefined
    let meta_citations: string[] | undefined
    let meta_refusal: { reason: string; violated_instruction: string } | undefined

    // Rate limit tracking for headers (only set if rate limit was checked)
    let rateLimitInfo: { limit: number; remaining: number; reset: number } | undefined

    if (intent === 'CHAT') {
      // Path A: Simple chat (only when NO context provided)
      debug('path:chat:start', { hasContext: !!context }, ctx)
      const pathStartTime = performance.now()

      try {
        answer = await generateChat(query, activeGroqKey, context)
        debug('path:chat:complete', {
          answerLength: answer.length,
          pathLatencyMs: Math.round(performance.now() - pathStartTime)
        }, ctx)
      } catch (error: any) {
        debugError('path:chat', error, ctx)
        answer = 'Hello! How can I help you today?'
      }
    }
    else if (intent === 'CONTEXT') {
      // Path B: Local RAG (Zero Search Cost)
      // Absolutely NO calls to Tavily
      debug('path:context:start', {
        contextLength: context?.length,
        historyLength: history?.length,
        hasSystemPrompt: !!system_prompt,
        temperature: validTemperature,
        maxTokens: validMaxTokens,
        strictMode: strict_mode,
        groundedOnly: grounded_only,
        citationMode: citation_mode
      }, ctx)
      const pathStartTime = performance.now()

      if (!context) {
        debug('path:context:noContext', { fallbackToResearch: false }, ctx)
        answer = 'No context was provided to answer your question.'
      } else {
        // Build generation options with enterprise features
        const genOptions: GenerationOptions = {
          history,
          system_prompt,
          temperature: validTemperature,
          max_tokens: validMaxTokens,
          strict_mode,
          grounded_only,
          citation_mode
        }

        try {
          const result = await generateFromContext(query, context, activeGroqKey, genOptions)
          answer = result.answer

          // Populate enterprise response metadata
          meta_confidence_score = result.confidence_score
          meta_grounded = result.grounded
          meta_citations = result.citations
          meta_refusal = result.refusal

          // GUARDRAIL: Check if AI broke character (only if no custom system_prompt and not refused)
          if (!system_prompt && !result.refusal && didBreakCharacter(answer)) {
            debug('path:context:guardrail:triggered', {
              reason: 'AI broke character, retrying with stronger prompt'
            }, ctx)

            // Retry with explicit correction
            const retryPrompt = `IMPORTANT: The user is interacting with YOUR company's AI assistant. DO NOT say you are "just an AI" or a "language model". You represent the organization in the context. Now answer naturally as their representative: ${query}`
            const retryResult = await generateFromContext(retryPrompt, context, activeGroqKey, genOptions)
            answer = retryResult.answer
            meta_confidence_score = retryResult.confidence_score
            meta_grounded = retryResult.grounded
            meta_citations = retryResult.citations

            debug('path:context:guardrail:retry', {
              retryAnswerLength: answer.length,
              stillBroke: didBreakCharacter(answer)
            }, ctx)
          }

          debug('path:context:complete', {
            answerLength: answer.length,
            pathLatencyMs: Math.round(performance.now() - pathStartTime)
          }, ctx)
        } catch (error: any) {
          debugError('path:context', error, ctx)
          answer = 'I could not generate an answer from the provided context.'
        }
      }
    }
    else if (intent === 'RESEARCH') {
      // Path C: Expensive Search
      debug('path:research:start', {
        plan,
        isByokPlan,
        searchEnabled,
        hasUserTavilyKey: !!userTavilyKey,
        hasActiveTavilyKey: !!activeTavilyKey
      }, ctx)
      const pathStartTime = performance.now()

      // Check if search is enabled for this plan (via metadata override)
      if (!searchEnabled) {
        debug('path:research:rejected', { reason: 'SEARCH_DISABLED', plan }, ctx)
        return Response.json(
          {
            error: 'Search has been disabled for this API key.',
            code: 'SEARCH_DISABLED',
            hint: 'Contact support if you believe this is an error.'
          },
          { status: 402 }
        )
      }

      // ============================================
      // WEB SEARCH RATE LIMIT CHECK (Unkey Namespace: web_search)
      // ============================================
      // Rule A: ONLY check web_search namespace here - independent of deep_research
      // Rule B: BYOK users are exempt (they use their own Tavily key)
      // NOTE: Rate limits are per-account (workspaceId), not per-key
      const workspaceId = result.meta?.workspaceId
      if (!isByokExempt(plan) && workspaceId) {
        debug('path:research:rateLimitCheck', {
          plan,
          workspaceId,
          namespace: UNKEY_NAMESPACES.WEB_SEARCH
        }, ctx)

        const rateLimitResult = await checkFeatureRateLimit(workspaceId, UNKEY_NAMESPACES.WEB_SEARCH, validPlanType)

        debug('path:research:rateLimitResult', {
          success: rateLimitResult.success,
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset
        }, ctx)

        // Store rate limit info for response headers
        rateLimitInfo = {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        }

        if (!rateLimitResult.success) {
          const errorResponse = getRateLimitErrorResponse(UNKEY_NAMESPACES.WEB_SEARCH, rateLimitResult)
          return Response.json(errorResponse, { status: 429 })
        }
      }

      // Safety Check: If BYOK plan and no Tavily key, reject
      // Do not burn OUR Tavily credits for BYOK users
      if (isByokPlan && !userTavilyKey) {
        debug('path:research:rejected', { reason: 'BYOK_MISSING_KEY' }, ctx)
        return Response.json(
          {
            error: 'Research intent requires x-tavily-key header for BYOK plans',
            code: 'BYOK_MISSING_KEY'
          },
          { status: 402 }
        )
      }

      if (!activeTavilyKey) {
        debug('path:research:rejected', { reason: 'NO_SEARCH_API' }, ctx)
        return Response.json(
          { error: 'Research unavailable - no search API configured', code: 'NO_SEARCH_API' },
          { status: 503 }
        )
      }

      try {
        debug('path:research:tavily:start', {}, ctx)
        const searchStartTime = performance.now()
        const searchResults = await tavilySearch(query, activeTavilyKey)
        debug('path:research:tavily:complete', {
          resultCount: searchResults.length,
          searchLatencyMs: Math.round(performance.now() - searchStartTime)
        }, ctx)

        debug('path:research:synthesis:start', { resultCount: searchResults.length }, ctx)
        const synthStartTime = performance.now()
        const synthesized = await synthesizeAnswer(query, searchResults, activeGroqKey)
        answer = synthesized.answer
        sources = synthesized.sources
        debug('path:research:synthesis:complete', {
          answerLength: answer.length,
          sourceCount: sources.length,
          synthLatencyMs: Math.round(performance.now() - synthStartTime),
          pathLatencyMs: Math.round(performance.now() - pathStartTime)
        }, ctx)
      } catch (error: any) {
        debugError('path:research', error, ctx)
        answer = 'I encountered an error while searching for information. Please try again.'
        sources = []
      }
    }
    else {
      // Fallback (should never happen)
      debug('path:fallback', { intent, reason: 'unexpected intent' }, ctx)
      answer = 'Unable to process your request.'
    }

    const latencyMs = Math.round(performance.now() - startTime)

    // ============================================
    // 6. RETURN RESPONSE
    // ============================================
    const meta: ResponseMeta = {
      intent: classification.intent,  // Original classified intent
      routed_to: intent,              // Actual intent used (may differ due to force_intent)
      cost_saving: intent !== 'RESEARCH',
      latency_ms: latencyMs,
      intent_forced: !!force_intent,
      temperature_used: validTemperature ?? 0.3,
      max_tokens_used: validMaxTokens ?? 600
    }

    if (sources) {
      meta.sources = sources
    }

    // Add enterprise features to response metadata
    if (meta_confidence_score !== undefined) {
      meta.confidence_score = meta_confidence_score
    }
    if (meta_grounded !== undefined) {
      meta.grounded = meta_grounded
    }
    if (meta_citations !== undefined && meta_citations.length > 0) {
      meta.citations = meta_citations
    }
    if (meta_refusal !== undefined) {
      meta.refusal = meta_refusal
    }

    debug('response:success', {
      intent,
      classifiedIntent: classification.intent,
      forcedIntent: force_intent,
      latencyMs,
      answerLength: answer.length,
      hasSources: !!sources,
      sourceCount: sources?.length || 0,
      temperatureUsed: validTemperature ?? 0.3,
      maxTokensUsed: validMaxTokens ?? 600,
      confidenceScore: meta_confidence_score,
      grounded: meta_grounded,
      citationCount: meta_citations?.length || 0,
      hasRefusal: !!meta_refusal
    }, ctx)

    // Log usage (fire-and-forget)
    logUsage({
      workspaceId: result.meta?.workspaceId,
      keyId: result.keyId,
      intent,
      latencyMs,
      query
    }, ctx)

    // Build response with optional rate limit headers
    const responseBody = { answer, meta }
    const headers: Record<string, string> = {}

    // Add rate limit headers (Unkey Global Limit OR Feature Limit)
    // Priority: Feature Limit (if used) > Global Limit (from key verification)

    if (rateLimitInfo) {
      // Feature Limit (Web Search)
      headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit)
      headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining)
      headers['X-RateLimit-Reset'] = String(Math.floor(rateLimitInfo.reset / 1000))
    } else if (result.ratelimit) {
      // Global Limit (API Key)
      headers['X-RateLimit-Limit'] = String(result.ratelimit.limit)
      headers['X-RateLimit-Remaining'] = String(result.ratelimit.remaining)
      headers['X-RateLimit-Reset'] = String(Math.floor(result.ratelimit.reset / 1000))
    }

    return Response.json(responseBody, { headers })

  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - startTime)
    debugError('POST:unhandled', error, ctx)

    debug('response:error', {
      latencyMs,
      errorMessage: error.message,
      errorName: error.name
    }, ctx)

    return Response.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
