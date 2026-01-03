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
// GUARDRAIL: Detect if AI broke character
// ============================================

const CHARACTER_BREAK_PATTERNS = [
  /i('m| am) (just )?(a|an) (large )?language model/i,
  /i('m| am) (just )?(a|an) ai (assistant|model|program|system)/i,
  /i don'?t have (a )?(physical|real) (body|form|presence)/i,
  /as (a|an) ai,? i (don'?t|cannot|can'?t)/i,
  /i('m| am) not (a )?(real|actual) (person|human|company)/i,
  /i('m| am) (a )?software (program|application)/i,
  /i don'?t have (feelings|emotions|consciousness)/i,
  /i('m| am) not affiliated with any (company|organization)/i,
]

/**
 * Check if the AI response broke character (said it's just an AI)
 */
export function didBreakCharacter(response: string): boolean {
  const normalized = response.toLowerCase()
  return CHARACTER_BREAK_PATTERNS.some(pattern => pattern.test(normalized))
}

// ============================================
// ROUTER BRAIN SYSTEM PROMPT (Step 2)
// ============================================

const ROUTER_SYSTEM_PROMPT = `You are the Router Brain for an intelligent RAG API.
Your goal is to select the most efficient execution path for a user's query.

Your available paths:
1. CHAT: ONLY for simple greetings like "hi", "hello", "thanks" when NO context is provided.
2. CONTEXT: The user provided specific "Context Data". If ANY context is provided, prefer this path.
3. RESEARCH: The user is asking a factual question (news, stocks, current events) that requires web search.

IMPORTANT: If Context Data is provided, almost ALWAYS choose CONTEXT unless the query explicitly needs current web information.

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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerationOptions {
  history?: ChatMessage[]
  system_prompt?: string  // Custom system prompt override
  temperature?: number    // 0.0 - 1.0
  max_tokens?: number     // Max response tokens
  // Enterprise features
  strict_mode?: boolean   // Enforce system prompt as hard constraints
  grounded_only?: boolean // Only use context, refuse if not found
  citation_mode?: boolean // Return which parts of context were used
}

export interface GenerationResult {
  answer: string
  confidence_score: number      // 0.0 - 1.0
  citations?: string[]          // Excerpts from context used
  grounded: boolean             // Whether answer is grounded in context
  refusal?: {                   // Present if strict_mode blocked
    reason: string
    violated_instruction: string
  }
}

/**
 * Generate response from provided context (RAG without search)
 * Enterprise-ready with strict_mode, grounded_only, citation_mode, and confidence scoring
 */
export async function generateFromContext(
  query: string,
  context: string,
  groqKey: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const requestId = generateRequestId()
  const startTime = performance.now()
  const ctx: DebugContext = { requestId, startTime }
  
  const { history, system_prompt, temperature, max_tokens, strict_mode, grounded_only, citation_mode } = options || {}
  
  debug('generateFromContext:start', { 
    queryLength: query.length,
    queryPreview: query.substring(0, 100),
    contextLength: context.length,
    contextPreview: context.substring(0, 200),
    hasGroqKey: !!groqKey,
    hasHistory: !!history,
    historyLength: history?.length || 0,
    hasCustomSystemPrompt: !!system_prompt,
    customTemperature: temperature,
    customMaxTokens: max_tokens,
    strictMode: strict_mode,
    groundedOnly: grounded_only,
    citationMode: citation_mode
  }, ctx)
  
  try {
    const groq = new Groq({ apiKey: groqKey })
    
    // STRICT MODE: Check if query violates system prompt instructions
    if (strict_mode && system_prompt) {
      const violationCheck = await checkStrictModeViolation(query, system_prompt, context, groqKey)
      if (violationCheck.violated) {
        debug('generateFromContext:strictMode:violation', { 
          reason: violationCheck.reason,
          violatedInstruction: violationCheck.instruction
        }, ctx)
        return {
          answer: `I cannot answer this question as it falls outside my allowed scope.`,
          confidence_score: 1.0,
          grounded: true,
          refusal: {
            reason: violationCheck.reason,
            violated_instruction: violationCheck.instruction
          }
        }
      }
    }
    
    // Check if context is too minimal (less than 50 chars)
    const isMinimalContext = context.length < 50
    
    // Build system prompt based on mode
    let systemPrompt: string
    
    if (grounded_only) {
      // GROUNDED ONLY MODE: Very strict - only answer from context
      systemPrompt = `You are a strictly grounded AI assistant. You can ONLY provide information that is EXPLICITLY stated in the context below.

${system_prompt ? `PERSONA INSTRUCTIONS:\n${system_prompt}\n\n` : ''}CONTEXT:
${context}

CRITICAL GROUNDING RULES:
1. ONLY answer using information that is EXPLICITLY written in the context above
2. If the answer is NOT in the context, respond EXACTLY with: "I don't have that information in my knowledge base."
3. DO NOT infer, assume, or extrapolate beyond what is explicitly stated
4. DO NOT use general knowledge - ONLY the context
5. DO NOT make up names, features, statistics, or any details
6. If partially answerable, only state what IS in context and say "I don't have additional details on that."

You must be 100% grounded. When in doubt, say you don't have that information.`
    } else if (system_prompt) {
      // Custom system prompt with context appended
      systemPrompt = `${system_prompt}

CONTEXT INFORMATION:
${context}

IMPORTANT: Prefer information from the context above. Do not make up specific facts not in the context.`
    } else if (isMinimalContext) {
      // Minimal context mode
      systemPrompt = `You are a helpful AI assistant. The user has provided minimal context about your purpose:

"${context}"

CRITICAL RULES:
1. Be helpful and conversational
2. DO NOT invent names for yourself - just say "I'm an AI assistant" if asked
3. DO NOT invent organizational details, titles, or features
4. DO NOT hallucinate information not provided
5. If you don't know something, say "I don't have that information"
6. Answer based only on what's in the context or general knowledge

Be helpful but honest about your limitations.`
    } else {
      // Rich context - standard mode
      systemPrompt = `You are an AI assistant for the organization described below.

ANTI-HALLUCINATION RULES:
1. ONLY state facts that are explicitly in the context below
2. DO NOT invent names, titles, features, or organizational details
3. If asked your name and it's not in context, say "I'm the AI assistant for [organization name from context]"
4. If information is NOT in the context, say "I don't have that specific information in my knowledge base"
5. NEVER make up statistics, team members, products, or features
6. When uncertain, ask clarifying questions instead of guessing

ORGANIZATION CONTEXT:
${context}

CONVERSATION STYLE:
- Be professional and helpful
- Use "we" and "our" when referring to the organization IF the context describes one
- Stay grounded in the provided context only`
    }

    // Build messages array with history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ]
    
    // Add conversation history if provided
    if (history && history.length > 0) {
      const recentHistory = history.slice(-10)
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }
    
    // Add current query
    messages.push({ role: 'user', content: query })

    debug('generateFromContext:llmCall:start', { 
      model: 'llama-3.1-8b-instant',
      systemPromptLength: systemPrompt.length,
      totalMessages: messages.length,
      isMinimalContext,
      usingCustomPrompt: !!system_prompt,
      temperature: temperature ?? 0.3,
      maxTokens: max_tokens ?? 600,
      strictMode: strict_mode,
      groundedOnly: grounded_only
    }, ctx)
    const llmStartTime = performance.now()
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: grounded_only ? 0.1 : (temperature ?? 0.3),
      max_tokens: max_tokens ?? 600
    })

    const llmLatency = Math.round(performance.now() - llmStartTime)
    debug('generateFromContext:llmCall:complete', { 
      llmLatencyMs: llmLatency,
      finishReason: completion.choices[0]?.finish_reason,
      usage: completion.usage
    }, ctx)

    const response = completion.choices[0]?.message?.content || 'I could not find an answer in the provided context.'
    
    // Calculate confidence score
    const confidenceScore = calculateConfidence(response, context, grounded_only)
    
    // Extract citations if citation_mode is enabled
    let citations: string[] | undefined
    if (citation_mode) {
      citations = extractCitations(response, context)
    }
    
    // Check if response is grounded
    const isGrounded = checkGrounding(response, context)
    
    debug('generateFromContext:complete', { 
      responseLength: response.length,
      responsePreview: response.substring(0, 200),
      totalLatencyMs: Math.round(performance.now() - startTime),
      confidenceScore,
      citationCount: citations?.length || 0,
      isGrounded
    }, ctx)
    
    return {
      answer: response,
      confidence_score: confidenceScore,
      citations,
      grounded: isGrounded
    }
  } catch (error: any) {
    debugError('generateFromContext:error', error, ctx)
    return {
      answer: 'I could not find an answer in the provided context.',
      confidence_score: 0,
      grounded: false
    }
  }
}

/**
 * Check if query violates strict mode instructions
 */
async function checkStrictModeViolation(
  query: string,
  systemPrompt: string,
  context: string,
  groqKey: string
): Promise<{ violated: boolean; reason: string; instruction: string }> {
  try {
    const groq = new Groq({ apiKey: groqKey })
    
    const checkPrompt = `You are a policy checker. Analyze if the user's query violates any instructions in the system prompt.

SYSTEM PROMPT INSTRUCTIONS:
${systemPrompt}

CONTEXT SCOPE:
${context.substring(0, 500)}...

USER QUERY:
${query}

Respond in JSON format only:
{
  "violated": true/false,
  "reason": "Brief explanation if violated, empty string if not",
  "instruction": "The specific instruction violated, empty string if not"
}

Only respond with the JSON, no other text.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: checkPrompt }],
      temperature: 0,
      max_tokens: 200
    })
    
    const response = completion.choices[0]?.message?.content || '{}'
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        violated: parsed.violated === true,
        reason: parsed.reason || '',
        instruction: parsed.instruction || ''
      }
    }
    
    return { violated: false, reason: '', instruction: '' }
  } catch (error) {
    // On error, don't block - fail open
    return { violated: false, reason: '', instruction: '' }
  }
}

/**
 * Calculate confidence score based on response and context
 */
function calculateConfidence(response: string, context: string, isGroundedMode?: boolean): number {
  let confidence = 0.5
  
  // Check for "I don't have" or "not in context" phrases (high confidence in admission)
  const admissionPhrases = [
    "i don't have that information",
    "not in my knowledge base",
    "i cannot find",
    "not available in the context",
    "i don't have specific",
    "i'm not able to"
  ]
  
  const responseLower = response.toLowerCase()
  if (admissionPhrases.some(phrase => responseLower.includes(phrase))) {
    return 0.95
  }
  
  // Check how many context words appear in response
  const contextWords = context.toLowerCase().split(/\s+/).filter(w => w.length > 4)
  const responseWords = response.toLowerCase().split(/\s+/)
  
  let matchCount = 0
  for (const word of contextWords) {
    if (responseWords.some(rw => rw.includes(word) || word.includes(rw))) {
      matchCount++
    }
  }
  
  const overlapRatio = contextWords.length > 0 ? matchCount / contextWords.length : 0
  confidence += overlapRatio * 0.4
  
  if (isGroundedMode && !responseLower.includes('might') && !responseLower.includes('perhaps')) {
    confidence += 0.1
  }
  
  return Math.min(0.95, Math.max(0.1, confidence))
}

/**
 * Extract citations from response that match context
 */
function extractCitations(response: string, context: string): string[] {
  const citations: string[] = []
  const contextChunks = context.split(/[.!?\n]+/).filter(chunk => chunk.trim().length > 20)
  
  for (const chunk of contextChunks) {
    const chunkWords = chunk.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    const responseWords = response.toLowerCase()
    
    const matchedWords = chunkWords.filter(word => responseWords.includes(word))
    
    if (matchedWords.length >= 3 || (matchedWords.length >= 2 && chunkWords.length <= 5)) {
      const trimmedChunk = chunk.trim()
      if (trimmedChunk.length > 10 && trimmedChunk.length < 300) {
        citations.push(trimmedChunk)
      }
    }
  }
  
  return [...new Set(citations)].slice(0, 5)
}

/**
 * Check if response is grounded in context
 */
function checkGrounding(response: string, context: string): boolean {
  const responseLower = response.toLowerCase()
  
  if (responseLower.includes("don't have") || responseLower.includes("not in") || responseLower.includes("cannot find")) {
    return true
  }
  
  const contextWords = context.toLowerCase().split(/\s+/).filter(w => w.length > 5)
  const uniqueContextWords = [...new Set(contextWords)]
  
  if (uniqueContextWords.length === 0) return true
  
  let matchCount = 0
  for (const word of uniqueContextWords) {
    if (responseLower.includes(word)) {
      matchCount++
    }
  }
  
  return (matchCount / uniqueContextWords.length) >= 0.1
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
