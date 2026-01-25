/**
 * UnforgeAPI - Deep Research Endpoint (v4.2 "Cerebras-Groq Relay")
 * POST /api/v1/deep-research
 *
 * ARCHITECTURE: Cerebras-Groq Relay (Fastest + Free)
 *
 * Pipeline:
 * 1. CHECK CACHE (Upstash Redis - Global)
 * 2. SEARCH (Tavily with raw_content)
 * 3. COMPRESS (Cerebras GPT OSS 120B - extracts facts from 100KB raw content)
 * 4. WRITE REPORT (Groq llama-3.1-8b - fast text gen on small facts JSON)
 * 5. CACHE & RETURN
 *
 * FALLBACK: Gemini Flash if Cerebras fails
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
 *   - Uses system Tavily + Cerebras + Groq keys
 *   - No user headers needed
 *
 * BYOK USERS (byok_starter, byok_pro):
 *   - Requires x-tavily-key header
 *   - Optional x-cerebras-key, x-groq-key, x-google-key headers
 */

import { NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText, streamText } from 'ai'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'
import { jsonrepair } from 'jsonrepair'
import { type ApiPlan } from '@/lib/subscription-constants'
import { checkFeatureRateLimit, isByokExempt, getRateLimitErrorResponse, UNKEY_NAMESPACES, NAMESPACE_LIMITS, checkByokProRateLimit, requiresByokProRateLimit } from '@/lib/unkey'

// ============================================
// CONFIGURATION
// ============================================

export const maxDuration = 300

// Auto-cut timer: Stop processing at 4m10s to leave room for emergency finalization
// Vercel Fluid Compute gives us 300s (5 minutes) on Free Tier
const TIME_LIMIT_MS = 250_000
const EMERGENCY_BUFFER_MS = 50_000  // 50s reserved for emergency Groq finalization

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

// Model configuration - Cerebras-Groq Relay
// Primary: Cerebras GPT OSS 120B for extraction (handles large context)
// Writer: Groq llama-3.1-8b (ultra-fast text gen, only sees small facts JSON)
// Fallback: Gemini Flash for extraction if Cerebras fails
const CEREBRAS_MODEL = 'gpt-oss-120b'
const GROQ_WRITER_MODEL = 'llama-3.1-8b-instant'
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash'

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

  // Agentic Loop - optional parameter for iterative reasoning
  // false (default): Single-shot search (faster)
  // true: Agentic reasoning loop (iterative, cross-source verification)
  agentic_loop?: boolean
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
// AGENTIC LOOP - EVALUATOR PROMPT
// ============================================
// This prompt instructs the LLM to detect date-mismatch hallucinations
const EVALUATOR_PROMPT = `You are a Research Quality Evaluator. Your job is to analyze search results and determine if they actually answer the user's query with CURRENT, RELEVANT data.

USER QUERY: "{query}"

SEARCH RESULTS (with metadata):
{search_results}

ANALYSIS TASK:
1. Extract publication dates from titles, snippets, and content
2. Identify if the query asks about CURRENT or FUTURE information
3. Check if the search results contain:
   - Actual current data (not predictions about the future)
   - Recent publications (within last 6-12 months for current topics)
   - Factual information that directly answers the query

DATE-MISMATCH HALLUCINATION PATTERNS TO DETECT:
- Query asks about "2026 trends" but results are from 2021-2023 making predictions
- Query asks for "current price" but results are from years ago
- Query asks about "latest version" but results discuss old versions
- Query asks for "recent news" but results are outdated
- Query asks for "actual data" but results contain only predictions/speculation

EVALUATION CRITERIA:
- VALID: Results contain current, factual data that directly answers the query
- INVALID: Results are outdated, contain predictions instead of actuals, or don't address the query's temporal requirements

RESPONSE FORMAT (JSON):
{
  "is_valid": boolean,
  "confidence": number (0-1),
  "reasoning": string,
  "date_analysis": {
    "query_temporal_intent": "current|future|historical",
    "result_dates": ["2024-01-15", "2023-11-20", ...],
    "date_range": "2023-11-20 to 2024-01-15",
    "most_recent": "2024-01-15",
    "is_outdated": boolean
  },
  "refined_query": string (if invalid, provide a better search query)
}

REFINED QUERY GENERATION RULES (when is_valid = false):
- Add temporal filters: "after:2025", "2026 actual data", "current 2026"
- Specify "vs predictions" to distinguish actuals from forecasts
- Add "latest", "recent", "updated" for current information
- Include specific timeframes: "January 2026", "Q1 2026"
- Focus on "official data", "actual results", "confirmed information"

Return ONLY valid JSON.`

// ============================================
// AGENTIC LOOP - MAX ITERATIONS
// ============================================
const MAX_AGENTIC_ITERATIONS = 3

// ============================================
// DEEP RESEARCH RATE LIMITING
// ============================================
// Uses Unkey namespace 'deep_research' for DECOUPLED rate limiting
// Rule A: Deep research limit is INDEPENDENT of web_search limit
// Rule B: BYOK users are exempt (they use their own keys)

// ============================================
// SCHEMAS
// ============================================

// Compressed facts schema with reasoning layer for contradiction detection
const factsSchema = z.object({
  key_stats: z.array(z.string()).describe("Important numbers, percentages, metrics"),
  dates: z.array(z.string()).describe("Relevant dates and timelines"),
  entities: z.array(z.string()).describe("Companies, people, products mentioned"),
  summary_points: z.array(z.string()).describe("Key findings in bullet form"),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string()
  })).describe("Source URLs for citations"),
  // Reasoning layer: contradiction detection and source agreement analysis
  source_agreement: z.object({
    consensus: z.enum(["high", "medium", "low"]).describe("How much sources agree: high=all agree, medium=minor conflicts, low=major contradictions"),
    conflicting_claims: z.array(z.object({
      claim_a: z.string().describe("First conflicting claim"),
      source_a: z.string().describe("Source of first claim"),
      claim_b: z.string().describe("Second conflicting claim"),
      source_b: z.string().describe("Source of second claim"),
      resolution: z.string().describe("Which claim is more likely true and why")
    })).describe("Contradictions found between sources with resolutions"),
    confidence_score: z.number().min(0).max(1).describe("Overall confidence in extracted facts: 0=unreliable, 1=highly reliable")
  }).describe("Analysis of source agreement and contradiction resolution")
})

// ============================================
// DEBUG UTILITIES - Enhanced for production debugging
// ============================================

interface DebugContext {
  requestId: string
  startTime: number
}

// Auth errors are ALWAYS logged (even in production) for debugging
const AUTH_DEBUG = true

function debug(tag: string, data: any, context?: DebugContext) {
  // Always log auth-related tags
  const isAuthTag = tag.startsWith('auth:') || tag.startsWith('verifyApiKey:')
  if (!DEBUG && !isAuthTag) return

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
  // Errors are ALWAYS logged
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const prefix = `❌ [DeepResearch:${tag}:ERROR]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
  console.error(`${timestamp} ${prefix}`, typeof error === 'object' ? JSON.stringify(error) : error)
}

// ============================================
// AUTO-CUT TIMER UTILITIES
// ============================================

interface TimerContext {
  startTime: number
  abortController: AbortController
  isTimedOut: boolean
  partialData: {
    searchResults?: any
    sources?: Array<{ title: string; url: string }>
    facts?: any
    extractedData?: any
    comparisonData?: any
  }
}

function createTimerContext(): TimerContext {
  return {
    startTime: performance.now(),
    abortController: new AbortController(),
    isTimedOut: false,
    partialData: {}
  }
}

function getElapsedMs(timer: TimerContext): number {
  return performance.now() - timer.startTime
}

function getRemainingMs(timer: TimerContext): number {
  return TIME_LIMIT_MS - getElapsedMs(timer)
}

function isTimeExpired(timer: TimerContext): boolean {
  return getElapsedMs(timer) >= TIME_LIMIT_MS
}

function checkAndAbort(timer: TimerContext, stage: string, context?: DebugContext): boolean {
  if (isTimeExpired(timer)) {
    timer.isTimedOut = true
    timer.abortController.abort()
    debug('timer:TIMEOUT', {
      stage,
      elapsedMs: Math.round(getElapsedMs(timer)),
      limitMs: TIME_LIMIT_MS,
      partialDataCollected: Object.keys(timer.partialData)
    }, context)
    return true
  }
  return false
}

// Emergency finalizer - generates a report from whatever data we have
async function emergencyFinalize(
  timer: TimerContext,
  query: string,
  groqKey: string,
  context?: DebugContext
): Promise<string> {
  debug('emergency:start', {
    elapsedMs: Math.round(getElapsedMs(timer)),
    partialData: Object.keys(timer.partialData)
  }, context)

  const groq = createGroq({ apiKey: groqKey })

  // Build context from whatever partial data we have
  let availableData = ''

  if (timer.partialData.facts) {
    availableData += `\nEXTRACTED FACTS:\n${JSON.stringify(timer.partialData.facts, null, 2)}`
  }

  if (timer.partialData.searchResults?.results) {
    const snippets = timer.partialData.searchResults.results
      .slice(0, 5)  // Take first 5 results
      .map((r: any) => `- ${r.title}: ${(r.content || '').substring(0, 300)}...`)
      .join('\n')
    availableData += `\nSEARCH RESULTS SNIPPETS:\n${snippets}`
  }

  if (timer.partialData.sources?.length) {
    const sourceList = timer.partialData.sources
      .slice(0, 8)
      .map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`)
      .join('\n')
    availableData += `\nSOURCES:\n${sourceList}`
  }

  if (timer.partialData.comparisonData) {
    availableData += `\nCOMPARISON DATA:\n${JSON.stringify(timer.partialData.comparisonData, null, 2)}`
  }

  if (timer.partialData.extractedData) {
    availableData += `\nEXTRACTED DATA:\n${JSON.stringify(timer.partialData.extractedData, null, 2)}`
  }

  // If we have literally nothing, return a minimal response
  if (!availableData.trim()) {
    return `# Research Report: ${query}

## Status
⚠️ **Partial Results** - The research process was interrupted due to time constraints.

## Summary
The search was initiated but did not complete in time. Please try again with a more specific query or during off-peak hours.

## Recommendations
- Try breaking your query into smaller, more focused questions
- Use a domain preset (crypto, stocks, tech, academic, news) for faster results
- Consider using extract mode for specific data points`
  }

  const emergencyPrompt = `You are a research analyst. Generate a QUICK summary report from the available data.

IMPORTANT: This is an EMERGENCY finalization - be concise and fast.

QUERY: "${query}"

AVAILABLE DATA:
${availableData}

Write a brief Markdown report with:
1. ## Summary (2-3 sentences of key findings)
2. ## Key Points (bullet list of main facts found)
3. ## Sources (list available sources)

Note at the top: "⚠️ **Partial Results** - Research was interrupted due to time constraints."

Keep it under 500 words. Focus on what we found, not what we couldn't find.`

  try {
    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: emergencyPrompt
    })

    debug('emergency:complete', { reportLength: result.text.length }, context)
    return result.text
  } catch (error: any) {
    debugError('emergency:failed', error, context)
    // Return a basic fallback report
    return `# Research Report: ${query}

⚠️ **Partial Results** - Research was interrupted due to time constraints.

## Available Information
${availableData || 'No data was collected before the timeout.'}

## Note
Please try your request again. Consider using a more specific query for faster results.`
  }
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
  ratelimit?: {
    limit: number
    remaining: number
    reset: number
  }
}

// Single attempt to verify API key (internal)
async function verifyApiKeyOnce(key: string, context?: DebugContext): Promise<UnkeyVerifyResult & { shouldRetry?: boolean }> {
  const verifyStartTime = performance.now()

  try {
    const response = await fetch('https://api.unkey.dev/v1/keys.verifyKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })

    const verifyLatency = Math.round(performance.now() - verifyStartTime)
    const rawResult = await response.json()
    const result = rawResult.data || rawResult

    debug('verifyApiKey:response', {
      httpStatus: response.status,
      httpOk: response.ok,
      verifyLatencyMs: verifyLatency,
      valid: result.valid,
      code: result.code,
      hasMetadata: !!result.meta,
      keyId: result.keyId || result.id,
      ownerId: result.ownerId,
      unkeyRequestId: rawResult.meta?.requestId,
      rawError: result.error || rawResult.error,
      rawCode: result.code || rawResult.code,
      ratelimit: result.ratelimit
    }, context)

    if (!response.ok) {
      debugError('verifyApiKey:httpError', {
        status: response.status,
        statusText: response.statusText,
        rawResult: JSON.stringify(rawResult).substring(0, 500),
        unkeyError: result.error || rawResult.error,
        unkeyCode: result.code || rawResult.code
      }, context)

      // Retry on 5xx errors or specific transient errors
      const shouldRetry = response.status >= 500 || response.status === 429
      return {
        valid: false,
        code: result.code || rawResult.code || 'API_ERROR',
        shouldRetry
      }
    }

    if (!result.valid) {
      debug('verifyApiKey:invalidKey', {
        code: result.code,
        reason: result.code === 'NOT_FOUND' ? 'Key does not exist in Unkey' :
          result.code === 'RATE_LIMITED' ? 'Key is rate limited' :
            result.code === 'EXPIRED' ? 'Key has expired' :
              result.code === 'DISABLED' ? 'Key is disabled' :
                result.code === 'FORBIDDEN' ? 'Key lacks permissions' :
                  'Unknown reason',
        remaining: result.remaining,
        ratelimit: result.ratelimit
      }, context)
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
    const verifyLatency = Math.round(performance.now() - verifyStartTime)
    debugError('verifyApiKey:networkError', {
      errorName: error.name,
      errorMessage: error.message,
      errorCause: error.cause,
      verifyLatencyMs: verifyLatency,
      isTimeout: error.name === 'AbortError' || error.message?.includes('timeout'),
      isFetchError: error.name === 'TypeError' && error.message?.includes('fetch')
    }, context)
    // Network errors are always retryable
    return { valid: false, code: 'NETWORK_ERROR', shouldRetry: true }
  }
}

// Verify API key with automatic retry on transient errors
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
      debug('verifyApiKey:noRetry', { attempt, code: result.code, reason: 'Definitive failure, not retryable' }, context)
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
  signal?: AbortSignal  // For timeout cancellation
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
    max_results: 12
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
    body: JSON.stringify(requestBody),
    signal: options?.signal  // Enable abort
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
// AGENTIC LOOP - EVALUATOR FUNCTION
// ============================================

interface EvaluationResult {
  is_valid: boolean
  confidence: number
  reasoning: string
  date_analysis: {
    query_temporal_intent: 'current' | 'future' | 'historical'
    result_dates: string[]
    date_range: string
    most_recent: string
    is_outdated: boolean
  }
  refined_query: string
}

interface AgenticLoopContext {
  iteration: number
  total_iterations: number
  current_query: string
  all_search_results: TavilySearchResponse[]
  evaluations: EvaluationResult[]
  status: string
}

async function evaluateSearchResults(
  query: string,
  searchResults: TavilySearchResponse,
  groqKey: string,
  context?: DebugContext
): Promise<EvaluationResult> {
  debug('agentic:evaluator:start', {
    query: query.substring(0, 50),
    resultCount: searchResults.results?.length
  }, context)

  // Prepare search results for evaluation
  const searchResultsText = searchResults.results
    .map((r, i) => {
      const dateStr = r.content?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/i)?.[0] || 'No date detected'
      return `[${i + 1}] ${r.title}\nURL: ${r.url}\nDate: ${dateStr}\nSnippet: ${(r.content || '').substring(0, 200)}...`
    })
    .join('\n\n')

  const evaluatorPrompt = EVALUATOR_PROMPT
    .replace('{query}', query)
    .replace('{search_results}', searchResultsText)

  const groq = createGroq({ apiKey: groqKey })

  try {
    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: evaluatorPrompt,
      temperature: 0.1
    })

    // Parse JSON response
    let jsonStr = result.text.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }

    const evaluation: EvaluationResult = JSON.parse(jsonStr.trim())

    debug('agentic:evaluator:result', {
      isValid: evaluation.is_valid,
      confidence: evaluation.confidence,
      isOutdated: evaluation.date_analysis?.is_outdated,
      refinedQuery: evaluation.refined_query?.substring(0, 100)
    }, context)

    return evaluation
  } catch (error: any) {
    debugError('agentic:evaluator:error', error, context)
    // Fallback: assume valid if evaluation fails
    return {
      is_valid: true,
      confidence: 0.5,
      reasoning: 'Evaluation failed, proceeding with original results',
      date_analysis: {
        query_temporal_intent: 'current',
        result_dates: [],
        date_range: 'unknown',
        most_recent: 'unknown',
        is_outdated: false
      },
      refined_query: query
    }
  }
}

// ============================================
// AGENTIC LOOP - MAIN LOOP FUNCTION
// ============================================

async function agenticSearchLoop(
  initialQuery: string,
  tavilyKey: string,
  groqKey: string,
  preset: string,
  timer: TimerContext,
  context?: DebugContext,
  onStatusUpdate?: (status: string, iteration?: number) => void
): Promise<{
  finalResults: TavilySearchResponse
  loopContext: AgenticLoopContext
}> {
  debug('agentic:loop:start', {
    initialQuery: initialQuery.substring(0, 50),
    maxIterations: MAX_AGENTIC_ITERATIONS
  }, context)

  const loopContext: AgenticLoopContext = {
    iteration: 0,
    total_iterations: MAX_AGENTIC_ITERATIONS,
    current_query: initialQuery,
    all_search_results: [],
    evaluations: [],
    status: 'starting'
  }

  let currentQuery = initialQuery
  let finalResults: TavilySearchResponse = { results: [] }

  for (let i = 0; i < MAX_AGENTIC_ITERATIONS; i++) {
    loopContext.iteration = i + 1
    loopContext.current_query = currentQuery

    // Check timeout before each iteration
    if (checkAndAbort(timer, `agentic-iteration-${i + 1}`, context)) {
      debug('agentic:loop:timeout', { iteration: i + 1 }, context)
      break
    }

    // Status update
    const statusMessage = i === 0
      ? 'Searching for relevant sources...'
      : `Refining search (iteration ${i + 1}/${MAX_AGENTIC_ITERATIONS})...`

    loopContext.status = statusMessage
    onStatusUpdate?.(statusMessage, i + 1)

    debug('agentic:loop:iteration', {
      iteration: i + 1,
      query: currentQuery.substring(0, 50)
    }, context)

    // Perform search
    const searchResults = await tavilySearchRaw(
      currentQuery,
      tavilyKey,
      context,
      {
        preset,
        signal: timer.abortController.signal
      }
    )

    loopContext.all_search_results.push(searchResults)

    // Evaluate results
    onStatusUpdate?.('Evaluating source relevance and recency...', i + 1)

    const evaluation = await evaluateSearchResults(
      currentQuery,
      searchResults,
      groqKey,
      context
    )

    loopContext.evaluations.push(evaluation)

    debug('agentic:loop:evaluation', {
      iteration: i + 1,
      isValid: evaluation.is_valid,
      confidence: evaluation.confidence,
      isOutdated: evaluation.date_analysis?.is_outdated,
      refinedQuery: evaluation.refined_query?.substring(0, 100)
    }, context)

    // If results are valid, we're done
    if (evaluation.is_valid && evaluation.confidence >= 0.7) {
      debug('agentic:loop:success', {
        iteration: i + 1,
        confidence: evaluation.confidence,
        reasoning: evaluation.reasoning?.substring(0, 100)
      }, context)

      finalResults = searchResults
      loopContext.status = 'completed'
      break
    }

    // If this was the last iteration, use the best results we have
    if (i === MAX_AGENTIC_ITERATIONS - 1) {
      debug('agentic:loop:max_iterations', {
        iteration: i + 1,
        usingBestResults: true
      }, context)

      // Merge all search results
      finalResults = {
        results: loopContext.all_search_results.flatMap(r => r.results)
      }
      loopContext.status = 'completed_with_best_effort'
      break
    }

    // Refine query for next iteration
    if (evaluation.refined_query && evaluation.refined_query !== currentQuery) {
      currentQuery = evaluation.refined_query
      onStatusUpdate?.(`Refining search query: "${currentQuery.substring(0, 50)}..."`, i + 1)

      debug('agentic:loop:refining', {
        iteration: i + 1,
        oldQuery: loopContext.current_query.substring(0, 50),
        newQuery: currentQuery.substring(0, 50),
        reason: evaluation.reasoning?.substring(0, 100)
      }, context)
    } else {
      // If no refined query, generate one based on evaluation
      currentQuery = `${initialQuery} after:2024 current actual data`
      onStatusUpdate?.(`Auto-refining search query: "${currentQuery.substring(0, 50)}..."`, i + 1)

      debug('agentic:loop:auto_refining', {
        iteration: i + 1,
        autoRefinedQuery: currentQuery.substring(0, 50)
      }, context)
    }
  }

  debug('agentic:loop:complete', {
    totalIterations: loopContext.iteration,
    finalStatus: loopContext.status,
    totalResults: finalResults.results?.length,
    allResultsCount: loopContext.all_search_results.reduce((sum, r) => sum + r.results.length, 0)
  }, context)

  return {
    finalResults,
    loopContext
  }
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
  if (!data.workspaceId || !data.keyId) return

  // Use the shared logger which writes directly to Supabase
  // This replaces the internal fetch call to avoid 504 timeouts and improve performance
  import('@/lib/logger').then(({ logUsage: logToSupabase }) => {
    logToSupabase({
      workspaceId: data.workspaceId!,
      keyId: data.keyId!,
      intent: data.intent,
      latencyMs: data.latencyMs,
      query: data.query
    }).catch(() => { })
  })
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

  // Initialize auto-cut timer
  const timer = createTimerContext()

  debug('POST:start', {
    timestamp: new Date().toISOString(),
    timeLimitMs: TIME_LIMIT_MS,
    url: req.url,
    hasAuth: !!req.headers.get('Authorization'),
    hasGroqKey: !!req.headers.get('x-groq-key'),
    hasTavilyKey: !!req.headers.get('x-tavily-key')
  }, ctx)

  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      debug('auth:missing', { hasAuthHeader: !!authHeader }, ctx)
      return Response.json({
        error: 'Missing API Key',
        code: 'MISSING_API_KEY',
        request_id: requestId
      }, { status: 401 })
    }

    debug('auth:verifying', { tokenPrefix: token.substring(0, 10) + '...', tokenLength: token.length }, ctx)
    const result = await verifyApiKey(token, ctx)

    if (!result.valid) {
      debug('auth:failed', {
        code: result.code,
        hasKeyId: !!result.keyId
      }, ctx)

      if (result.code === 'RATE_LIMITED') {
        return Response.json({
          error: 'Rate limit exceeded. You have exceeded the allowed number of requests.',
          code: 'RATE_LIMITED',
          request_id: requestId,
          hint: 'Wait a moment and try again, or upgrade your plan for higher limits.'
        }, { status: 429 })
      }

      // More detailed error messages based on Unkey error codes
      const errorMessages: Record<string, string> = {
        'NOT_FOUND': 'API key not found. Please check your API key is correct.',
        'EXPIRED': 'API key has expired. Please generate a new key from the dashboard.',
        'DISABLED': 'API key has been disabled. Please contact support.',
        'FORBIDDEN': 'API key does not have permission to access this endpoint.',
        'API_ERROR': 'Failed to verify API key with authentication service. This may be a temporary issue - please retry.',
        'NETWORK_ERROR': 'Network error while verifying API key. Please check your connection and retry.'
      }

      return Response.json({
        error: errorMessages[result.code || ''] || 'Invalid API Key',
        code: result.code || 'INVALID_API_KEY',
        request_id: requestId,
        hint: result.code === 'API_ERROR' ? 'This is often a transient error. Please retry your request.' : undefined
      }, { status: 401 })
    }

    debug('auth:success', {
      keyId: result.keyId,
      plan: result.meta?.plan || result.meta?.tier,
      hasMeta: !!result.meta
    }, ctx)

    // ============================================
    // 2. TIER CHECK
    // ============================================
    const plan = result.meta?.plan || result.meta?.tier || 'sandbox'
    const isUserOnByokPlan = plan === 'byok_starter' || plan === 'byok_pro'
    const isManagedPlan = ['sandbox', 'managed_pro', 'managed_expert', 'managed_ultra', 'enterprise'].includes(plan)

    debug('tier:check', { plan, isUserOnByokPlan, isManagedPlan }, ctx)

    // All plans now have access - limits are enforced by rate limiter below
    const allowedPlans = ['sandbox', 'managed_pro', 'managed_expert', 'managed_ultra', 'byok_starter', 'byok_pro', 'enterprise']

    if (!allowedPlans.includes(plan)) {
      return Response.json({
        error: 'Deep Research requires a valid plan',
        code: 'PLAN_UPGRADE_REQUIRED',
        hint: 'Create a free API key at https://www.unforgeapi.com/dashboard',
        current_plan: plan
      }, { status: 403 })
    }

    // ============================================
    // 2.5 DEEP RESEARCH RATE LIMIT CHECK (Unkey Namespace: deep_research)
    // ============================================
    // Rule A: ONLY check deep_research namespace here - NEVER check web_search
    //         Deep Research is "all-inclusive" - does NOT deduct from web search quota
    // Rule B: BYOK users are exempt (they use their own keys)
    // NOTE: Rate limits are per-account (workspaceId), not per-key
    const validPlan = plan as ApiPlan
    let rateLimitRemaining: number | undefined
    const workspaceId = result.meta?.workspaceId

    if (!isByokExempt(plan) && workspaceId) {
      debug('rateLimit:check', {
        plan,
        workspaceId,
        namespace: UNKEY_NAMESPACES.DEEP_RESEARCH
      }, ctx)

      const rateLimitResult = await checkFeatureRateLimit(workspaceId, UNKEY_NAMESPACES.DEEP_RESEARCH)
      rateLimitRemaining = rateLimitResult.remaining

      debug('rateLimit:result', {
        success: rateLimitResult.success,
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset
      }, ctx)

      if (!rateLimitResult.success) {
        const errorResponse = getRateLimitErrorResponse(UNKEY_NAMESPACES.DEEP_RESEARCH, rateLimitResult)
        return Response.json(errorResponse, { status: 429 })
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
      webhook,
      agentic_loop = false  // Default: standard single-shot search
    } = body

    // ============================================
    // 3.1 BYOK PRO AGENTIC CAP CHECK (100/month hard limit)
    // ============================================
    // Vercel protection: BYOK Pro users get unlimited standard requests
    // but agentic is capped at 100/month to prevent execution time abuse
    let byokAgenticRemaining: number | undefined

    if (plan === 'byok_pro' && agentic_loop && workspaceId) {
      debug('byokProAgentic:check', {
        workspaceId,
        namespace: UNKEY_NAMESPACES.BYOK_PRO_AGENTIC
      }, ctx)

      const byokAgenticResult = await checkFeatureRateLimit(
        workspaceId,
        UNKEY_NAMESPACES.BYOK_PRO_AGENTIC,
        plan
      )
      byokAgenticRemaining = byokAgenticResult.remaining

      debug('byokProAgentic:result', {
        success: byokAgenticResult.success,
        remaining: byokAgenticResult.remaining,
        limit: byokAgenticResult.limit,
        reset: byokAgenticResult.reset
      }, ctx)

      if (!byokAgenticResult.success) {
        return Response.json({
          error: 'BYOK Pro agentic limit exceeded (100/month). Use agentic_loop: false for unlimited standard requests.',
          code: 'BYOK_PRO_AGENTIC_LIMIT_EXCEEDED',
          limit: 100,
          remaining: 0,
          period: 'monthly',
          hint: 'Set agentic_loop: false for unlimited standard deep research requests.'
        }, { status: 429 })
      }
    }

    // Validate mode-specific requirements
    if (mode === 'compare' && (!queries || queries.length < 2)) {
      return Response.json({
        error: 'Compare mode requires "queries" array with at least 2 items',
        code: 'INVALID_REQUEST',
        example: { mode: 'compare', queries: ['Tesla stock', 'Rivian stock'] }
      }, { status: 400 })
    }

    // ============================================
    // COMPARE MODE GUARDRAILS
    // ============================================
    // Limit compare mode to max 3 queries to prevent abuse
    // Each query = 1 Tavily search = 1 credit against user's limit
    const MAX_COMPARE_QUERIES = 3
    if (mode === 'compare' && queries && queries.length > MAX_COMPARE_QUERIES) {
      return Response.json({
        error: `Compare mode is limited to ${MAX_COMPARE_QUERIES} queries per request to ensure quality results.`,
        code: 'TOO_MANY_COMPARE_QUERIES',
        max_queries: MAX_COMPARE_QUERIES,
        your_queries: queries.length,
        hint: 'Split your comparison into multiple API calls'
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
      isUserOnByokPlan,
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
    const userCerebrasKey = req.headers.get('x-cerebras-key')
    const userGroqKey = req.headers.get('x-groq-key')
    const userGoogleKey = req.headers.get('x-google-key')

    // Determine active keys based on plan
    let activeTavilyKey: string | undefined
    let activeCerebrasKey: string | undefined
    let activeGroqKey: string | undefined  // Writer (primary) + extraction fallback
    let activeGoogleKey: string | undefined  // Extraction fallback

    if (isUserOnByokPlan) {
      // BYOK: MUST use user keys - do NOT fallback to system keys for search
      if (!userTavilyKey) {
        return Response.json({
          error: 'BYOK plans require x-tavily-key header for Deep Research',
          code: 'BYOK_MISSING_TAVILY_KEY',
          hint: 'Add your Tavily API key in the x-tavily-key header'
        }, { status: 400 })
      }

      activeTavilyKey = userTavilyKey
      // Cerebras/Groq/Google keys are optional for BYOK - use system keys if not provided
      activeCerebrasKey = userCerebrasKey || process.env.CEREBRAS_API_KEY
      activeGroqKey = userGroqKey || process.env.GROQ_API_KEY
      activeGoogleKey = userGoogleKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY

      // Need Groq for writing reports
      if (!activeGroqKey) {
        return Response.json({
          error: 'No Groq API key available for report writing. Provide x-groq-key header.',
          code: 'MISSING_GROQ_KEY'
        }, { status: 500 })
      }
      // Need either Cerebras or Gemini for extraction
      if (!activeCerebrasKey && !activeGoogleKey) {
        return Response.json({
          error: 'No extraction API key available. Provide x-cerebras-key or x-google-key header.',
          code: 'MISSING_EXTRACTION_KEY'
        }, { status: 500 })
      }
    } else {
      // Managed: Use system keys
      activeTavilyKey = process.env.TAVILY_API_KEY
      activeCerebrasKey = process.env.CEREBRAS_API_KEY
      activeGroqKey = process.env.GROQ_API_KEY  // Writer
      activeGoogleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY  // Extraction fallback

      if (!activeTavilyKey || !activeGroqKey) {
        return Response.json({
          error: 'Server configuration error - missing API keys',
          code: 'SERVER_CONFIG_ERROR'
        }, { status: 500 })
      }
      if (!activeCerebrasKey && !activeGoogleKey) {
        return Response.json({
          error: 'Server configuration error - no extraction model configured',
          code: 'SERVER_CONFIG_ERROR'
        }, { status: 500 })
      }
    }

    debug('keys:resolved', {
      hasTavily: !!activeTavilyKey,
      hasCerebras: !!activeCerebrasKey,
      hasGroq: !!activeGroqKey,
      hasGoogle: !!activeGoogleKey,
      isUserOnByokPlan
    }, ctx)

    // ============================================
    // 5. CHECK CACHE (Global - Upstash Redis)
    // ============================================
    const redis = getRedisClient()
    const queryHash = hashQuery(effectiveQuery)
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
    // NOTE: Deep Research does NOT check web_search rate limit (Rule A: Independence)
    // The deep_research namespace limit (checked above) is the ONLY constraint
    // This makes deep research "all-inclusive" - it does not deduct from web search quota
    debug('pipeline:search:start', { mode, preset, isAgentic: true }, ctx)

    let searchResults: TavilySearchResponse
    let allSources: Array<{ title: string; url: string }> = []

    // ============================================
    // AUTO-CUT CHECK: Before search
    // ============================================
    if (checkAndAbort(timer, 'pre-search', ctx)) {
      return Response.json({
        error: 'Request timed out before search could complete',
        code: 'TIMEOUT',
        partial: false
      }, { status: 504 })
    }

    // Use agentic search loop if agentic_loop=true, otherwise standard search
    if (agentic_loop) {
      debug('pipeline:agentic:enabled', { agentic_loop }, ctx)

      try {
        const agenticResult = await agenticSearchLoop(
          effectiveQuery,
          activeTavilyKey,
          activeGroqKey,
          preset,
          timer,
          ctx,
          (status, iteration) => {
            debug('agentic:status', { status, iteration }, ctx)
          }
        )

        searchResults = agenticResult.finalResults
        allSources = searchResults.results.map(r => ({ title: r.title, url: r.url }))
      } catch (agenticError: any) {
        // If aborted due to timeout, trigger emergency finalization
        if (agenticError.name === 'AbortError' || timer.isTimedOut) {
          debug('pipeline:agentic:aborted', { reason: 'timeout' }, ctx)
          timer.partialData.sources = allSources
          const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
          return Response.json({
            report: emergencyReport,
            meta: {
              source: 'emergency',
              partial: true,
              latency_ms: Math.round(performance.now() - startTime),
              reason: 'timeout_during_agentic_search',
              request_id: requestId
            }
          })
        }
        throw agenticError
      }
    } else {
      // Standard single-shot search (faster, no iteration)
      debug('pipeline:standard:enabled', { agentic_loop }, ctx)

      try {
        searchResults = await tavilySearchRaw(
          effectiveQuery,
          activeTavilyKey,
          ctx,
          { preset, signal: timer.abortController.signal }
        )
        allSources = searchResults.results.map(r => ({ title: r.title, url: r.url }))
      } catch (searchError: any) {
        // If aborted due to timeout, trigger emergency finalization
        if (searchError.name === 'AbortError' || timer.isTimedOut) {
          debug('pipeline:standard:aborted', { reason: 'timeout' }, ctx)
          const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
          return Response.json({
            report: emergencyReport,
            meta: {
              source: 'emergency',
              partial: true,
              latency_ms: Math.round(performance.now() - startTime),
              reason: 'timeout_during_search',
              request_id: requestId
            }
          })
        }
        debugError('pipeline:search', searchError, ctx)
        return Response.json({
          error: 'Search failed',
          code: 'SEARCH_ERROR',
          message: searchError.message
        }, { status: 500 })
      }
    }

    // Store partial data for potential emergency finalization
    timer.partialData.searchResults = searchResults
    timer.partialData.sources = allSources

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
    // 7. ANALYZE/EXTRACT (Cerebras GPT OSS 120B - Primary, Gemini Flash - Fallback)
    // ============================================
    // Cerebras: Smart extraction, handles massive context (100k+ chars) → outputs small facts JSON (~2KB)
    // Gemini Flash: Fallback if Cerebras fails

    // ============================================
    // AUTO-CUT CHECK: Before extraction
    // ============================================
    if (checkAndAbort(timer, 'pre-extraction', ctx)) {
      debug('timer:emergency:extraction', { elapsedMs: Math.round(getElapsedMs(timer)) }, ctx)
      const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
      return Response.json({
        report: emergencyReport,
        sources: timer.partialData.sources,
        meta: {
          source: 'emergency',
          partial: true,
          latency_ms: Math.round(performance.now() - startTime),
          sources_count: timer.partialData.sources?.length || 0,
          reason: 'timeout_before_extraction',
          request_id: requestId
        }
      })
    }

    debug('pipeline:extract:start', {
      mode,
      isAgentic: true,
      useCerebras: !!activeCerebrasKey,
      remainingMs: Math.round(getRemainingMs(timer))
    }, ctx)

    let facts: z.infer<typeof factsSchema> | undefined = undefined
    let extractedData: Record<string, any> | null = null
    let schemaData: Record<string, any> | null = null
    let comparisonData: any[] | null = null
    let extractionModel = 'cerebras'

    // Helper to call Cerebras API for structured extraction
    async function cerebrasExtract(prompt: string): Promise<any> {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeCerebrasKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: CEREBRAS_MODEL,
          messages: [
            { role: 'system', content: 'You are a data extraction expert. Always respond with valid JSON matching the requested schema.' },
            { role: 'user', content: prompt + '\n\nRespond ONLY with valid JSON, no markdown or explanation.' }
          ],
          temperature: 0.1,
          max_tokens: 8000
        }),
        signal: timer.abortController.signal  // Enable abort on timeout
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Cerebras API error: ${response.status} - ${JSON.stringify(error)}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content || ''

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }

      // Use jsonrepair to fix malformed JSON (missing brackets, trailing commas, etc.)
      const repairedJson = jsonrepair(jsonStr.trim())
      return JSON.parse(repairedJson)
    }

    // Gemini Flash fallback for extraction (if Cerebras fails)
    const google = createGoogleGenerativeAI({ apiKey: activeGoogleKey })

    // Groq for report writing (hardware speed)
    const groq = createGroq({ apiKey: activeGroqKey })

    async function geminiFallbackExtract<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
      const result = await generateObject({
        model: google(GEMINI_FALLBACK_MODEL),
        schema: schema as any,
        prompt
      })
      return result.object as T
    }

    try {
      if (mode === 'extract' && extract) {
        // EXTRACT MODE: Extract specific fields
        const extractSchema = z.object(
          extract.reduce((acc, field) => {
            acc[field] = z.string().describe(`The ${field} extracted from the content`)
            return acc
          }, {} as Record<string, z.ZodString>)
        )

        const extractPrompt = `You are a data extraction expert. Extract ONLY the requested fields from this content.

QUERY: "${effectiveQuery}"

FIELDS TO EXTRACT: ${extract.join(', ')}

RAW CONTENT:
${hugeContext}

RULES:
- Extract ONLY the requested fields
- If a field is not found, return "Not found"
- Be precise and concise
- ${presetConfig.prompt_hint}
- IMPORTANT: When extracting numerical data like "revenue" or "income", look for tables, financial summaries, or sentence mentions. If the data exists in the text, EXTRACT IT. Do not return "Not found" unless it is truly absent.

Return a JSON object with these exact fields: ${extract.join(', ')}`

        try {
          if (activeCerebrasKey) {
            extractedData = await cerebrasExtract(extractPrompt)
            extractionModel = 'cerebras'
          } else {
            throw new Error('No Cerebras key, using fallback')
          }
        } catch (cerebrasError: any) {
          debug('pipeline:extract:cerebras:failed', { error: cerebrasError.message }, ctx)
          if (activeGoogleKey) {
            extractedData = await geminiFallbackExtract(extractPrompt, extractSchema)
            extractionModel = 'gemini-fallback'
          } else {
            throw cerebrasError
          }
        }

        debug('pipeline:extract:complete', { fields: Object.keys(extractedData || {}), model: extractionModel }, ctx)

      } else if (mode === 'schema' && schema) {
        // SCHEMA MODE: Fill user-defined schema with Cerebras/Groq
        const schemaPrompt = `You are a data structuring expert. Fill in this exact JSON schema with data from the content.

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

        try {
          if (activeCerebrasKey) {
            schemaData = await cerebrasExtract(schemaPrompt)
            extractionModel = 'cerebras'
          } else {
            throw new Error('No Cerebras key, using fallback')
          }
        } catch (cerebrasError: any) {
          debug('pipeline:schema:cerebras:failed', { error: cerebrasError.message }, ctx)
          if (activeGoogleKey) {
            // For schema mode, use generateText with Gemini as fallback
            const schemaResult = await generateText({
              model: google(GEMINI_FALLBACK_MODEL),
              prompt: schemaPrompt
            })
            schemaData = JSON.parse(schemaResult.text)
            extractionModel = 'gemini-fallback'
          } else {
            throw cerebrasError
          }
        }

        debug('pipeline:schema:complete', { keys: Object.keys(schemaData || {}), model: extractionModel }, ctx)

      } else if (mode === 'compare' && queries) {
        // COMPARE MODE: Structured comparison with Cerebras/Groq
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

        const comparePrompt = `You are a comparison analyst. Compare these items objectively.

ITEMS TO COMPARE: ${queries.join(' vs ')}

RAW CONTENT:
${hugeContext}

RULES:
- Compare ALL items fairly
- List pros and cons for each
- Highlight key differences
- Give a balanced recommendation
- ${presetConfig.prompt_hint}

Return a JSON object with: comparison_table (array of {item, key_facts, pros, cons}), recommendation, key_differences`

        let compareResult: any
        try {
          if (activeCerebrasKey) {
            compareResult = await cerebrasExtract(comparePrompt)
            extractionModel = 'cerebras'
          } else {
            throw new Error('No Cerebras key, using fallback')
          }
        } catch (cerebrasError: any) {
          debug('pipeline:compare:cerebras:failed', { error: cerebrasError.message }, ctx)
          if (activeGoogleKey) {
            compareResult = await geminiFallbackExtract(comparePrompt, compareSchema)
            extractionModel = 'gemini-fallback'
          } else {
            throw cerebrasError
          }
        }

        comparisonData = compareResult.comparison_table

        // Also fill facts for the full response
        facts = {
          key_stats: [],
          dates: [],
          entities: queries,
          summary_points: compareResult.key_differences,
          sources,
          // Compare mode doesn't do contradiction detection, use defaults
          source_agreement: {
            consensus: 'medium' as const,
            conflicting_claims: [],
            confidence_score: 0.7
          }
        }

        debug('pipeline:compare:complete', { itemsCompared: comparisonData?.length, model: extractionModel }, ctx)

      } else {
        // REPORT MODE (default): Standard facts extraction with Cerebras/Groq + Reasoning Layer
        const factsPrompt = `You are a research analyst with CRITICAL THINKING skills. Analyze this raw web content, extract hard facts, AND identify contradictions between sources.

QUERY: "${effectiveQuery}"

RAW CONTENT:
${hugeContext}

SOURCES:
${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.url}`).join('\n')}

=== EXTRACTION TASK ===
Extract and return JSON with:
1. key_stats: Array of important numbers, percentages, metrics (with source reference)
2. dates: Array of relevant dates and timelines
3. entities: Array of companies, people, products mentioned
4. summary_points: Array of 5-10 key findings as bullet points
5. sources: Array of {title, url} for each source used

=== REASONING TASK (source_agreement) ===
6. Identify CONTRADICTIONS: When Source A says X but Source B says Y, note both claims
7. RESOLVE contradictions: Pick the most likely truth based on:
   - Recency (newer data is usually more accurate)
   - Source authority (official sources > blogs)
   - Specificity (concrete numbers > vague claims)
   - Corroboration (3 sources agree > 1 source disagrees)
8. Rate CONSENSUS: "high" (all sources agree), "medium" (minor conflicts), "low" (major contradictions)
9. Assign CONFIDENCE: 0.0-1.0 based on source quality and agreement

source_agreement format:
{
  "consensus": "high" | "medium" | "low",
  "conflicting_claims": [{"claim_a": "...", "source_a": "...", "claim_b": "...", "source_b": "...", "resolution": "..."}],
  "confidence_score": 0.0-1.0
}

RULES:
- Extract ONLY facts from the provided content
- Do NOT make up information
- When resolving conflicts, explain your reasoning briefly
- If no contradictions found, use empty array for conflicting_claims and "high" consensus
- Be concise - compress knowledge into minimal JSON
- ${presetConfig.prompt_hint}`

        try {
          if (activeCerebrasKey) {
            facts = await cerebrasExtract(factsPrompt)
            extractionModel = 'cerebras'
          } else {
            throw new Error('No Cerebras key, using fallback')
          }
        } catch (cerebrasError: any) {
          debug('pipeline:facts:cerebras:failed', { error: cerebrasError.message }, ctx)
          if (activeGoogleKey) {
            facts = await geminiFallbackExtract(factsPrompt, factsSchema)
            extractionModel = 'gemini-fallback'
          } else {
            throw cerebrasError
          }
        }

        debug('pipeline:facts:complete', {
          statsCount: facts?.key_stats?.length || 0,
          pointsCount: facts?.summary_points?.length || 0,
          model: extractionModel
        }, ctx)
      }

      // Store extracted data for potential emergency use
      if (facts) timer.partialData.facts = facts
      if (extractedData) timer.partialData.extractedData = extractedData
      if (comparisonData) timer.partialData.comparisonData = comparisonData

    } catch (extractError: any) {
      // Check if error is due to timeout/abort
      if (extractError.name === 'AbortError' || timer.isTimedOut) {
        debug('pipeline:extract:aborted', { reason: 'timeout' }, ctx)
        const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
        return Response.json({
          report: emergencyReport,
          sources: timer.partialData.sources,
          meta: {
            source: 'emergency',
            partial: true,
            latency_ms: Math.round(performance.now() - startTime),
            sources_count: timer.partialData.sources?.length || 0,
            reason: 'timeout_during_extraction',
            request_id: requestId
          }
        })
      }

      debugError('pipeline:extract', extractError, ctx)
      return Response.json({
        error: 'Failed to analyze search results',
        code: 'EXTRACT_ERROR',
        message: extractError.message
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
        redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS }).catch(() => { })
      }

      // Send webhook if configured
      if (webhook) {
        sendWebhook(webhook, {
          mode: 'extract',
          query: effectiveQuery,
          data: extractedData,
          sources,
          request_id: requestId
        }).catch(() => { })
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
          model: extractionModel === 'cerebras' ? CEREBRAS_MODEL : GEMINI_FALLBACK_MODEL
        }
      })
    }

    if (mode === 'schema' && schemaData) {
      const latencyMs = Math.round(performance.now() - startTime)

      if (redis) {
        const cacheData = JSON.stringify(schemaData)
        redis.set(cacheKey, cacheData, { ex: CACHE_TTL_SECONDS }).catch(() => { })
      }

      if (webhook) {
        sendWebhook(webhook, {
          mode: 'schema',
          query: effectiveQuery,
          data: schemaData,
          sources,
          request_id: requestId
        }).catch(() => { })
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
          model: extractionModel === 'cerebras' ? CEREBRAS_MODEL : GEMINI_FALLBACK_MODEL
        }
      })
    }

    // For report and compare modes, generate prose with Groq (hardware speed writer)
    // Facts JSON is ~2KB, so Groq's TPM is not a constraint

    // ============================================
    // AUTO-CUT CHECK: Before report generation
    // ============================================
    if (checkAndAbort(timer, 'pre-write', ctx)) {
      debug('timer:emergency:write', { elapsedMs: Math.round(getElapsedMs(timer)) }, ctx)
      const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
      return Response.json({
        report: emergencyReport,
        sources: timer.partialData.sources,
        meta: {
          source: 'emergency',
          partial: true,
          latency_ms: Math.round(performance.now() - startTime),
          sources_count: timer.partialData.sources?.length || 0,
          reason: 'timeout_before_write',
          request_id: requestId
        }
      })
    }

    debug('pipeline:write:start', {
      mode,
      stream,
      remainingMs: Math.round(getRemainingMs(timer))
    }, ctx)

    // ============================================
    // STREAMING MODE: Use AI SDK streamText for real-time output
    // ============================================
    // Streaming keeps the connection active and prevents Vercel from killing
    // the function for being "idle". User sees progress in real-time.
    if (stream) {
      debug('pipeline:write:streaming', { mode }, ctx)

      const writePrompt = mode === 'compare' && comparisonData
        ? `You are an expert analyst writing a Comparison Report.

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
(For each item: key facts, pros, cons)

## Key Differences
List the most important differences.

## Recommendation
Balanced recommendation based on the data.

## Sources
List all sources with clickable links.

RULES:
- Be objective and balanced
- Use tables for easy comparison
- Cite sources where appropriate`
        : `You are an expert research analyst writing an Executive Research Report.

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

      try {
        const streamResult = await streamText({
          model: groq(GROQ_WRITER_MODEL),
          prompt: writePrompt,
          abortSignal: timer.abortController.signal
        })

        // Return streaming response with proper headers
        // The AI SDK handles the streaming format automatically
        const response = streamResult.toTextStreamResponse({
          headers: {
            'X-Request-Id': requestId,
            'X-Sources-Count': String(sources.length),
            'X-Mode': mode,
            'X-Preset': preset
          }
        })

        // Log usage asynchronously (don't block the stream)
        logUsage({
          workspaceId: result.meta?.workspaceId,
          keyId: result.keyId,
          intent: mode === 'compare' ? 'DEEP_RESEARCH_COMPARE_STREAM' : 'DEEP_RESEARCH_STREAM',
          latencyMs: Math.round(performance.now() - startTime),
          query: effectiveQuery,
          cached: false
        })

        debug('pipeline:write:stream:started', { requestId }, ctx)
        return response

      } catch (streamError: any) {
        // If streaming fails due to timeout, try emergency finalization
        if (streamError.name === 'AbortError' || timer.isTimedOut) {
          debug('pipeline:write:stream:aborted', { reason: 'timeout' }, ctx)
          const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
          return Response.json({
            report: emergencyReport,
            sources: timer.partialData.sources,
            meta: {
              source: 'emergency',
              partial: true,
              latency_ms: Math.round(performance.now() - startTime),
              reason: 'timeout_during_stream',
              request_id: requestId
            }
          })
        }
        throw streamError
      }
    }

    // ============================================
    // NON-STREAMING MODE: Generate full report then return
    // ============================================
    let report: string
    try {
      if (mode === 'compare' && comparisonData) {
        // COMPARE MODE: Generate comparison report with Groq
        const writeResult = await generateText({
          model: groq(GROQ_WRITER_MODEL),
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
- Cite sources where appropriate`,
          abortSignal: timer.abortController.signal
        })
        report = writeResult.text
      } else {
        // REPORT MODE (default) - Generate with Groq (hardware speed)
        const writeResult = await generateText({
          model: groq(GROQ_WRITER_MODEL),
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
- ${presetConfig.prompt_hint}`,
          abortSignal: timer.abortController.signal
        })
        report = writeResult.text
      }

      debug('pipeline:write:complete', { reportLength: report.length }, ctx)
    } catch (writeError: any) {
      // Handle timeout during write
      if (writeError.name === 'AbortError' || timer.isTimedOut) {
        debug('pipeline:write:aborted', { reason: 'timeout' }, ctx)
        const emergencyReport = await emergencyFinalize(timer, effectiveQuery, activeGroqKey, ctx)
        return Response.json({
          report: emergencyReport,
          sources: timer.partialData.sources,
          meta: {
            source: 'emergency',
            partial: true,
            latency_ms: Math.round(performance.now() - startTime),
            sources_count: timer.partialData.sources?.length || 0,
            reason: 'timeout_during_write',
            request_id: requestId
          }
        })
      }

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

    // NOTE: Credit deduction removed - deep_research rate limit (checked at start) covers all
    // All deep research is now agentic by default

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
      }).catch(() => { })
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
      extractionModel,
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
        agentic: true,  // All deep research is now agentic by default
        // Reasoning layer metadata - contradiction detection and confidence
        reasoning: {
          consensus: facts?.source_agreement?.consensus || 'unknown',
          confidence: facts?.source_agreement?.confidence_score ?? null,
          conflicts_found: facts?.source_agreement?.conflicting_claims?.length || 0
        },
        quota: {
          limit: NAMESPACE_LIMITS.deep_research.limit,
          remaining: rateLimitRemaining,
          period: 'daily'
        }
      }
    }

    // Add rate limit headers to Response
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (rateLimitRemaining !== undefined) {
      // Feature Limit (Deep Research)
      headers['X-RateLimit-Limit'] = String(NAMESPACE_LIMITS.deep_research.limit)
      headers['X-RateLimit-Remaining'] = String(rateLimitRemaining)
      // Note: We don't have exact reset from feature check here easily without refactoring, 
      // but we can infer or skip reset for now. Or better, update checkFeatureRateLimit to return it.
      // For now, let's use the result from verifyApiKey if available for GLOBAL limit fallback
    }

    // Add global rate limit headers if available (from Unkey verification)
    if (result.ratelimit) {
      // If we didn't set feature specific headers, or just to provide global status
      // Standard practice: if specific feature limit is stricter/used, show that. 
      // But here deep_research is independent.
      // Let's allow overriding if we want to show Global API limit too, but standard headers usually show the one that constrained the request.

      // If we haven't set headers yet (BYOK or no feature limit applied)
      if (!headers['X-RateLimit-Limit']) {
        headers['X-RateLimit-Limit'] = String(result.ratelimit.limit)
        headers['X-RateLimit-Remaining'] = String(result.ratelimit.remaining)
        headers['X-RateLimit-Reset'] = String(Math.floor(result.ratelimit.reset / 1000))
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

    return Response.json(response, { headers })

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
    version: '4.3.0',
    description: 'Web search with AI-powered analysis and structured reports',
    features: {
      modes: ['report', 'extract', 'schema', 'compare'],
      presets: Object.keys(DOMAIN_PRESETS),
      webhook: true,
      cache: redis ? 'enabled' : 'disabled',
      agentic_loop: true
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
      },
      agentic_loop: {
        query: '2026 AI trends',
        agentic_loop: true,
        preset: 'tech',
        description: 'Enable agentic loop to eliminate outdated data and hallucinations'
      }
    }
  })
}
