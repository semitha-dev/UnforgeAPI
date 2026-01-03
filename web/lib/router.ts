/**
 * UnforgeAPI Router Brain - Hybrid Brain Approach
 * 
 * Classifies user intent into CHAT | CONTEXT | RESEARCH
 * 
 * Step 1: Speed Gate (Regex) - Catch obvious greetings instantly
 * Step 2: Router Brain (Groq LLM) - LLM decides CONTEXT vs RESEARCH
 */

import Groq from 'groq-sdk'

export type Intent = 'CHAT' | 'CONTEXT' | 'RESEARCH'

// ============================================
// ENHANCED DEBUG SYSTEM
// ============================================

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
const DEBUG_VERBOSE = process.env.DEBUG_VERBOSE === 'true'

interface DebugContext {
  requestId?: string
  startTime?: number
}

let globalRequestId = 0

function generateRequestId(): string {
  globalRequestId++
  return `router-${Date.now()}-${globalRequestId}`
}

function debug(tag: string, data: any, context?: DebugContext) {
  if (!DEBUG) return
  
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const reqId = context?.requestId || ''
  
  const prefix = `[Router:${tag}]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`
  
  if (DEBUG_VERBOSE) {
    console.log(`${timestamp} ${prefix}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
  }
}

function debugError(tag: string, error: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const reqId = context?.requestId || ''
  const prefix = `[Router:${tag}:ERROR]${reqId ? ` [${reqId}]` : ''}`
  
  console.error(`${timestamp} ${prefix}`, {
    message: error?.message || String(error),
    name: error?.name,
    stack: DEBUG_VERBOSE ? error?.stack : undefined,
    code: error?.code,
    status: error?.status,
    cause: error?.cause
  })
}

interface ClassificationResult {
  intent: Intent
  confidence: number
  reason: string
}

// ============================================
// ROUTER BRAIN SYSTEM PROMPT (Step 2)
// ============================================

const ROUTER_SYSTEM_PROMPT = `You are the Router Brain for an intelligent RAG API.
Your goal is to select the most efficient execution path for a user's query.

Your available paths:
1. CHAT: For casual conversation, compliments, or questions about you (the AI).
2. CONTEXT: The user provided specific "Context Data". Analyze if this data contains the answer to the user's query. If YES, select this path.
3. RESEARCH: The user is asking a factual question (news, stocks, definitions, history) that cannot be answered by the provided context.

Input:
- Query: {user_query}
- Context Data: {provided_context_string}

Output JSON only: { "intent": "CHAT" | "CONTEXT" | "RESEARCH", "reason": "brief explanation" }`

// ============================================
// STEP 1: SPEED GATE (Regex for greetings only)
// ============================================

const GREETING_PATTERNS = [
  /^(hi|hey|hello|greetings)(\s|!|,|$)/i,
  /^(thanks|thank\s*you)(\s|!|,|$)/i,
]

/**
 * Fast check for obvious greetings - saves latency by avoiding API call
 */
function isGreeting(query: string): boolean {
  const normalized = query.trim().toLowerCase()
  const isMatch = GREETING_PATTERNS.some(pattern => pattern.test(normalized))
  debug('isGreeting:check', { 
    query: normalized.substring(0, 50), 
    isMatch,
    patterns: GREETING_PATTERNS.map(p => p.toString())
  })
  return isMatch
}

// ============================================
// STEP 2: ROUTER BRAIN (Groq LLM)
// ============================================

/**
 * Classify user intent using Llama-3-8b-instant (fast & cheap)
 */
export async function classifyIntent(
  query: string,
  context: string | undefined,
  groqKey: string
): Promise<ClassificationResult> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('classifyIntent:start', { 
    queryLength: query.length, 
    queryPreview: query.substring(0, 100),
    hasContext: !!context,
    contextLength: context?.length || 0,
    contextPreview: context?.substring(0, 100),
    hasGroqKey: !!groqKey,
    groqKeyPrefix: groqKey?.substring(0, 8) + '...'
  }, ctx)
  
  // ============================================
  // STEP 1: Speed Gate (Regex)
  // ============================================
  debug('speedGate:checking', { query: query.substring(0, 50) }, ctx)
  
  if (isGreeting(query)) {
    const result = { intent: 'CHAT' as Intent, confidence: 0.95, reason: 'Matched greeting pattern (Speed Gate)' }
    debug('speedGate:matched', { 
      result,
      latencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    return result
  }
  
  debug('speedGate:noMatch', { proceedingToLLM: true }, ctx)
  
  // ============================================
  // STEP 2: Router Brain (LLM)
  // ============================================
  debug('routerBrain:init', { 
    model: 'llama-3.1-8b-instant',
    groqKeyValid: groqKey?.length > 10
  }, ctx)
  
  const groq = new Groq({ apiKey: groqKey })

  // Build the classification prompt
  const contextString = context && context.length > 0
    ? context.substring(0, 2000) // Limit to prevent token overflow
    : '(No context provided)'
  
  const userMessage = `Query: "${query}"
Context Data: "${contextString}"`

  debug('routerBrain:prompt', { 
    userMessageLength: userMessage.length,
    contextTruncated: context ? context.length > 2000 : false
  }, ctx)

  try {
    debug('routerBrain:llmCall:start', { model: 'llama-3.1-8b-instant' }, ctx)
    const llmStartTime = performance.now()
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' }
    })

    const llmLatency = Math.round(performance.now() - llmStartTime)
    debug('routerBrain:llmCall:complete', { 
      llmLatencyMs: llmLatency,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    }, ctx)

    const responseText = completion.choices[0]?.message?.content || '{}'
    debug('routerBrain:rawResponse', { 
      responseText: responseText.substring(0, 500),
      responseLength: responseText.length
    }, ctx)
    
    let parsed: any
    try {
      parsed = JSON.parse(responseText)
      debug('routerBrain:parsed', { parsed }, ctx)
    } catch (parseError) {
      debugError('routerBrain:parseError', parseError, ctx)
      debug('routerBrain:parseError:fallback', { defaultingTo: 'RESEARCH' }, ctx)
      parsed = { intent: 'RESEARCH', reason: 'Failed to parse LLM response' }
    }
    
    // Validate intent
    const validIntents: Intent[] = ['CHAT', 'CONTEXT', 'RESEARCH']
    const intent: Intent = validIntents.includes(parsed.intent) 
      ? parsed.intent 
      : 'RESEARCH'
    
    if (!validIntents.includes(parsed.intent)) {
      debug('routerBrain:invalidIntent', { 
        receivedIntent: parsed.intent,
        validIntents,
        defaultingTo: 'RESEARCH'
      }, ctx)
    }
    
    const result: ClassificationResult = {
      intent,
      confidence: 0.85,
      reason: parsed.reason || 'LLM classification'
    }
    
    debug('classifyIntent:result', { 
      result,
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return result
  } catch (error: any) {
    debugError('classifyIntent:llmError', error, ctx)
    
    debug('classifyIntent:fallback:start', { 
      hasContext: !!context,
      contextLength: context?.length || 0
    }, ctx)
    
    // Fallback logic: If context provided, assume answer exists there
    if (context && context.length > 0) {
      const result = { intent: 'CONTEXT' as Intent, confidence: 0.6, reason: 'Fallback: context provided, assuming answer exists' }
      debug('classifyIntent:fallback:result', { result, reason: 'error + context provided' }, ctx)
      return result
    }
    
    const result = { intent: 'RESEARCH' as Intent, confidence: 0.5, reason: 'Fallback: no context, defaulting to research' }
    debug('classifyIntent:fallback:result', { result, reason: 'error + no context' }, ctx)
    return result
  }
}

/**
 * Generate chat response (greetings, small talk, or company representative)
 * When context is provided, AI acts as the company's representative
 */
export async function generateChat(query: string, groqKey: string, context?: string): Promise<string> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('generateChat:start', { 
    queryLength: query.length,
    queryPreview: query.substring(0, 100),
    hasGroqKey: !!groqKey,
    hasContext: !!context,
    contextLength: context?.length || 0
  }, ctx)
  
  try {
    const groq = new Groq({ apiKey: groqKey })
    
    // Dynamic system prompt based on whether context is provided
    let systemPrompt: string
    
    if (context) {
      // When context is provided, roleplay as the company's AI assistant
      systemPrompt = `You are an AI assistant representing the company described below. Stay in character at all times.

CRITICAL RULES:
- You ARE the company's AI assistant, NOT a generic AI or language model
- NEVER say "I'm just an AI" or "I'm a language model" - you represent THIS company
- If asked about "the company" or "you", refer to the company information below
- Be professional, helpful, and on-brand for the company
- If information isn't in the context, say "I don't have that specific information, but I can connect you with our team"

COMPANY CONTEXT:
${context}

Respond naturally as this company's AI representative.`
    } else {
      // Default friendly assistant for simple greetings
      systemPrompt = 'You are a friendly AI assistant. Keep responses brief and natural for casual conversation.'
    }
    
    debug('generateChat:llmCall:start', { model: 'llama-3.1-8b-instant', hasCompanyContext: !!context }, ctx)
    const llmStartTime = performance.now()
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: context ? 500 : 150 // Allow longer responses when representing a company
    })

    const llmLatency = Math.round(performance.now() - llmStartTime)
    debug('generateChat:llmCall:complete', { 
      llmLatencyMs: llmLatency,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    }, ctx)

    const response = completion.choices[0]?.message?.content || 'Hello! How can I help you today?'
    
    debug('generateChat:complete', { 
      responseLength: response.length,
      responsePreview: response.substring(0, 100),
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return response
  } catch (error: any) {
    debugError('generateChat:error', error, ctx)
    const fallbackResponse = 'Hello! How can I help you today?'
    debug('generateChat:fallback', { response: fallbackResponse }, ctx)
    return fallbackResponse
  }
}

/**
 * Generate response from provided context (RAG without search)
 */
export async function generateFromContext(
  query: string,
  context: string,
  groqKey: string
): Promise<string> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('generateFromContext:start', { 
    queryLength: query.length,
    queryPreview: query.substring(0, 100),
    contextLength: context.length,
    contextPreview: context.substring(0, 200),
    hasGroqKey: !!groqKey
  }, ctx)
  
  try {
    const groq = new Groq({ apiKey: groqKey })
    
    const systemPrompt = `Answer the user's question using ONLY the provided context. If the answer is not in the context, say so clearly.

Context:
${context}`

    debug('generateFromContext:llmCall:start', { 
      model: 'llama-3.1-8b-instant',
      systemPromptLength: systemPrompt.length
    }, ctx)
    const llmStartTime = performance.now()
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const llmLatency = Math.round(performance.now() - llmStartTime)
    debug('generateFromContext:llmCall:complete', { 
      llmLatencyMs: llmLatency,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    }, ctx)

    const response = completion.choices[0]?.message?.content || 'I could not find an answer in the provided context.'
    
    debug('generateFromContext:complete', { 
      responseLength: response.length,
      responsePreview: response.substring(0, 200),
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return response
  } catch (error: any) {
    debugError('generateFromContext:error', error, ctx)
    const fallbackResponse = 'I could not find an answer in the provided context.'
    debug('generateFromContext:fallback', { response: fallbackResponse }, ctx)
    return fallbackResponse
  }
}

/**
 * Search the web using Tavily
 */
export async function tavilySearch(
  query: string,
  tavilyKey: string
): Promise<Array<{ title: string; url: string; content: string }>> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('tavilySearch:start', { 
    query: query.substring(0, 100),
    queryLength: query.length,
    hasTavilyKey: !!tavilyKey,
    tavilyKeyPrefix: tavilyKey?.substring(0, 8) + '...'
  }, ctx)
  
  try {
    debug('tavilySearch:request:start', { 
      url: 'https://api.tavily.com/search',
      searchDepth: 'basic',
      maxResults: 5
    }, ctx)
    const searchStartTime = performance.now()
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false
      })
    })

    const searchLatency = Math.round(performance.now() - searchStartTime)
    debug('tavilySearch:request:complete', { 
      searchLatencyMs: searchLatency,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    }, ctx)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error body')
      debugError('tavilySearch:httpError', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText.substring(0, 500)
      }, ctx)
      throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    debug('tavilySearch:response:raw', { 
      hasResults: !!data.results,
      resultCount: data.results?.length || 0,
      responseKeys: Object.keys(data)
    }, ctx)
    
    const results = (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content
    }))
    
    debug('tavilySearch:complete', { 
      resultCount: results.length,
      results: results.map((r: any) => ({ title: r.title, url: r.url, contentLength: r.content?.length })),
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return results
  } catch (error: any) {
    debugError('tavilySearch:error', error, ctx)
    throw error
  }
}

/**
 * Synthesize answer from search results using Llama-70b
 */
export async function synthesizeAnswer(
  query: string,
  searchResults: Array<{ title: string; url: string; content: string }>,
  groqKey: string
): Promise<{ answer: string; sources: Array<{ title: string; url: string }> }> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('synthesizeAnswer:start', { 
    queryLength: query.length,
    queryPreview: query.substring(0, 100),
    resultCount: searchResults.length,
    hasGroqKey: !!groqKey,
    sources: searchResults.map(r => ({ title: r.title, url: r.url }))
  }, ctx)
  
  try {
    const groq = new Groq({ apiKey: groqKey })
    
    const sourcesContext = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
      .join('\n\n')

    const systemPrompt = `You are a research assistant. Answer the query using the search results provided. Be accurate and cite sources when relevant.

Search Results:
${sourcesContext}`

    debug('synthesizeAnswer:llmCall:start', { 
      model: 'llama-3.3-70b-versatile',
      systemPromptLength: systemPrompt.length,
      sourcesContextLength: sourcesContext.length
    }, ctx)
    const llmStartTime = performance.now()

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.4,
      max_tokens: 800
    })

    const llmLatency = Math.round(performance.now() - llmStartTime)
    debug('synthesizeAnswer:llmCall:complete', { 
      llmLatencyMs: llmLatency,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    }, ctx)

    const answer = completion.choices[0]?.message?.content || 'Unable to synthesize an answer.'
    
    const result = {
      answer,
      sources: searchResults.map(r => ({ title: r.title, url: r.url }))
    }
    
    debug('synthesizeAnswer:complete', { 
      answerLength: answer.length,
      answerPreview: answer.substring(0, 200),
      sourceCount: result.sources.length,
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return result
  } catch (error: any) {
    debugError('synthesizeAnswer:error', error, ctx)
    const fallbackResult = {
      answer: 'Unable to synthesize an answer.',
      sources: searchResults.map(r => ({ title: r.title, url: r.url }))
    }
    debug('synthesizeAnswer:fallback', { result: fallbackResult }, ctx)
    return fallbackResult
  }
}
