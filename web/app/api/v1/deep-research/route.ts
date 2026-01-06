/**
 * UnforgeAPI - Deep Research Endpoint (v3 "Turbo Mode")
 * POST /api/v1/deep-research
 *
 * NEW ARCHITECTURE: Flash-Groq Relay Pattern
 * Target latency: <4 seconds (down from ~15s)
 *
 * Pipeline:
 * 1. CHECK CACHE (Upstash Redis - Global)
 * 2. SEARCH (Tavily with raw_content - saves 3s)
 * 3. COMPRESS (Gemini 2.5 Flash - reads 100k tokens, outputs tiny JSON)
 * 4. WRITE (Groq Llama-3.1-8b-instant - reads JSON, writes English)
 * 5. CACHE & RETURN
 *
 * Two execution paths:
 *
 * MANAGED USERS (managed_pro, managed_ultra, enterprise):
 *   - Uses system Tavily + Google + Groq keys
 *   - No user headers needed
 *
 * BYOK USERS (byok_starter, byok_pro):
 *   - Requires x-tavily-key and x-groq-key headers
 *   - Optional x-google-key (falls back to system key for compression only)
 */

import { NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { createHash } from 'crypto'
import { DEEP_RESEARCH_LIMITS, type ApiPlan } from '@/lib/subscription-constants'

// ============================================
// CONFIGURATION
// ============================================

export const maxDuration = 60 // Reduced from 120s - we're faster now

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

// Model configuration - optimized for speed
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash-preview-05-20'
const GROQ_FAST_MODEL = 'llama-3.1-8b-instant'

// Cache TTL: 24 hours
const CACHE_TTL_SECONDS = 86400

// ============================================
// DEEP RESEARCH RATE LIMITER (Upstash)
// ============================================
// We use our Gemini key for compression, so we must rate limit BYOK users
// to prevent abuse. This is separate from the general API rate limit.

function getDeepResearchRateLimiter(plan: ApiPlan): Ratelimit | null {
  const redis = getRedisClient()
  if (!redis) return null

  const planLimits = DEEP_RESEARCH_LIMITS[plan]
  if (!planLimits || planLimits.limit <= 0) return null

  // Create rate limiter based on plan's period
  if (planLimits.period === 'daily') {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(planLimits.limit, '1 d'),
      prefix: `deep_research:${plan}`,
      analytics: true,
    })
  } else {
    // Monthly
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(planLimits.limit, '30 d'),
      prefix: `deep_research:${plan}`,
      analytics: true,
    })
  }
}

// ============================================
// SCHEMAS
// ============================================

// Compressed facts schema - tiny output from Gemini
const factsSchema = z.object({
  key_stats: z.array(z.string()).describe("Important numbers, percentages, metrics"),
  dates: z.array(z.string()).describe("Relevant dates and timelines"),
  entities: z.array(z.string()).describe("Companies, people, products mentioned"),
  summary_points: z.array(z.string()).describe("Key findings in bullet form"),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string()
  })).describe("Source URLs for citations")
})

// ============================================
// DEBUG UTILITIES - Enhanced for production debugging
// ============================================

interface DebugContext {
  requestId: string
  startTime: number
}

function debug(tag: string, data: any, context?: DebugContext) {
  if (!DEBUG) return
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const prefix = `[DeepResearch:${tag}]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
  console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
}

function debugSuccess(tag: string, data: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const prefix = `✅ [DeepResearch:${tag}]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
  console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
}

function debugError(tag: string, error: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const prefix = `❌ [DeepResearch:${tag}:ERROR]${context?.requestId ? ` [${context.requestId}]` : ''}`
  console.error(`${timestamp} ${prefix}`, { message: error?.message, name: error?.name, stack: error?.stack?.split('\n')[0] })
}

// ============================================
// CACHE UTILITIES
// ============================================

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[DeepResearch:Redis] ⚠️ Redis not configured - UPSTASH_REDIS_REST_URL or TOKEN missing')
    return null
  }
  return Redis.fromEnv()
}

function hashQuery(query: string): string {
  // Hash the query to create a cache key - prevents leaking private data
  return createHash('sha256').update(query.toLowerCase().trim()).digest('hex')
}

// ============================================
// UNKEY VERIFICATION
// ============================================

interface UnkeyVerifyResult {
  valid: boolean
  code?: string
  meta?: Record<string, any>
  keyId?: string
}

async function verifyApiKey(key: string, context?: DebugContext): Promise<UnkeyVerifyResult> {
  debug('verifyApiKey:start', { keyPrefix: key.substring(0, 10) + '...' }, context)

  try {
    const response = await fetch('https://api.unkey.dev/v1/keys.verifyKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
    const result = await response.json()

    if (!response.ok) return { valid: false, code: 'API_ERROR' }

    return {
      valid: result.valid || false,
      code: result.code,
      meta: result.meta,
      keyId: result.keyId
    }
  } catch (error: any) {
    debugError('verifyApiKey', error, context)
    return { valid: false, code: 'NETWORK_ERROR' }
  }
}

// ============================================
// TAVILY SEARCH (Raw Content Mode - saves 3s)
// ============================================

interface TavilyRawResult {
  title: string
  url: string
  content: string
  raw_content?: string  // Full page content when include_raw_content=true
}

interface TavilySearchResponse {
  results: TavilyRawResult[]
}

async function tavilySearchRaw(query: string, tavilyKey: string, context?: DebugContext): Promise<TavilySearchResponse> {
  debug('tavily:search:start', { query: query.substring(0, 50) }, context)

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: "advanced",
      include_raw_content: true,  // <--- KEY: Get full page content, saves separate fetch
      include_answer: false,
      max_results: 5  // Reduced from 10 - we get more content per result now
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Tavily search failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  debug('tavily:search:complete', { resultCount: data.results?.length }, context)
  return data
}

// ============================================
// LOG USAGE
// ============================================

function logUsage(data: {
  workspaceId?: string
  keyId?: string
  intent: string
  latencyMs: number
  query: string
  cached?: boolean
}) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {})
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(req: NextRequest) {
  const startTime = performance.now()
  const requestId = `dr-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const ctx: DebugContext = { requestId, startTime }

  debug('POST:start', { timestamp: new Date().toISOString() }, ctx)

  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return Response.json({ error: 'Missing API Key', code: 'MISSING_API_KEY' }, { status: 401 })
    }

    const result = await verifyApiKey(token, ctx)

    if (!result.valid) {
      if (result.code === 'RATE_LIMITED') {
        return Response.json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, { status: 429 })
      }
      return Response.json({ error: 'Invalid API Key', code: result.code || 'INVALID_API_KEY' }, { status: 401 })
    }

    // ============================================
    // 2. TIER CHECK
    // ============================================
    const plan = result.meta?.plan || result.meta?.tier || 'sandbox'
    const isByokPlan = plan === 'byok_starter' || plan === 'byok_pro'
    const isManagedPlan = ['managed_pro', 'managed_ultra', 'enterprise'].includes(plan)

    debug('tier:check', { plan, isByokPlan, isManagedPlan }, ctx)

    const allowedPlans = ['managed_pro', 'managed_ultra', 'byok_starter', 'byok_pro', 'enterprise']

    if (!allowedPlans.includes(plan)) {
      return Response.json({
        error: 'Deep Research requires Managed Pro or BYOK plan',
        code: 'PLAN_UPGRADE_REQUIRED',
        hint: 'Upgrade at https://unforge.ai/pricing',
        current_plan: plan
      }, { status: 403 })
    }

    // ============================================
    // 2.5 DEEP RESEARCH RATE LIMIT CHECK
    // ============================================
    // Check plan-specific deep research limits using Upstash rate limiter
    const validPlan = plan as ApiPlan
    const planConfig = DEEP_RESEARCH_LIMITS[validPlan]

    if (!planConfig || planConfig.limit === 0) {
      return Response.json({
        error: 'Deep Research is not available on your plan',
        code: 'DEEP_RESEARCH_NOT_AVAILABLE',
        hint: 'Upgrade to BYOK Starter or Managed Pro to access Deep Research',
        upgrade_url: 'https://unforge.ai/pricing'
      }, { status: 403 })
    }

    // Use Upstash rate limiter for fair use enforcement
    const rateLimiter = getDeepResearchRateLimiter(validPlan)
    let rateLimitRemaining: number | undefined

    if (rateLimiter && result.keyId) {
      try {
        const rateLimitResult = await rateLimiter.limit(result.keyId)
        rateLimitRemaining = rateLimitResult.remaining
        debug('rateLimit:check', {
          success: rateLimitResult.success,
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          plan: validPlan
        }, ctx)

        if (!rateLimitResult.success) {
          const resetDate = new Date(rateLimitResult.reset)
          return Response.json({
            error: `Deep Research fair use limit reached (${planConfig.limit}/${planConfig.period}). Resets ${resetDate.toLocaleString()}.`,
            code: 'DEEP_RESEARCH_LIMIT_EXCEEDED',
            limit: rateLimitResult.limit,
            remaining: 0,
            reset: rateLimitResult.reset,
            upgrade_url: 'https://unforge.ai/pricing'
          }, { status: 429 })
        }
      } catch (rateLimitError) {
        // Rate limit errors shouldn't break the request - log and continue
        debugError('rateLimit:error', rateLimitError, ctx)
      }
    }

    // ============================================
    // 3. PARSE REQUEST
    // ============================================
    let body: { query: string; stream?: boolean }

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, { status: 400 })
    }

    const { query, stream = false } = body  // Default to non-streaming for turbo mode

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Missing required field: query', code: 'INVALID_REQUEST' }, { status: 400 })
    }

    if (query.length > 2000) {
      return Response.json({ error: 'Query too long (max 2000 characters)', code: 'QUERY_TOO_LONG' }, { status: 400 })
    }

    debug('request:parsed', { queryLength: query.length, isByokPlan, stream }, ctx)

    // ============================================
    // 4. DETERMINE API KEYS
    // ============================================

    // Get user-provided keys from headers (BYOK)
    const userTavilyKey = req.headers.get('x-tavily-key')
    const userGroqKey = req.headers.get('x-groq-key')
    const userGoogleKey = req.headers.get('x-google-key')

    // Determine active keys based on plan
    let activeTavilyKey: string | undefined
    let activeGroqKey: string | undefined
    let activeGoogleKey: string | undefined

    if (isByokPlan) {
      // BYOK: MUST use user keys - do NOT fallback to system keys
      if (!userTavilyKey) {
        return Response.json({
          error: 'BYOK plans require x-tavily-key header for Deep Research',
          code: 'BYOK_MISSING_TAVILY_KEY',
          hint: 'Add your Tavily API key in the x-tavily-key header'
        }, { status: 400 })
      }
      if (!userGroqKey) {
        return Response.json({
          error: 'BYOK plans require x-groq-key header for Deep Research',
          code: 'BYOK_MISSING_GROQ_KEY',
          hint: 'Add your Groq API key in the x-groq-key header'
        }, { status: 400 })
      }

      activeTavilyKey = userTavilyKey
      activeGroqKey = userGroqKey
      // Google key is optional for BYOK - we can use system key for compression step
      // (compression doesn't expose user data, just extracts facts from search results)
      activeGoogleKey = userGoogleKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY

      if (!activeGoogleKey) {
        return Response.json({
          error: 'No Google API key available. Provide x-google-key header or contact support.',
          code: 'MISSING_GOOGLE_KEY'
        }, { status: 500 })
      }
    } else {
      // Managed: Use system keys
      activeTavilyKey = process.env.TAVILY_API_KEY
      activeGroqKey = process.env.GROQ_API_KEY
      activeGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

      if (!activeTavilyKey || !activeGroqKey || !activeGoogleKey) {
        return Response.json({
          error: 'Server configuration error - missing API keys',
          code: 'SERVER_CONFIG_ERROR'
        }, { status: 500 })
      }
    }

    debug('keys:resolved', {
      hasTavily: !!activeTavilyKey,
      hasGroq: !!activeGroqKey,
      hasGoogle: !!activeGoogleKey,
      isByokPlan
    }, ctx)

    // ============================================
    // 5. CHECK CACHE (Global - Upstash Redis)
    // ============================================
    const redis = getRedisClient()
    const queryHash = hashQuery(query)
    const cacheKey = `research:${queryHash}`

    debug('cache:init', {
      redisConfigured: !!redis,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      queryHash: queryHash.substring(0, 16) + '...',
      cacheKey
    }, ctx)

    if (redis) {
      try {
        debug('cache:checking', { cacheKey }, ctx)
        const cacheStart = performance.now()
        const cached = await redis.get<string>(cacheKey)
        const cacheLookupMs = Math.round(performance.now() - cacheStart)

        if (cached) {
          const latencyMs = Math.round(performance.now() - startTime)
          debugSuccess('cache:HIT', {
            latencyMs,
            cacheLookupMs,
            cachedLength: cached.length,
            savedApiCalls: '3 (Tavily + Gemini + Groq)',
            cacheKey: cacheKey.substring(0, 30) + '...',
            estimatedCostSaved: '$0.02-0.05'
          }, ctx)

          // Log usage (cached)
          logUsage({
            workspaceId: result.meta?.workspaceId,
            keyId: result.keyId,
            intent: 'DEEP_RESEARCH',
            latencyMs,
            query,
            cached: true
          })

          return Response.json({
            report: cached,
            meta: {
              source: 'cache',
              latency_ms: latencyMs,
              cache_lookup_ms: cacheLookupMs,
              cost: 0,
              request_id: requestId
            }
          })
        }
        debug('cache:MISS', { cacheLookupMs, reason: 'Key not found in Redis' }, ctx)
      } catch (cacheError: any) {
        // Cache errors shouldn't break the request
        debugError('cache:error', cacheError, ctx)
        debug('cache:error:details', {
          errorType: cacheError?.name,
          errorMessage: cacheError?.message,
          continuing: true
        }, ctx)
      }
    } else {
      debug('cache:DISABLED', {
        reason: 'Redis client not initialized',
        fix: 'Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env'
      }, ctx)
    }

    // ============================================
    // 6. SEARCH (Tavily with Raw Content)
    // ============================================
    debug('pipeline:search:start', {}, ctx)

    let searchResults: TavilySearchResponse
    try {
      searchResults = await tavilySearchRaw(query, activeTavilyKey, ctx)
    } catch (searchError: any) {
      debugError('pipeline:search', searchError, ctx)
      return Response.json({
        error: 'Search failed',
        code: 'SEARCH_ERROR',
        message: searchError.message
      }, { status: 500 })
    }

    if (!searchResults.results || searchResults.results.length === 0) {
      return Response.json({
        error: 'No search results found for your query',
        code: 'NO_RESULTS'
      }, { status: 404 })
    }

    // Build massive context from raw content (up to 100k tokens)
    const hugeContext = searchResults.results
      .map(r => r.raw_content || r.content)
      .join('\n\n---\n\n')
      .slice(0, 100000)  // Limit to ~100k chars (Gemini Flash handles this easily)

    const sources = searchResults.results.map(r => ({ title: r.title, url: r.url }))

    debug('pipeline:search:complete', {
      contextLength: hugeContext.length,
      sourceCount: sources.length
    }, ctx)

    // ============================================
    // 7. COMPRESS (Gemini 2.5 Flash - The Reader)
    // ============================================
    debug('pipeline:compress:start', {}, ctx)

    const google = createGoogleGenerativeAI({ apiKey: activeGoogleKey })

    let facts: z.infer<typeof factsSchema>
    try {
      const compressResult = await generateObject({
        model: google(GEMINI_FLASH_MODEL),
        schema: factsSchema,
        prompt: `You are a research analyst. Analyze this raw web content and extract ONLY hard facts.

QUERY: "${query}"

RAW CONTENT:
${hugeContext}

SOURCES:
${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n')}

Extract:
1. key_stats: Important numbers, percentages, metrics (with source reference)
2. dates: Relevant dates and timelines
3. entities: Companies, people, products mentioned
4. summary_points: 5-10 key findings as bullet points
5. sources: Include the URL for each source used

RULES:
- Extract ONLY facts from the provided content
- Do NOT make up information
- Include source URLs for citations
- Be concise - compress knowledge into minimal JSON`
      })

      facts = compressResult.object
      debug('pipeline:compress:complete', {
        statsCount: facts.key_stats.length,
        pointsCount: facts.summary_points.length
      }, ctx)
    } catch (compressError: any) {
      debugError('pipeline:compress', compressError, ctx)
      return Response.json({
        error: 'Failed to analyze search results',
        code: 'COMPRESS_ERROR',
        message: compressError.message
      }, { status: 500 })
    }

    // ============================================
    // 8. WRITE (Groq Llama-3.1 - The Writer)
    // ============================================
    debug('pipeline:write:start', {}, ctx)

    const groq = createGroq({ apiKey: activeGroqKey })

    let report: string
    try {
      const writeResult = await generateText({
        model: groq(GROQ_FAST_MODEL),
        prompt: `You are an expert research analyst writing an Executive Research Report.

RESEARCH QUERY: "${query}"

EXTRACTED FACTS:
${JSON.stringify(facts, null, 2)}

Write a professional Markdown research report with these sections:

## Executive Summary
2-3 paragraphs summarizing the key findings.

## Key Statistics
- Present the key_stats as a formatted list or table

## Detailed Findings
- Expand on the summary_points with context
- Include relevant dates and timelines
- Mention key entities (companies, people, products)

## Key Takeaways
- 3-5 actionable insights

## Sources
- List all sources with clickable links: [Title](url)

RULES:
- ONLY use information from the extracted facts
- Cite sources inline using [Source](url) format
- Be professional and concise
- Use tables where appropriate for data`
      })

      report = writeResult.text
      debug('pipeline:write:complete', { reportLength: report.length }, ctx)
    } catch (writeError: any) {
      debugError('pipeline:write', writeError, ctx)
      return Response.json({
        error: 'Failed to generate report',
        code: 'WRITE_ERROR',
        message: writeError.message
      }, { status: 500 })
    }

    // ============================================
    // 9. CACHE & RETURN
    // ============================================
    const latencyMs = Math.round(performance.now() - startTime)

    // Save to cache (fire-and-forget with success logging)
    if (redis) {
      redis.set(cacheKey, report, { ex: CACHE_TTL_SECONDS })
        .then(() => {
          debugSuccess('cache:SET', { 
            cacheKey: cacheKey.substring(0, 30) + '...', 
            reportLength: report.length,
            ttlSeconds: CACHE_TTL_SECONDS,
            ttlHuman: `${CACHE_TTL_SECONDS / 3600} hours`,
            nextHitWillSave: '~3-4 seconds + API costs'
          }, ctx)
        })
        .catch(err => {
          debugError('cache:set', err, ctx)
        })
      debug('cache:set:queued', { ttl: CACHE_TTL_SECONDS, cacheKey: cacheKey.substring(0, 30) + '...' }, ctx)
    } else {
      debug('cache:set:SKIPPED', { reason: 'Redis not available' }, ctx)
    }

    // Log usage
    logUsage({
      workspaceId: result.meta?.workspaceId,
      keyId: result.keyId,
      intent: 'DEEP_RESEARCH',
      latencyMs,
      query,
      cached: false
    })

    debugSuccess('pipeline:complete', { 
      latencyMs, 
      sourcesCount: sources.length,
      reportLength: report.length,
      cached: false
    }, ctx)

    return Response.json({
      report,
      meta: {
        source: 'generated',
        latency_ms: latencyMs,
        sources_count: sources.length,
        request_id: requestId,
        model: {
          reader: GEMINI_FLASH_MODEL,
          writer: GROQ_FAST_MODEL
        },
        quota: {
          limit: planConfig.limit,
          remaining: rateLimitRemaining,
          period: planConfig.period
        }
      }
    })

  } catch (error: any) {
    debugError('unhandled', error, ctx)
    return Response.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: error?.message
    }, { status: 500 })
  }
}

// ============================================
// HEALTH CHECK
// ============================================
export async function GET() {
  const redis = getRedisClient()

  return Response.json({
    status: 'ok',
    service: 'UnforgeAPI Deep Research',
    version: '3.0.0',
    architecture: 'Flash-Groq Relay (Turbo Mode)',
    cache: redis ? 'enabled' : 'disabled',
    models: {
      reader: GEMINI_FLASH_MODEL,
      writer: GROQ_FAST_MODEL
    }
  })
}
