/**
 * Query Classifier - Hybrid Brain Approach
 * 
 * UnforgeAPI Router for B2B API Service
 * 
 * Classifies queries into:
 * - CHAT: Greetings, thanks, casual conversation
 * - CONTEXT: Answer exists in provided context data (Local RAG)
 * - RESEARCH: Questions needing external factual data
 * 
 * Approach:
 * 1. Speed Gate: Regex for obvious greetings (instant, no API call)
 * 2. Router Brain: Groq LLM decides CONTEXT vs RESEARCH
 */

import Groq from 'groq-sdk'

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
  return `classifier-${Date.now()}-${globalRequestId}`
}

function debug(tag: string, data: any, context?: DebugContext) {
  if (!DEBUG) return
  
  const timestamp = new Date().toISOString()
  const elapsed = context?.startTime ? `+${Math.round(performance.now() - context.startTime)}ms` : ''
  const reqId = context?.requestId || ''
  
  const prefix = `[QueryClassifier:${tag}]${reqId ? ` [${reqId}]` : ''}${elapsed ? ` ${elapsed}` : ''}`
  
  if (DEBUG_VERBOSE) {
    console.log(`${timestamp} ${prefix}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${timestamp} ${prefix}`, typeof data === 'object' ? JSON.stringify(data) : data)
  }
}

function debugError(tag: string, error: any, context?: DebugContext) {
  const timestamp = new Date().toISOString()
  const reqId = context?.requestId || ''
  const prefix = `[QueryClassifier:${tag}:ERROR]${reqId ? ` [${reqId}]` : ''}`
  
  console.error(`${timestamp} ${prefix}`, {
    message: error?.message || String(error),
    name: error?.name,
    stack: DEBUG_VERBOSE ? error?.stack : undefined,
    code: error?.code,
    status: error?.status,
    cause: error?.cause
  })
}

// ============================================
// TYPES
// ============================================

export type Intent = 'CHAT' | 'CONTEXT' | 'RESEARCH'

// Legacy alias for backward compatibility
export type ClassificationPath = Intent

export interface ClassificationResult {
  intent: Intent
  confidence: number
  reason: string
}

// ============================================
// ROUTER BRAIN SYSTEM PROMPT
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
 * Fast check for obvious greetings
 * Saves latency by avoiding API call
 */
function isGreeting(query: string): boolean {
  const normalized = query.trim().toLowerCase()
  const isMatch = GREETING_PATTERNS.some(pattern => pattern.test(normalized))
  debug('isGreeting:check', { 
    query: normalized.substring(0, 50), 
    isMatch 
  })
  return isMatch
}

// ============================================
// STEP 2: ROUTER BRAIN (Groq LLM)
// ============================================

/**
 * Use Groq's Llama-3-8b-instant to classify intent
 */
async function routerBrain(
  query: string,
  context: string | undefined,
  groqKey: string
): Promise<ClassificationResult> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  debug('routerBrain:start', {
    queryLength: query.length,
    queryPreview: query.substring(0, 100),
    hasContext: !!context,
    contextLength: context?.length || 0,
    hasGroqKey: !!groqKey
  }, ctx)
  
  const groq = new Groq({ apiKey: groqKey })
  
  // Build user message with query and context
  const contextString = context && context.length > 0 
    ? context.substring(0, 2000) // Limit context to prevent token overflow
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
      temperature: 0.1, // Low temp for consistent classification
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
    debug('routerBrain:rawResponse', { responseText }, ctx)
    
    let parsed: any
    try {
      parsed = JSON.parse(responseText)
      debug('routerBrain:parsed', { parsed }, ctx)
    } catch (parseError) {
      debugError('routerBrain:parseError', parseError, ctx)
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
        defaultingTo: 'RESEARCH'
      }, ctx)
    }
    
    const result: ClassificationResult = {
      intent,
      confidence: 0.85,
      reason: parsed.reason || 'LLM classification'
    }
    
    debug('routerBrain:result', {
      result,
      totalLatencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    
    return result
  } catch (error: any) {
    debugError('routerBrain:error', error, ctx)
    
    // Fallback: If we have context, assume CONTEXT path; otherwise RESEARCH
    if (context && context.length > 0) {
      const result = { 
        intent: 'CONTEXT' as Intent, 
        confidence: 0.6, 
        reason: 'Fallback: context provided, assuming answer exists' 
      }
      debug('routerBrain:fallback', { result, reason: 'error + context' }, ctx)
      return result
    }
    
    const result = { 
      intent: 'RESEARCH' as Intent, 
      confidence: 0.5, 
      reason: 'Fallback: no context, defaulting to research' 
    }
    debug('routerBrain:fallback', { result, reason: 'error + no context' }, ctx)
    return result
  }
}

// ============================================
// MAIN CLASSIFICATION FUNCTION
// ============================================

/**
 * Classify a query using the Hybrid Brain approach
 * 
 * @param query - User's input query
 * @param options - Classification options
 * @returns Classification result with intent, confidence, and reason
 * 
 * Flow:
 * 1. Speed Gate: Check for greetings (regex) -> CHAT
 * 2. Router Brain: LLM decides CONTEXT vs RESEARCH
 */
export async function classifyQuery(
  query: string,
  options: {
    context?: string
    groqKey?: string
  } = {}
): Promise<ClassificationResult> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  const normalizedQuery = query.trim()
  
  debug('classifyQuery:start', {
    queryLength: normalizedQuery.length,
    queryPreview: normalizedQuery.substring(0, 100),
    hasContext: !!options.context,
    contextLength: options.context?.length || 0,
    hasGroqKey: !!options.groqKey,
    hasEnvGroqKey: !!process.env.GROQ_API_KEY
  }, ctx)
  
  // ============================================
  // STEP 1: Speed Gate (Regex)
  // ============================================
  debug('speedGate:checking', { query: normalizedQuery.substring(0, 50) }, ctx)
  
  if (isGreeting(normalizedQuery)) {
    const result: ClassificationResult = {
      intent: 'CHAT',
      confidence: 0.95,
      reason: 'Matched greeting pattern (Speed Gate)',
    }
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
  const groqKey = options.groqKey || process.env.GROQ_API_KEY
  
  if (!groqKey) {
    // No API key - use simple heuristic fallback
    debug('classifyQuery:noGroqKey', { usingFallback: true }, ctx)
    console.warn('[QueryClassifier] No GROQ_API_KEY, using fallback heuristic')
    const result = fallbackClassification(normalizedQuery, options.context)
    debug('classifyQuery:fallbackResult', {
      result,
      latencyMs: Math.round(performance.now() - startTime)
    }, ctx)
    return result
  }
  
  debug('classifyQuery:routerBrain:start', { hasGroqKey: true }, ctx)
  const result = await routerBrain(normalizedQuery, options.context, groqKey)
  
  debug('classifyQuery:complete', {
    result,
    totalLatencyMs: Math.round(performance.now() - startTime)
  }, ctx)
  
  return result
}

/**
 * Initialize classifier (no-op, kept for API compatibility)
 */
export async function initializeClassifier(): Promise<boolean> {
  return true
}

// ============================================
// FALLBACK (No API Key)
// ============================================

/**
 * Simple fallback when no Groq API key is available
 */
function fallbackClassification(
  query: string,
  context?: string
): ClassificationResult {
  debug('fallbackClassification:start', {
    queryLength: query.length,
    hasContext: !!context,
    contextLength: context?.length || 0
  })
  
  // If context is provided and query seems to reference it
  if (context && context.length > 0) {
    // Simple keyword check - if query asks about something potentially in context
    const contextKeywords = context.toLowerCase().split(/\s+/).slice(0, 50)
    const queryWords = query.toLowerCase().split(/\s+/)
    const overlap = queryWords.filter(word => 
      word.length > 3 && contextKeywords.includes(word)
    )
    
    debug('fallbackClassification:keywordCheck', {
      queryWords: queryWords.length,
      contextKeywords: contextKeywords.length,
      overlapCount: overlap.length,
      overlapWords: overlap
    })
    
    if (overlap.length >= 2) {
      const result: ClassificationResult = {
        intent: 'CONTEXT',
        confidence: 0.7,
        reason: 'Fallback: query keywords found in context'
      }
      debug('fallbackClassification:result', { result, method: 'keyword overlap' })
      return result
    }
  }
  
  // Default to RESEARCH
  const result: ClassificationResult = {
    intent: 'RESEARCH',
    confidence: 0.6,
    reason: 'Fallback: defaulting to research'
  }
  debug('fallbackClassification:result', { result, method: 'default' })
  return result
}

// ============================================
// PRE-GENERATED CHAT RESPONSES
// ============================================

export function getChatResponse(query: string): string | undefined {
  const q = query.toLowerCase().trim()
  
  // Greetings
  if (/^(hi|hey|hello|greetings)(\s|!|,|$)/i.test(q)) {
    return "Hello! 👋 How can I help you today?"
  }
  
  // Thanks
  if (/^(thanks|thank\s*you)/i.test(q)) {
    return "You're welcome! Let me know if there's anything else I can help with. 🙌"
  }
  
  return undefined
}
