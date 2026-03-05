/**
 * UnforgeAPI - Streaming Chat Endpoint
 * POST /api/v1/chat/stream
 *
 * Server-Sent Events (SSE) streaming endpoint
 * Streams tokens in real-time for better UX
 */

import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { Redis } from '@upstash/redis'
import { isPriorityPlan, type ApiPlan } from '@/lib/subscription-constants'

// ============================================
// TYPES
// ============================================

interface StreamRequestBody {
  query: string
  context?: string
  system_prompt?: string
  force_intent?: 'CHAT' | 'CONTEXT' | 'RESEARCH'
  temperature?: number
  max_tokens?: number
}

interface UnkeyVerifyResult {
  valid: boolean
  code?: string
  meta?: Record<string, any>
  keyId?: string
}

// ============================================
// HELPERS
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

async function verifyApiKey(key: string): Promise<UnkeyVerifyResult> {
  try {
    const unkeyRootKey = process.env.UNKEY_ROOT_KEY
    const response = await fetch('https://api.unkey.com/v2/keys.verifyKey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(unkeyRootKey && { 'Authorization': `Bearer ${unkeyRootKey}` })
      },
      body: JSON.stringify({ key })
    })

    const rawResult = await response.json()
    const result = rawResult.data || rawResult

    if (!response.ok) {
      return { valid: false, code: result.code || 'API_ERROR' }
    }

    return {
      valid: result.valid || false,
      code: result.code,
      meta: result.meta,
      keyId: result.keyId || result.id
    }
  } catch {
    return { valid: false, code: 'NETWORK_ERROR' }
  }
}

// ============================================
// STREAMING ENDPOINT
// ============================================

export async function POST(req: NextRequest) {
  const startTime = performance.now()

  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing API Key', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await verifyApiKey(token)

    if (!result.valid) {
      if (result.code === 'RATE_LIMITED') {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({ error: 'Invalid API Key', code: result.code || 'INVALID_API_KEY' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 2. PARSE REQUEST
    // ============================================
    let body: StreamRequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { query, context, system_prompt, force_intent, temperature, max_tokens } = body

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required field: query', code: 'INVALID_REQUEST' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (query.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Query too long (max 10000 characters)', code: 'QUERY_TOO_LONG' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 3. PRIORITY QUEUE CHECK
    // ============================================
    const plan = result.meta?.plan || result.meta?.tier || 'sandbox'
    const validPlanType = plan as ApiPlan
    const isPriority = isPriorityPlan(validPlanType)

    if (!isPriority) {
      const redis = getRedisClient()
      if (redis) {
        try {
          const freeUserLoadKey = 'system:free_user_load'
          const currentLoad = await redis.incr(freeUserLoadKey)

          if (currentLoad === 1) {
            await redis.expire(freeUserLoadKey, 60)
          }

          const FREE_USER_THROTTLE_THRESHOLD = 100
          if (currentLoad > FREE_USER_THROTTLE_THRESHOLD) {
            return new Response(
              JSON.stringify({
                error: 'System is currently busy. Paid users are prioritized during high traffic.',
                code: 'SYSTEM_BUSY',
                retry_after: 5
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            )
          }
        } catch {
          // Don't fail if load check fails
        }
      }
    }

    // ============================================
    // 4. GET API KEYS
    // ============================================
    const userGroqKey = req.headers.get('x-groq-key')
    const activeGroqKey = userGroqKey || process.env.GROQ_API_KEY

    if (!activeGroqKey) {
      return new Response(
        JSON.stringify({ error: 'No Groq API key available', code: 'MISSING_LLM_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 5. DETERMINE INTENT
    // ============================================
    let intent: 'CHAT' | 'CONTEXT' | 'RESEARCH' = force_intent || 'CHAT'

    if (!force_intent) {
      if (context && context.length > 0) {
        intent = 'CONTEXT'
      } else {
        // Simple heuristic for research intent
        const researchKeywords = ['latest', 'current', 'news', 'today', 'price', 'stock', 'weather', 'who is', 'what happened']
        const queryLower = query.toLowerCase()
        if (researchKeywords.some(kw => queryLower.includes(kw))) {
          intent = 'RESEARCH'
        }
      }
    }

    // Note: For streaming, we don't support RESEARCH intent with web search
    // as that requires multiple API calls and synthesis
    if (intent === 'RESEARCH') {
      return new Response(
        JSON.stringify({
          error: 'Streaming is not supported for RESEARCH intent. Use the regular /api/v1/chat endpoint instead.',
          code: 'STREAMING_NOT_SUPPORTED_FOR_RESEARCH',
          hint: 'Use force_intent: "CHAT" or "CONTEXT" for streaming, or use the non-streaming endpoint for research queries.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // 6. BUILD MESSAGES
    // ============================================
    const validTemperature = temperature !== undefined
      ? Math.max(0, Math.min(1, temperature))
      : 0.3

    const validMaxTokens = max_tokens !== undefined
      ? Math.max(50, Math.min(2000, max_tokens))
      : 600

    let systemPrompt: string

    if (system_prompt) {
      systemPrompt = context
        ? `${system_prompt}\n\nCONTEXT INFORMATION:\n${context}\n\nIMPORTANT: Prefer information from the context above.`
        : system_prompt
    } else if (context) {
      systemPrompt = `You are an AI assistant for the organization described below.

ANTI-HALLUCINATION RULES:
1. ONLY state facts that are explicitly in the context below
2. DO NOT invent names, titles, features, or organizational details
3. If information is NOT in the context, say "I don't have that specific information"
4. NEVER make up statistics, team members, products, or features

ORGANIZATION CONTEXT:
${context}

Be professional and helpful. Use "we" and "our" when referring to the organization.`
    } else {
      systemPrompt = 'You are a friendly AI assistant. Be helpful, accurate, and concise.'
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]

    // ============================================
    // 7. STREAM RESPONSE
    // ============================================
    const groq = new Groq({ apiKey: activeGroqKey })

    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: validTemperature,
      max_tokens: validMaxTokens,
      stream: true
    })

    // Create a TransformStream for SSE
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          const initEvent = {
            type: 'init',
            data: {
              intent,
              model: 'llama-3.1-8b-instant',
              temperature: validTemperature,
              max_tokens: validMaxTokens
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initEvent)}\n\n`))

          // Stream tokens
          let fullContent = ''
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              const tokenEvent = {
                type: 'token',
                data: { content }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(tokenEvent)}\n\n`))
            }
          }

          // Send completion event
          const latencyMs = Math.round(performance.now() - startTime)
          const doneEvent = {
            type: 'done',
            data: {
              full_content: fullContent,
              meta: {
                intent,
                routed_to: intent,
                cost_saving: intent === 'CHAT' || intent === 'CONTEXT',
                latency_ms: latencyMs,
                temperature_used: validTemperature,
                max_tokens_used: validMaxTokens
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`))
          controller.close()
        } catch (error: any) {
          const errorEvent = {
            type: 'error',
            data: {
              message: error.message || 'Stream error',
              code: 'STREAM_ERROR'
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
