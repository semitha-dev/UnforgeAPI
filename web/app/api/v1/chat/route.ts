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
  type GenerationOptions
} from '@/lib/router'

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

function debugError(tag: string, error: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const reqId = context?.requestId || ''
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const prefix = `[UnforgeAPI:${tag}:ERROR]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`
  
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
}

interface UnkeyVerifyResult {
  valid: boolean
  code?: string
  meta?: Record<string, any>
  keyId?: string
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
  
  // Fire and forget - don't await
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspaceId: data.workspaceId,
      keyId: data.keyId,
      intent: data.intent,
      latencyMs: data.latencyMs,
      query: data.query
    })
  }).then(response => {
    debug('logUsage:complete', { 
      status: response.status,
      ok: response.ok
    }, context)
  }).catch(err => {
    // Silent fail - usage logging shouldn't break the API
    debugError('logUsage', err, context)
  })
}

/**
 * Verify API key with Unkey (stateless)
 */
async function verifyApiKey(key: string, context?: DebugContext): Promise<UnkeyVerifyResult> {
  debug('verifyApiKey:start', { keyPrefix: key.substring(0, 10) + '...', keyLength: key.length }, context)
  
  const verifyStartTime = performance.now()
  
  try {
    const response = await fetch('https://api.unkey.dev/v1/keys.verifyKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })

    const verifyLatency = Math.round(performance.now() - verifyStartTime)
    
    const result = await response.json()
    debug('verifyApiKey:response', { 
      ok: response.ok,
      status: response.status,
      verifyLatencyMs: verifyLatency,
      valid: result.valid,
      code: result.code,
      hasMetadata: !!result.meta
    }, context)
    
    if (!response.ok) {
      debugError('verifyApiKey:httpError', { status: response.status, body: result }, context)
      return { valid: false, code: 'API_ERROR' }
    }

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
        maxTokens: body.max_tokens
      }, ctx)
    } catch (parseError: any) {
      debugError('request:parseError', parseError, ctx)
      return Response.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }
    
    const { query, context, history, system_prompt, force_intent, temperature, max_tokens } = body

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
    const tier = result.meta?.tier || 'sandbox'
    const isByokTier = tier === 'byok'
    
    debug('tier:check', { tier, isByokTier }, ctx)

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
        maxTokens: validMaxTokens
      }, ctx)
      const pathStartTime = performance.now()
      
      if (!context) {
        debug('path:context:noContext', { fallbackToResearch: false }, ctx)
        answer = 'No context was provided to answer your question.'
      } else {
        // Build generation options
        const genOptions: GenerationOptions = {
          history,
          system_prompt,
          temperature: validTemperature,
          max_tokens: validMaxTokens
        }
        
        try {
          answer = await generateFromContext(query, context, activeGroqKey, genOptions)
          
          // GUARDRAIL: Check if AI broke character (only if no custom system_prompt)
          if (!system_prompt && didBreakCharacter(answer)) {
            debug('path:context:guardrail:triggered', { 
              reason: 'AI broke character, retrying with stronger prompt'
            }, ctx)
            
            // Retry with explicit correction
            const retryPrompt = `IMPORTANT: The user is interacting with YOUR company's AI assistant. DO NOT say you are "just an AI" or a "language model". You represent the organization in the context. Now answer naturally as their representative: ${query}`
            answer = await generateFromContext(retryPrompt, context, activeGroqKey, genOptions)
            
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
        isByokTier, 
        hasUserTavilyKey: !!userTavilyKey,
        hasActiveTavilyKey: !!activeTavilyKey
      }, ctx)
      const pathStartTime = performance.now()
      
      // Safety Check: If BYOK tier and no Tavily key, reject
      // Do not burn OUR Tavily credits for BYOK users
      if (isByokTier && !userTavilyKey) {
        debug('path:research:rejected', { reason: 'BYOK_MISSING_KEY' }, ctx)
        return Response.json(
          { 
            error: 'Research intent requires x-tavily-key header for BYOK tier',
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
    
    debug('response:success', { 
      intent,
      classifiedIntent: classification.intent,
      forcedIntent: force_intent,
      latencyMs, 
      answerLength: answer.length,
      hasSources: !!sources,
      sourceCount: sources?.length || 0,
      temperatureUsed: validTemperature ?? 0.3,
      maxTokensUsed: validMaxTokens ?? 600
    }, ctx)

    // Log usage (fire-and-forget)
    logUsage({
      workspaceId: result.meta?.workspaceId,
      keyId: result.keyId,
      intent,
      latencyMs,
      query
    }, ctx)

    return Response.json({
      answer,
      meta
    })

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

// ============================================
// HEALTH CHECK
// ============================================
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'UnforgeAPI',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/v1/chat'
    }
  })
}
