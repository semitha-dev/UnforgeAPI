/**
 * UnforgeAPI - Deep Research Endpoint (v4 "Unforge Mode")
 * POST /api/v1/deep-research
 *
 * ARCHITECTURE: Flash-Groq Relay Pattern
 *
 * Pipeline:
 * 1. CHECK CACHE (Upstash Redis - Global)
 * 2. SEARCH (Tavily with raw_content)
 * 3. COMPRESS (Gemini 2.5 Flash - extracts facts)
 * 4. WRITE/EXTRACT (Groq - generates output based on mode)
 * 5. CACHE & RETURN
 *
 * NEW FEATURES (v4):
 * - Custom Output Schemas: Define your own JSON structure
 * - Data Extraction Mode: Extract specific fields, not prose
 * - Multi-Query Comparison: Compare multiple topics in one call
 * - Domain Presets: Optimized for crypto, stocks, tech, academic
 * - Webhook Delivery: Async processing with callback
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

export const maxDuration = 60

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

// Model configuration - optimized for speed
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
const GROQ_FAST_MODEL = 'llama-3.1-8b-instant'

// Cache TTL: 24 hours
const CACHE_TTL_SECONDS = 86400

// ============================================
// REQUEST TYPES & MODES
// ============================================

type OutputMode = 'report' | 'extract' | 'schema' | 'compare'

interface RequestBody {
  // Basic
  query: string
  stream?: boolean
  
  // Mode selection
  mode?: OutputMode  // Default: 'report'
  
  // For 'extract' mode - extract specific fields
  extract?: string[]  // e.g., ["price", "release_date", "features"]
  
  // For 'schema' mode - custom output structure
  schema?: Record<string, any>  // User-defined JSON schema
  
  // For 'compare' mode - compare multiple queries
  queries?: string[]  // e.g., ["Tesla stock", "Rivian stock", "Lucid stock"]
  
  // Domain preset for optimized searching
  preset?: 'general' | 'crypto' | 'stocks' | 'tech' | 'academic' | 'news'
  
  // Webhook for async delivery
  webhook?: string  // URL to POST results to
}

// Domain presets with optimized search parameters
const DOMAIN_PRESETS: Record<string, { 
  search_depth: string
  include_domains?: string[]
  prompt_hint: string 
}> = {
  general: {
    search_depth: 'advanced',
    prompt_hint: 'Provide comprehensive, balanced information.'
  },
  crypto: {
    search_depth: 'advanced',
    include_domains: ['coindesk.com', 'cointelegraph.com', 'coingecko.com', 'messari.io', 'defillama.com'],
    prompt_hint: 'Focus on price data, market cap, trading volume, DeFi metrics, and on-chain data.'
  },
  stocks: {
    search_depth: 'advanced',
    include_domains: ['yahoo.com/finance', 'bloomberg.com', 'reuters.com', 'seekingalpha.com', 'marketwatch.com'],
    prompt_hint: 'Focus on stock price, P/E ratio, market cap, earnings, analyst ratings, and financial metrics.'
  },
  tech: {
    search_depth: 'advanced',
    include_domains: ['techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com', 'engadget.com'],
    prompt_hint: 'Focus on product specs, features, release dates, pricing, and technical details.'
  },
  academic: {
    search_depth: 'advanced',
    include_domains: ['arxiv.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'nature.com', 'sciencedirect.com'],
    prompt_hint: 'Focus on peer-reviewed findings, methodology, citations, and research conclusions.'
  },
  news: {
    search_depth: 'advanced',
    include_domains: ['reuters.com', 'apnews.com', 'bbc.com', 'npr.org', 'nytimes.com'],
    prompt_hint: 'Focus on recent events, dates, quotes, and factual reporting.'
  }
}

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

interface TavilySearchOptions {
  preset?: string
  include_domains?: string[]
}

async function tavilySearchRaw(
  query: string, 
  tavilyKey: string, 
  context?: DebugContext,
  options?: TavilySearchOptions
): Promise<TavilySearchResponse> {
  debug('tavily:search:start', { query: query.substring(0, 50), preset: options?.preset }, context)

  const presetConfig = options?.preset ? DOMAIN_PRESETS[options.preset] : DOMAIN_PRESETS.general
  
  const requestBody: Record<string, any> = {
    api_key: tavilyKey,
    query,
    search_depth: presetConfig.search_depth,
    include_raw_content: true,
    include_answer: false,
    max_results: 5
  }
  
  // Add domain filtering if preset specifies it
  if (presetConfig.include_domains && presetConfig.include_domains.length > 0) {
    requestBody.include_domains = presetConfig.include_domains
  }
  
  // Allow custom domain override
  if (options?.include_domains && options.include_domains.length > 0) {
    requestBody.include_domains = options.include_domains
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
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
// WEBHOOK DELIVERY
// ============================================

async function sendWebhook(url: string, data: Record<string, any>): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Unforge-Signature': createHash('sha256')
          .update(JSON.stringify(data) + (process.env.WEBHOOK_SECRET || ''))
          .digest('hex')
      },
      body: JSON.stringify({
        event: 'deep_research.complete',
        timestamp: new Date().toISOString(),
        data
      })
    })
  } catch (error) {
    console.error('[Webhook] Failed to deliver:', error)
  }
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
    let body: RequestBody

    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body', code: 'INVALID_JSON' }, { status: 400 })
    }

    const { 
      query, 
      queries,
      stream = false,
      mode = 'report',
      extract,
      schema,
      preset = 'general',
      webhook
    } = body

    // Validate mode-specific requirements
    if (mode === 'compare' && (!queries || queries.length < 2)) {
      return Response.json({ 
        error: 'Compare mode requires "queries" array with at least 2 items',
        code: 'INVALID_REQUEST',
        example: { mode: 'compare', queries: ['Tesla stock', 'Rivian stock'] }
      }, { status: 400 })
    }

    if (mode === 'extract' && (!extract || extract.length === 0)) {
      return Response.json({ 
        error: 'Extract mode requires "extract" array with fields to extract',
        code: 'INVALID_REQUEST',
        example: { mode: 'extract', query: 'iPhone 16', extract: ['price', 'release_date', 'features'] }
      }, { status: 400 })
    }

    if (mode === 'schema' && !schema) {
      return Response.json({ 
        error: 'Schema mode requires "schema" object defining output structure',
        code: 'INVALID_REQUEST',
        example: { 
          mode: 'schema', 
          query: 'Compare Tesla vs Rivian',
          schema: {
            companies: [{ name: '', market_cap: '', revenue: '' }],
            recommendation: ''
          }
        }
      }, { status: 400 })
    }

    // For non-compare modes, query is required
    if (mode !== 'compare' && (!query || typeof query !== 'string')) {
      return Response.json({ error: 'Missing required field: query', code: 'INVALID_REQUEST' }, { status: 400 })
    }

    const effectiveQuery = mode === 'compare' ? queries!.join(' vs ') : query
    
    if (effectiveQuery.length > 2000) {
      return Response.json({ error: 'Query too long (max 2000 characters)', code: 'QUERY_TOO_LONG' }, { status: 400 })
    }

    // Validate preset
    if (preset && !DOMAIN_PRESETS[preset]) {
      return Response.json({ 
        error: `Invalid preset: ${preset}`,
        code: 'INVALID_PRESET',
        valid_presets: Object.keys(DOMAIN_PRESETS)
      }, { status: 400 })
    }

    // Validate webhook URL if provided
    if (webhook) {
      try {
        const webhookUrl = new URL(webhook)
        if (!['http:', 'https:'].includes(webhookUrl.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        return Response.json({ 
          error: 'Invalid webhook URL',
          code: 'INVALID_WEBHOOK',
          hint: 'Webhook must be a valid HTTP/HTTPS URL'
        }, { status: 400 })
      }
    }

    debug('request:parsed', { 
      queryLength: effectiveQuery.length, 
      isByokPlan, 
      stream,
      mode,
      preset,
      hasWebhook: !!webhook,
      extractFields: extract?.length,
      hasSchema: !!schema,
      compareCount: queries?.length
    }, ctx)

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
    debug('pipeline:search:start', { mode, preset }, ctx)

    let searchResults: TavilySearchResponse
    let allSources: Array<{ title: string; url: string }> = []
    
    // For compare mode, run multiple searches
    if (mode === 'compare' && queries) {
      const searchPromises = queries.map(q => 
        tavilySearchRaw(q, activeTavilyKey, ctx, { preset })
      )
      const results = await Promise.all(searchPromises)
      
      // Combine results
      searchResults = {
        results: results.flatMap(r => r.results)
      }
      allSources = searchResults.results.map(r => ({ title: r.title, url: r.url }))
    } else {
      try {
        searchResults = await tavilySearchRaw(effectiveQuery, activeTavilyKey, ctx, { preset })
        allSources = searchResults.results.map(r => ({ title: r.title, url: r.url }))
      } catch (searchError: any) {
        debugError('pipeline:search', searchError, ctx)
        return Response.json({
          error: 'Search failed',
          code: 'SEARCH_ERROR',
          message: searchError.message
        }, { status: 500 })
      }
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

    const sources = allSources

    debug('pipeline:search:complete', {
      contextLength: hugeContext.length,
      sourceCount: sources.length,
      mode
    }, ctx)

    // Get preset hint for prompts
    const presetConfig = DOMAIN_PRESETS[preset] || DOMAIN_PRESETS.general

    // ============================================
    // 7. COMPRESS/EXTRACT (Gemini 2.5 Flash - The Reader)
    // ============================================
    debug('pipeline:compress:start', { mode }, ctx)

    const google = createGoogleGenerativeAI({ apiKey: activeGoogleKey })

    let facts: z.infer<typeof factsSchema> | undefined = undefined
    let extractedData: Record<string, any> | null = null
    let schemaData: Record<string, any> | null = null
    let comparisonData: any[] | null = null

    try {
      if (mode === 'extract' && extract) {
        // EXTRACT MODE: Extract specific fields
        const extractSchema = z.object(
          extract.reduce((acc, field) => {
            acc[field] = z.string().describe(`The ${field} extracted from the content`)
            return acc
          }, {} as Record<string, z.ZodString>)
        )

        const extractResult = await generateObject({
          model: google(GEMINI_FLASH_MODEL),
          schema: extractSchema,
          prompt: `You are a data extraction expert. Extract ONLY the requested fields from this content.

QUERY: "${effectiveQuery}"

FIELDS TO EXTRACT: ${extract.join(', ')}

RAW CONTENT:
${hugeContext}

RULES:
- Extract ONLY the requested fields
- If a field is not found, return "Not found"
- Be precise and concise
- ${presetConfig.prompt_hint}`
        })

        extractedData = extractResult.object
        debug('pipeline:extract:complete', { fields: Object.keys(extractedData) }, ctx)

      } else if (mode === 'schema' && schema) {
        // SCHEMA MODE: Fill user-defined schema
        // Convert user schema to Zod schema dynamically
        const schemaResult = await generateObject({
          model: google(GEMINI_FLASH_MODEL),
          schema: z.any(), // Accept any structure
          prompt: `You are a data structuring expert. Fill in this exact JSON schema with data from the content.

QUERY: "${effectiveQuery}"

SCHEMA TO FILL:
${JSON.stringify(schema, null, 2)}

RAW CONTENT:
${hugeContext}

RULES:
- Return data that EXACTLY matches the schema structure
- Fill ALL fields in the schema
- Use "N/A" for fields you cannot find
- Be factual - only use information from the content
- ${presetConfig.prompt_hint}

Return valid JSON matching the schema.`
        })

        schemaData = schemaResult.object
        debug('pipeline:schema:complete', { keys: Object.keys(schemaData || {}) }, ctx)

      } else if (mode === 'compare' && queries) {
        // COMPARE MODE: Structured comparison
        const compareSchema = z.object({
          comparison_table: z.array(z.object({
            item: z.string(),
            key_facts: z.array(z.string()),
            pros: z.array(z.string()),
            cons: z.array(z.string())
          })),
          recommendation: z.string(),
          key_differences: z.array(z.string())
        })

        const compareResult = await generateObject({
          model: google(GEMINI_FLASH_MODEL),
          schema: compareSchema,
          prompt: `You are a comparison analyst. Compare these items objectively.

ITEMS TO COMPARE: ${queries.join(' vs ')}

RAW CONTENT:
${hugeContext}

RULES:
- Compare ALL items fairly
- List pros and cons for each
- Highlight key differences
- Give a balanced recommendation
- ${presetConfig.prompt_hint}`
        })

        comparisonData = compareResult.object.comparison_table
        
        // Also fill facts for the full response
        facts = {
          key_stats: [],
          dates: [],
          entities: queries,
          summary_points: compareResult.object.key_differences,
          sources
        }
        
        debug('pipeline:compare:complete', { itemsCompared: comparisonData?.length }, ctx)

      } else {
        // REPORT MODE (default): Standard facts extraction
        const compressResult = await generateObject({
          model: google(GEMINI_FLASH_MODEL),
          schema: factsSchema,
          prompt: `You are a research analyst. Analyze this raw web content and extract ONLY hard facts.

QUERY: "${effectiveQuery}"

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
- Be concise - compress knowledge into minimal JSON
- ${presetConfig.prompt_hint}`
        })

        facts = compressResult.object
        debug('pipeline:compress:complete', {
          statsCount: facts.key_stats.length,
          pointsCount: facts.summary_points.length
        }, ctx)
      }
    } catch (compressError: any) {
      debugError('pipeline:compress', compressError, ctx)
      return Response.json({
        error: 'Failed to analyze search results',
        code: 'COMPRESS_ERROR',
        message: compressError.message
      }, { status: 500 })
    }

    // ============================================
    // 8. GENERATE OUTPUT (Groq - The Writer)
    // ============================================
    
    // For extract and schema modes, we're done - no need for Groq
    if (mode === 'extract' && extractedData) {
      const latencyMs = Math.round(performance.now() - startTime)
      
      // Cache the extracted data
      if (redis) {
        const cacheData = JSON.stringify(extractedData)
        redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS }).catch(() => {})
      }

      // Send webhook if configured
      if (webhook) {
        sendWebhook(webhook, { 
          mode: 'extract', 
          query: effectiveQuery, 
          data: extractedData, 
          sources,
          request_id: requestId 
        }).catch(() => {})
      }

      logUsage({
        workspaceId: result.meta?.workspaceId,
        keyId: result.keyId,
        intent: 'DEEP_RESEARCH_EXTRACT',
        latencyMs,
        query: effectiveQuery,
        cached: false
      })

      return Response.json({
        mode: 'extract',
        query: effectiveQuery,
        data: extractedData,
        sources,
        meta: {
          source: 'generated',
          latency_ms: latencyMs,
          sources_count: sources.length,
          request_id: requestId,
          preset,
          model: GEMINI_FLASH_MODEL
        }
      })
    }

    if (mode === 'schema' && schemaData) {
      const latencyMs = Math.round(performance.now() - startTime)
      
      if (redis) {
        const cacheData = JSON.stringify(schemaData)
        redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS }).catch(() => {})
      }

      if (webhook) {
        sendWebhook(webhook, { 
          mode: 'schema', 
          query: effectiveQuery, 
          data: schemaData, 
          sources,
          request_id: requestId 
        }).catch(() => {})
      }

      logUsage({
        workspaceId: result.meta?.workspaceId,
        keyId: result.keyId,
        intent: 'DEEP_RESEARCH_SCHEMA',
        latencyMs,
        query: effectiveQuery,
        cached: false
      })

      return Response.json({
        mode: 'schema',
        query: effectiveQuery,
        data: schemaData,
        sources,
        meta: {
          source: 'generated',
          latency_ms: latencyMs,
          sources_count: sources.length,
          request_id: requestId,
          preset,
          model: GEMINI_FLASH_MODEL
        }
      })
    }

    // For report and compare modes, generate prose with Groq
    debug('pipeline:write:start', { mode }, ctx)

    const groq = createGroq({ apiKey: activeGroqKey })

    let report: string
    try {
      if (mode === 'compare' && comparisonData) {
        // COMPARE MODE: Generate comparison report
        const writeResult = await generateText({
          model: groq(GROQ_FAST_MODEL),
          prompt: `You are an expert analyst writing a Comparison Report.

ITEMS COMPARED: ${queries!.join(' vs ')}

COMPARISON DATA:
${JSON.stringify(comparisonData, null, 2)}

Write a professional Markdown comparison with these sections:

## Executive Summary
Brief overview of the comparison and key findings.

## Comparison Table
| Feature | ${queries!.join(' | ')} |
|---------|${queries!.map(() => '---------|').join('')}
(Fill with relevant data)

## Individual Analysis
### [Item 1]
- Key facts
- Pros
- Cons

(Repeat for each item)

## Key Differences
List the most important differences.

## Recommendation
Balanced recommendation based on the data.

## Sources
List all sources.

RULES:
- Be objective and balanced
- Use tables for easy comparison
- Cite sources where appropriate`
        })
        report = writeResult.text
      } else {
        // REPORT MODE (default)
        const writeResult = await generateText({
          model: groq(GROQ_FAST_MODEL),
          prompt: `You are an expert research analyst writing an Executive Research Report.

RESEARCH QUERY: "${effectiveQuery}"

EXTRACTED FACTS:
${JSON.stringify(facts!, null, 2)}

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
- Use tables where appropriate for data
- ${presetConfig.prompt_hint}`
        })
        report = writeResult.text
      }
      
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
            ttlHuman: `${CACHE_TTL_SECONDS / 3600} hours`
          }, ctx)
        })
        .catch(err => {
          debugError('cache:set', err, ctx)
        })
    }

    // Send webhook if configured
    if (webhook) {
      sendWebhook(webhook, { 
        mode, 
        query: effectiveQuery, 
        report,
        facts: (mode === 'report' && facts) ? facts : undefined,
        comparison: mode === 'compare' ? comparisonData : undefined,
        sources,
        request_id: requestId 
      }).catch(() => {})
    }

    // Log usage
    logUsage({
      workspaceId: result.meta?.workspaceId,
      keyId: result.keyId,
      intent: mode === 'compare' ? 'DEEP_RESEARCH_COMPARE' : 'DEEP_RESEARCH',
      latencyMs,
      query: effectiveQuery,
      cached: false
    })

    debugSuccess('pipeline:complete', { 
      latencyMs, 
      mode,
      sourcesCount: sources.length,
      reportLength: report.length,
      cached: false
    }, ctx)

    // Build response based on mode
    const response: Record<string, any> = {
      mode,
      query: effectiveQuery,
      report,
      meta: {
        source: 'generated',
        latency_ms: latencyMs,
        sources_count: sources.length,
        request_id: requestId,
        preset,
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
    }

    // Add mode-specific data
    if (mode === 'report' && facts) {
      response.facts = facts
    }
    if (mode === 'compare' && comparisonData) {
      response.comparison = comparisonData
      response.queries = queries
    }

    return Response.json(response)

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
    version: '4.0.0',
    architecture: 'Flash-Groq Relay',
    features: {
      modes: ['report', 'extract', 'schema', 'compare'],
      presets: Object.keys(DOMAIN_PRESETS),
      webhook: true,
      cache: redis ? 'enabled' : 'disabled'
    },
    models: {
      reader: GEMINI_FLASH_MODEL,
      writer: GROQ_FAST_MODEL
    },
    examples: {
      report: {
        query: 'Latest news about Tesla',
        preset: 'stocks'
      },
      extract: {
        query: 'iPhone 16 specifications',
        mode: 'extract',
        extract: ['price', 'release_date', 'battery', 'chip']
      },
      schema: {
        query: 'Compare AWS vs Azure',
        mode: 'schema',
        schema: {
          providers: [{ name: '', market_share: '', strengths: [] }],
          recommendation: ''
        }
      },
      compare: {
        mode: 'compare',
        queries: ['Tesla stock', 'Rivian stock', 'Lucid stock'],
        preset: 'stocks'
      }
    }
  })
}
