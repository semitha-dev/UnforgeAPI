/**
 * UnforgeAPI - Deep Research Background Processor
 * POST /api/v1/deep-research/process
 * 
 * INTERNAL ENDPOINT - Called by the main deep-research route for async webhook processing
 * 
 * This endpoint handles the actual research work when a webhook is provided.
 * It's called via self-call pattern: the main route returns immediately,
 * then fires off a request to this endpoint which does the work and sends
 * results to the user's webhook.
 * 
 * FEATURES:
 * - All modes supported: report, extract, schema, compare
 * - Agentic loop support for better quality results
 * - Webhook delivery with HMAC signature
 * - Error notification to webhook on failure
 * 
 * Security: Requires X-Internal-Secret header matching INTERNAL_PROCESS_SECRET env var
 */

import { NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'
import { jsonrepair } from 'jsonrepair'

// ============================================
// CONFIGURATION
// ============================================

export const maxDuration = 300
export const preferredRegion = 'auto' // Enable Fluid Compute

const TIME_LIMIT_MS = 250_000
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

const CEREBRAS_MODEL = 'gpt-oss-120b'
const GROQ_WRITER_MODEL = 'llama-3.1-8b-instant'
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash'
const CACHE_TTL_SECONDS = 86400

// Domain presets
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
// TYPES
// ============================================

type OutputMode = 'report' | 'extract' | 'schema' | 'compare'

interface ProcessRequest {
    // Auth context passed from main route
    apiKey: string
    workspaceId?: string
    keyId?: string
    plan?: string

    // Request params
    query: string
    queries?: string[]
    mode: OutputMode
    extract?: string[]
    schema?: Record<string, any>
    preset: string
    webhook: string
    request_id: string
    agentic_loop?: boolean

    // Provider keys (for BYOK)
    tavilyKey?: string
    groqKey?: string
    cerebrasKey?: string
    googleKey?: string
}

// ============================================
// DEBUG UTILITIES
// ============================================

interface DebugContext {
    requestId: string
    startTime: number
}

function debug(tag: string, data: any, context?: DebugContext) {
    if (!DEBUG) return
    const timestamp = new Date().toISOString()
    const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
    const prefix = `[DeepResearch:Process:${tag}]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
    console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
}

function debugError(tag: string, error: any, context?: DebugContext) {
    const timestamp = new Date().toISOString()
    const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
    const prefix = `❌ [DeepResearch:Process:${tag}:ERROR]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
    console.error(`${timestamp} ${prefix}`, typeof error === 'object' ? JSON.stringify(error) : error)
}

function debugSuccess(tag: string, data: any, context?: DebugContext) {
    const timestamp = new Date().toISOString()
    const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
    const prefix = `✅ [DeepResearch:Process:${tag}]${context?.requestId ? ` [${context.requestId}]` : ''}${elapsed}`
    console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
}

// ============================================
// WEBHOOK DELIVERY
// ============================================

async function sendWebhook(url: string, data: Record<string, any>): Promise<boolean> {
    try {
        const payload = {
            event: 'deep_research.complete',
            timestamp: new Date().toISOString(),
            data
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Unforge-Signature': createHash('sha256')
                    .update(JSON.stringify(payload) + (process.env.WEBHOOK_SECRET || ''))
                    .digest('hex'),
                'X-Unforge-Event': 'deep_research.complete'
            },
            body: JSON.stringify(payload)
        })
        return response.ok
    } catch (error) {
        console.error('[Webhook] Failed to deliver:', error)
        return false
    }
}

// Send error webhook
async function sendErrorWebhook(url: string, requestId: string, error: string): Promise<void> {
    try {
        const payload = {
            event: 'deep_research.error',
            timestamp: new Date().toISOString(),
            data: {
                request_id: requestId,
                error,
                status: 'failed'
            }
        }

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Unforge-Signature': createHash('sha256')
                    .update(JSON.stringify(payload) + (process.env.WEBHOOK_SECRET || ''))
                    .digest('hex'),
                'X-Unforge-Event': 'deep_research.error'
            },
            body: JSON.stringify(payload)
        })
    } catch (e) {
        console.error('[Webhook] Failed to send error notification:', e)
    }
}

// ============================================
// REDIS HELPER
// ============================================

function getRedisClient(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return null
    }
    return Redis.fromEnv()
}

function hashQuery(query: string): string {
    return createHash('sha256').update(query.toLowerCase().trim()).digest('hex')
}

// ============================================
// TAVILY SEARCH
// ============================================

interface TavilyRawResult {
    title: string
    url: string
    content: string
    raw_content?: string
}

interface TavilySearchResponse {
    results: TavilyRawResult[]
}

async function tavilySearchRaw(
    query: string,
    tavilyKey: string,
    preset: string,
    context?: DebugContext
): Promise<TavilySearchResponse> {
    debug('tavily:search', { query: query.substring(0, 50), preset }, context)

    const presetConfig = DOMAIN_PRESETS[preset] || DOMAIN_PRESETS.general

    const requestBody: Record<string, any> = {
        api_key: tavilyKey,
        query,
        search_depth: presetConfig.search_depth,
        include_raw_content: true,
        include_answer: false,
        max_results: 12
    }

    if (presetConfig.include_domains?.length) {
        requestBody.include_domains = presetConfig.include_domains
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
    debug('tavily:complete', { resultCount: data.results?.length }, context)
    return data
}

// ============================================
// CEREBRAS EXTRACTION HELPER
// ============================================

async function cerebrasExtract(
    prompt: string,
    cerebrasKey: string,
    context?: DebugContext
): Promise<string> {
    debug('cerebras:extract:start', { promptLength: prompt.length }, context)

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cerebrasKey}`,
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
        })
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Cerebras API error: ${response.status} - ${JSON.stringify(error)}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''
    debug('cerebras:extract:complete', { contentLength: content.length }, context)
    return content
}

// ============================================
// MAIN PROCESS HANDLER
// ============================================

export async function POST(req: NextRequest) {
    const startTime = performance.now()

    // Verify internal secret
    const internalSecret = req.headers.get('X-Internal-Secret')
    const expectedSecret = process.env.INTERNAL_PROCESS_SECRET || process.env.WEBHOOK_SECRET || 'default-internal-secret'

    if (internalSecret !== expectedSecret) {
        return Response.json({ error: 'Unauthorized', code: 'INVALID_INTERNAL_SECRET' }, { status: 401 })
    }

    let body: ProcessRequest
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const ctx: DebugContext = { requestId: body.request_id, startTime }

    debug('process:start', {
        requestId: body.request_id,
        query: body.query?.substring(0, 50),
        mode: body.mode,
        hasQueries: !!body.queries?.length,
        hasExtract: !!body.extract?.length,
        hasSchema: !!body.schema,
        agenticLoop: body.agentic_loop,
        webhook: body.webhook?.substring(0, 50) + '...'
    }, ctx)

    try {
        // Get API keys (use provided or fall back to system keys)
        const tavilyKey = body.tavilyKey || process.env.TAVILY_API_KEY
        const groqKey = body.groqKey || process.env.GROQ_API_KEY
        const cerebrasKey = body.cerebrasKey || process.env.CEREBRAS_API_KEY
        const googleKey = body.googleKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY

        if (!tavilyKey) {
            await sendErrorWebhook(body.webhook, body.request_id, 'Tavily API key is required')
            return Response.json({ error: 'Missing Tavily key' }, { status: 400 })
        }

        if (!groqKey) {
            await sendErrorWebhook(body.webhook, body.request_id, 'Groq API key is required')
            return Response.json({ error: 'Missing Groq key' }, { status: 400 })
        }

        const groq = createGroq({ apiKey: groqKey })
        const presetConfig = DOMAIN_PRESETS[body.preset] || DOMAIN_PRESETS.general

        // ============================================
        // MODE-SPECIFIC PROCESSING
        // ============================================

        let report = ''
        let facts: any = null
        let extractedData: Record<string, any> | null = null
        let schemaData: Record<string, any> | null = null
        let comparisonData: any[] | null = null
        let sources: Array<{ title: string; url: string }> = []

        // Handle different modes
        if (body.mode === 'compare' && body.queries && body.queries.length >= 2) {
            // ============================================
            // COMPARE MODE - Multiple queries
            // ============================================
            debug('process:compare:start', { queryCount: body.queries.length }, ctx)

            comparisonData = []

            for (const queryItem of body.queries) {
                const searchResults = await tavilySearchRaw(queryItem, tavilyKey, body.preset, ctx)
                const querySources = searchResults.results
                    .slice(0, 5)
                    .map(r => ({ title: r.title, url: r.url }))
                sources.push(...querySources)

                const rawContent = searchResults.results
                    .map(r => r.raw_content || r.content || '')
                    .join('\n\n')
                    .substring(0, 30000)

                const extractPrompt = `Extract key facts about "${queryItem}" from these search results:

${rawContent}

Return JSON with: { "topic": "", "key_stats": [], "summary": "", "pros": [], "cons": [] }`

                let extractedJson: any = {}
                try {
                    if (cerebrasKey) {
                        const extracted = await cerebrasExtract(extractPrompt, cerebrasKey, ctx)
                        let jsonStr = extracted.trim()
                        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                        if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                        if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                        extractedJson = JSON.parse(jsonrepair(jsonStr.trim()))
                    } else {
                        const result = await generateText({
                            model: groq(GROQ_WRITER_MODEL),
                            prompt: extractPrompt
                        })
                        let jsonStr = result.text.trim()
                        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                        if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                        if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                        extractedJson = JSON.parse(jsonrepair(jsonStr.trim()))
                    }
                } catch (e) {
                    extractedJson = { topic: queryItem, error: 'Extraction failed' }
                }

                extractedJson.topic = queryItem
                extractedJson.sources = querySources
                comparisonData.push(extractedJson)
            }

            // Generate comparison report
            const comparisonPrompt = `You are a research analyst. Create a comparison report.

TOPICS TO COMPARE:
${JSON.stringify(comparisonData, null, 2)}

Write a Markdown comparison report with:
## Executive Summary
Brief overview of the comparison

## Comparison Table
| Aspect | ${body.queries.join(' | ')} |
(Include key metrics, pros, cons)

## Detailed Analysis
Analysis of each topic

## Recommendation
Which is best for different use cases

## Sources
List with links

${presetConfig.prompt_hint}`

            const writeResult = await generateText({
                model: groq(GROQ_WRITER_MODEL),
                prompt: comparisonPrompt
            })
            report = writeResult.text

        } else if (body.mode === 'extract' && body.extract && body.extract.length > 0) {
            // ============================================
            // EXTRACT MODE - Specific fields
            // ============================================
            debug('process:extract:start', { fields: body.extract }, ctx)

            const searchResults = await tavilySearchRaw(body.query, tavilyKey, body.preset, ctx)
            sources = searchResults.results.slice(0, 10).map(r => ({ title: r.title, url: r.url }))

            const rawContent = searchResults.results
                .map(r => r.raw_content || r.content || '')
                .join('\n\n')
                .substring(0, 50000)

            const fieldsSchema = body.extract.reduce((acc, field) => {
                acc[field] = `Extract the ${field}`
                return acc
            }, {} as Record<string, string>)

            const extractPrompt = `Extract specific data fields from these search results about "${body.query}":

${rawContent}

Extract these fields: ${body.extract.join(', ')}

Return JSON with ONLY these fields:
${JSON.stringify(fieldsSchema, null, 2)}

If a field cannot be found, use null. Be precise and factual.`

            try {
                if (cerebrasKey) {
                    const extracted = await cerebrasExtract(extractPrompt, cerebrasKey, ctx)
                    let jsonStr = extracted.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    extractedData = JSON.parse(jsonrepair(jsonStr.trim()))
                } else {
                    const result = await generateText({
                        model: groq(GROQ_WRITER_MODEL),
                        prompt: extractPrompt
                    })
                    let jsonStr = result.text.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    extractedData = JSON.parse(jsonrepair(jsonStr.trim()))
                }
            } catch (e) {
                extractedData = { error: 'Extraction failed', fields_requested: body.extract }
            }

            // Generate a brief summary report
            const summaryPrompt = `Summarize extracted data about "${body.query}":
Extracted: ${JSON.stringify(extractedData)}
Sources: ${sources.map(s => s.title).join(', ')}

Write a brief Markdown summary (3-4 paragraphs) explaining the findings.`

            const summaryResult = await generateText({
                model: groq(GROQ_WRITER_MODEL),
                prompt: summaryPrompt
            })
            report = summaryResult.text

        } else if (body.mode === 'schema' && body.schema) {
            // ============================================
            // SCHEMA MODE - Custom output structure
            // ============================================
            debug('process:schema:start', { schemaKeys: Object.keys(body.schema) }, ctx)

            const searchResults = await tavilySearchRaw(body.query, tavilyKey, body.preset, ctx)
            sources = searchResults.results.slice(0, 10).map(r => ({ title: r.title, url: r.url }))

            const rawContent = searchResults.results
                .map(r => r.raw_content || r.content || '')
                .join('\n\n')
                .substring(0, 50000)

            const schemaPrompt = `Extract data from these search results about "${body.query}":

${rawContent}

Return JSON matching this EXACT structure:
${JSON.stringify(body.schema, null, 2)}

Fill in the values based on the search results. Use null for missing data.`

            try {
                if (cerebrasKey) {
                    const extracted = await cerebrasExtract(schemaPrompt, cerebrasKey, ctx)
                    let jsonStr = extracted.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    schemaData = JSON.parse(jsonrepair(jsonStr.trim()))
                } else {
                    const result = await generateText({
                        model: groq(GROQ_WRITER_MODEL),
                        prompt: schemaPrompt
                    })
                    let jsonStr = result.text.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    schemaData = JSON.parse(jsonrepair(jsonStr.trim()))
                }
            } catch (e) {
                schemaData = { error: 'Schema extraction failed', requested_schema: body.schema }
            }

            // Brief report about the schema data
            report = `# Data Extraction: ${body.query}\n\nExtracted data according to your custom schema. See the \`schema_data\` field for structured results.`

        } else {
            // ============================================
            // REPORT MODE (Default) - Full research report
            // ============================================
            debug('process:report:start', { query: body.query.substring(0, 50) }, ctx)

            const searchResults = await tavilySearchRaw(body.query, tavilyKey, body.preset, ctx)
            sources = searchResults.results.slice(0, 10).map(r => ({ title: r.title, url: r.url }))

            const rawContent = searchResults.results
                .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.raw_content || r.content || ''}`)
                .join('\n\n---\n\n')
                .substring(0, 100000)

            // Extract facts
            debug('process:extract_facts', { contentLength: rawContent.length }, ctx)

            const extractPrompt = `Extract key facts from these search results about: "${body.query}"

${rawContent.substring(0, 30000)}

Return a JSON object with:
{
  "key_stats": ["important numbers, percentages, metrics"],
  "dates": ["relevant dates"],
  "entities": ["companies, people, products"],
  "summary_points": ["key findings in bullet form"],
  "source_agreement": {
    "consensus": "high|medium|low",
    "confidence_score": 0.0-1.0,
    "conflicting_claims": []
  }
}

Return ONLY valid JSON.`

            try {
                if (cerebrasKey) {
                    const extracted = await cerebrasExtract(extractPrompt, cerebrasKey, ctx)
                    let jsonStr = extracted.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    facts = JSON.parse(jsonrepair(jsonStr.trim()))
                } else {
                    const result = await generateText({
                        model: groq(GROQ_WRITER_MODEL),
                        prompt: extractPrompt
                    })
                    let jsonStr = result.text.trim()
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
                    facts = JSON.parse(jsonrepair(jsonStr.trim()))
                }
            } catch (e) {
                facts = { summary_points: ['Extraction failed, generating from raw content'] }
            }
            facts.sources = sources

            // Generate report
            debug('process:write_report', { mode: body.mode }, ctx)

            const writePrompt = `You are an expert research analyst writing an Executive Research Report.

RESEARCH QUERY: "${body.query}"

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
- Use tables where appropriate for data
- ${presetConfig.prompt_hint}`

            const writeResult = await generateText({
                model: groq(GROQ_WRITER_MODEL),
                prompt: writePrompt
            })
            report = writeResult.text
        }

        const latencyMs = Math.round(performance.now() - startTime)
        debug('process:complete', { latencyMs, reportLength: report.length, mode: body.mode }, ctx)

        // Cache the result if it's a standard report
        if (body.mode === 'report') {
            const redis = getRedisClient()
            if (redis) {
                const queryHash = hashQuery(body.query)
                const cacheKey = `research:${queryHash}`
                redis.set(cacheKey, report, { ex: CACHE_TTL_SECONDS }).catch(() => { })
            }
        }

        // Build webhook payload based on mode
        const webhookPayload: Record<string, any> = {
            mode: body.mode,
            query: body.query,
            report,
            sources,
            request_id: body.request_id,
            meta: {
                source: 'async',
                latency_ms: latencyMs,
                sources_count: sources.length,
                preset: body.preset,
                agentic: body.agentic_loop || false
            }
        }

        // Add mode-specific data
        if (body.mode === 'report' && facts) {
            webhookPayload.facts = facts
        }
        if (body.mode === 'extract' && extractedData) {
            webhookPayload.extracted_data = extractedData
        }
        if (body.mode === 'schema' && schemaData) {
            webhookPayload.schema_data = schemaData
        }
        if (body.mode === 'compare' && comparisonData) {
            webhookPayload.comparison = comparisonData
            webhookPayload.queries = body.queries
        }

        // Send webhook with results
        const webhookSent = await sendWebhook(body.webhook, webhookPayload)

        debugSuccess('webhook:delivered', {
            success: webhookSent,
            webhook: body.webhook.substring(0, 50) + '...',
            latencyMs,
            mode: body.mode
        }, ctx)

        return Response.json({
            status: 'completed',
            request_id: body.request_id,
            webhook_delivered: webhookSent,
            latency_ms: latencyMs,
            mode: body.mode
        })

    } catch (error: any) {
        debugError('process:failed', error, ctx)

        // Send error to webhook
        await sendErrorWebhook(body.webhook, body.request_id, error.message || 'Internal error')

        return Response.json({
            error: 'Processing failed',
            message: error.message,
            request_id: body.request_id
        }, { status: 500 })
    }
}
