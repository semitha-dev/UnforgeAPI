import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGroq } from '@ai-sdk/groq'
import { streamText, generateText } from 'ai'
import { tavily } from '@tavily/core'
import { LIMITS, isPro, type SubscriptionProfile } from '@/lib/subscription-constants'

// Initialize Groq via Vercel AI SDK
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!
})

// ============================================
// ANONYMOUS USER RATE LIMITING (IP-based)
// ============================================
// Rate limit: 3 searches per minute for anonymous users
const ANONYMOUS_RATE_LIMIT = 3
const ANONYMOUS_RATE_WINDOW = 60 * 1000 // 1 minute in milliseconds

// In-memory rate limit store (resets on serverless cold start - acceptable for basic protection)
const anonymousRateLimits = new Map<string, { count: number; resetTime: number }>()

// ============================================
// FREE USER RESEARCH MODE DAILY LIMIT
// ============================================
// Free users get 3 research mode searches per day
const FREE_USER_RESEARCH_LIMIT = 3

// In-memory daily research count (userId -> { count, date })
// Note: This resets on serverless cold start, but we also check database
const freeUserResearchCounts = new Map<string, { count: number; date: string }>()

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0] // YYYY-MM-DD
}

function checkFreeUserResearchLimit(userId: string): { allowed: boolean; remaining: number; usedToday: number } {
  const today = getTodayDateString()
  const entry = freeUserResearchCounts.get(userId)
  
  // Clean up old entries periodically
  if (freeUserResearchCounts.size > 10000) {
    for (const [key, value] of freeUserResearchCounts.entries()) {
      if (value.date !== today) {
        freeUserResearchCounts.delete(key)
      }
    }
  }
  
  if (!entry || entry.date !== today) {
    // First research request today
    return { allowed: true, remaining: FREE_USER_RESEARCH_LIMIT, usedToday: 0 }
  }
  
  if (entry.count >= FREE_USER_RESEARCH_LIMIT) {
    // Daily limit reached
    return { allowed: false, remaining: 0, usedToday: entry.count }
  }
  
  return { allowed: true, remaining: FREE_USER_RESEARCH_LIMIT - entry.count, usedToday: entry.count }
}

function incrementFreeUserResearchCount(userId: string): void {
  const today = getTodayDateString()
  const entry = freeUserResearchCounts.get(userId)
  
  if (!entry || entry.date !== today) {
    freeUserResearchCounts.set(userId, { count: 1, date: today })
  } else {
    entry.count++
  }
}

function checkAnonymousRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = anonymousRateLimits.get(ip)
  
  // Clean up old entries periodically
  if (anonymousRateLimits.size > 10000) {
    for (const [key, value] of anonymousRateLimits.entries()) {
      if (value.resetTime < now) {
        anonymousRateLimits.delete(key)
      }
    }
  }
  
  if (!entry || entry.resetTime < now) {
    // First request or window expired
    anonymousRateLimits.set(ip, { count: 1, resetTime: now + ANONYMOUS_RATE_WINDOW })
    return { allowed: true, remaining: ANONYMOUS_RATE_LIMIT - 1, resetIn: ANONYMOUS_RATE_WINDOW }
  }
  
  if (entry.count >= ANONYMOUS_RATE_LIMIT) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now }
  }
  
  // Increment counter
  entry.count++
  return { allowed: true, remaining: ANONYMOUS_RATE_LIMIT - entry.count, resetIn: entry.resetTime - now }
}

/**
 * Detect if a query is a simple greeting or conversational message
 * that doesn't need web search
 */
function isGreetingOrCasual(query: string): { isGreeting: boolean; response: string } {
  const normalizedQuery = query.toLowerCase().trim()
  
  // Common greetings and casual messages
  const greetings = [
    /^(hi|hey|hello|howdy|hiya|yo|sup|heya)(\s+there)?[!?.,]*$/i,
    /^good\s+(morning|afternoon|evening|day)[!?.,]*$/i,
    /^what'?s?\s+up[!?.,]*$/i,
    /^how\s+(are\s+you|r\s+u|do\s+you\s+do)[!?.,]*$/i,
    /^(thanks|thank\s+you|thx|ty)[!?.,]*$/i,
    /^(ok|okay|sure|alright|got\s+it)[!?.,]*$/i,
    /^(bye|goodbye|see\s+you|later|cya)[!?.,]*$/i,
    /^(nice|cool|awesome|great)[!?.,]*$/i,
  ]
  
  for (const pattern of greetings) {
    if (pattern.test(normalizedQuery)) {
      // Generate appropriate response
      if (/^(hi|hey|hello|howdy|hiya|yo|sup|heya)(\s+there)?[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "Hello! 👋 How can I help you today? Feel free to ask me anything about your studies, request research on a topic, or ask me to create flashcards and quizzes!" 
        }
      }
      if (/^good\s+(morning|afternoon|evening|day)[!?.,]*$/i.test(normalizedQuery)) {
        const timeOfDay = normalizedQuery.match(/morning|afternoon|evening|day/i)?.[0] || 'day'
        return { 
          isGreeting: true, 
          response: `Good ${timeOfDay}! ☀️ How can I assist you with your learning today?` 
        }
      }
      if (/^what'?s?\s+up[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "Not much! Just ready to help you learn. 📚 What would you like to explore today?" 
        }
      }
      if (/^how\s+(are\s+you|r\s+u|do\s+you\s+do)[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "I'm doing great, thanks for asking! 😊 How can I help you with your studies?" 
        }
      }
      if (/^(thanks|thank\s+you|thx|ty)[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "You're welcome! Let me know if there's anything else I can help you with. 🙌" 
        }
      }
      if (/^(bye|goodbye|see\s+you|later|cya)[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "Goodbye! Good luck with your studies! 👋📖" 
        }
      }
      if (/^(ok|okay|sure|alright|got\s+it)[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "Great! Let me know if you have any questions or need help with anything. 👍" 
        }
      }
      if (/^(nice|cool|awesome|great)[!?.,]*$/i.test(normalizedQuery)) {
        return { 
          isGreeting: true, 
          response: "Glad you think so! 😄 Anything else you'd like to learn about?" 
        }
      }
    }
  }
  
  return { isGreeting: false, response: '' }
}

// ============================================
// UNIFIED LLM CLASSIFIER - AI Decides Everything
// Single LLM call to determine intent, web search, topic
// ============================================

// Path types for the Router Brain
type RouterPath = 'CHAT' | 'COMMAND' | 'RESEARCH'

// Command action types
type CommandAction = 
  | { type: 'create_study_set'; topic?: string; fromNotes: boolean }
  | { type: 'quiz_me'; topic?: string }
  | { type: 'summarize_notes' }
  | { type: 'explain_more'; context?: string }

// Router classification result
interface RouterClassification {
  path: RouterPath
  reason: string
  action_payload: CommandAction | null
  chat_response?: string  // Pre-generated response for CHAT path
  research_query?: string // Optimized query for RESEARCH path
  needsWebSearch: boolean // Whether this query needs web search
  topic?: string          // Extracted topic if any
}

/**
 * UNIFIED LLM CLASSIFIER - Let AI Decide Everything
 * 
 * A single LLM call determines:
 * 1. Intent: CHAT (greeting/thanks), COMMAND (create study set), RESEARCH (questions)
 * 2. Whether web search is needed
 * 3. Topic extraction for study sets
 * 4. Optimized search query if needed
 */
async function classifyRequest(
  query: string, 
  projectName: string,
  hasNotes: boolean,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<RouterClassification> {
  
  // Build conversation context for better understanding
  const recentHistory = conversationHistory.slice(-4).map(m => 
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 150)}`
  ).join('\n')

  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: `You are an intelligent classifier for a study app called LeafAI. Analyze the user's message and decide:

1. INTENT - Choose exactly ONE:
   - "CHAT" = Greetings, thanks, goodbyes, emotional support, casual conversation (NOT questions!)
   - "COMMAND" = Create flashcards/study sets/quizzes, summarize notes, app actions
   - "RESEARCH" = Questions needing factual answers, explanations, comparisons, definitions

2. NEEDS_WEB_SEARCH - Does this need web search?
   - true = Questions about facts, current events, comparisons, "how to", definitions
   - false = Greetings, summarizing notes, casual chat
   - For "create study set" requests: true (need web info to create content)

3. COMMAND_TYPE (only if intent is "COMMAND"):
   - "create_study_set" = User wants flashcards/study set created
   - "quiz_me" = User wants to be quizzed
   - "summarize_notes" = User wants notes summarized
   - "explain_more" = User wants more explanation

4. TOPIC - Extract the subject matter (not filler words):
   - "create a study set on animals" → "animals"
   - "can you make flashcards about photosynthesis" → "photosynthesis"
   - "create study set on laptops" → "laptops"

5. SEARCH_QUERY - Optimized query for web search (if needed)

${recentHistory ? `CONVERSATION CONTEXT:\n${recentHistory}\n\n` : ''}
PROJECT: "${projectName}"
HAS_NOTES: ${hasNotes}

USER MESSAGE: "${query}"

IMPORTANT: intent must be exactly one of: "CHAT", "COMMAND", or "RESEARCH" (not multiple!)

JSON response:
{
  "intent": "COMMAND",
  "reason": "brief explanation",
  "needs_web_search": true,
  "command_type": "create_study_set",
  "topic": "extracted topic",
  "from_notes": false,
  "search_query": "optimized search query"
}`,
      temperature: 0.1,
      maxOutputTokens: 300
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and normalize intent - must be exactly one of CHAT, COMMAND, RESEARCH
      let intent: RouterPath = 'RESEARCH' // default
      const rawIntent = String(parsed.intent || '').toUpperCase().trim()
      
      if (rawIntent === 'CHAT') {
        intent = 'CHAT'
      } else if (rawIntent === 'COMMAND' || parsed.command_type) {
        // If command_type is set, treat as COMMAND regardless of intent
        intent = 'COMMAND'
      } else if (rawIntent === 'RESEARCH') {
        intent = 'RESEARCH'
      } else {
        // Invalid intent (e.g., "CHAT|COMMAND") - infer from command_type or default to RESEARCH
        if (parsed.command_type && parsed.command_type !== 'null') {
          intent = 'COMMAND'
        } else {
          intent = 'RESEARCH'
        }
        console.log('[LLM Classifier] Invalid intent:', rawIntent, '→ normalized to:', intent)
      }
      
      const needsWebSearch = parsed.needs_web_search === true
      const topic = parsed.topic || null
      const fromNotes = parsed.from_notes === true || /\b(my\s+)?notes?\b|\bmy\s+(content|material)\b|\bfrom\s+notes?\b/i.test(query)
      
      console.log('[LLM Classifier]', {
        intent,
        needsWebSearch,
        commandType: parsed.command_type,
        topic,
        reason: parsed.reason
      })
      
      // Build action payload for COMMAND path
      let action_payload: CommandAction | null = null
      if (intent === 'COMMAND' && parsed.command_type) {
        switch (parsed.command_type) {
          case 'create_study_set':
            action_payload = {
              type: 'create_study_set',
              topic: topic || undefined,
              fromNotes
            }
            break
          case 'quiz_me':
            action_payload = { type: 'quiz_me', topic }
            break
          case 'summarize_notes':
            action_payload = { type: 'summarize_notes' }
            break
          case 'explain_more':
            action_payload = { type: 'explain_more', context: topic }
            break
        }
      }
      
      // Generate chat response for CHAT path
      let chatResponse: string | undefined = undefined
      if (intent === 'CHAT') {
        chatResponse = parsed.chat_response || generateSimpleChatResponse(query)
      }
      
      return {
        path: intent,
        reason: `LLM: ${parsed.reason || 'classified'}`,
        action_payload,
        chat_response: chatResponse,
        research_query: parsed.search_query || query,
        needsWebSearch,
        topic
      }
    }
  } catch (error) {
    console.error('[LLM Classifier] Error:', error)
  }

  // Fallback - default to RESEARCH with web search
  return {
    path: 'RESEARCH',
    reason: 'Fallback - defaulting to research with web search',
    action_payload: null,
    research_query: query,
    needsWebSearch: true
  }
}

/**
 * Simple chat response generator for fallback cases
 */
function generateSimpleChatResponse(query: string): string {
  const q = query.toLowerCase().trim()
  
  if (/^(hi|hey|hello|howdy|hiya|yo|sup|heya)/i.test(q)) {
    return "Hello! 👋 How can I help you today? Feel free to ask me anything about your studies!"
  }
  if (/^good\s+(morning)/i.test(q)) {
    return "Good morning! ☀️ Ready to learn something new today?"
  }
  if (/^good\s+(afternoon)/i.test(q)) {
    return "Good afternoon! 🌤️ How can I help with your studies?"
  }
  if (/^good\s+(evening|night)/i.test(q)) {
    return "Good evening! 🌙 Still hitting the books? I'm here to help!"
  }
  if (/^(thanks|thank\s+you|thx|ty)/i.test(q)) {
    return "You're welcome! Let me know if there's anything else I can help you with. 🙌"
  }
  if (/^(bye|goodbye|see\s+you|later|cya)/i.test(q)) {
    return "Goodbye! Good luck with your studies! 📚 Come back anytime!"
  }
  if (/^(ok|okay|alright|got\s+it)/i.test(q)) {
    return "Great! Let me know if you have any questions."
  }
  
  return "I'm here to help! Feel free to ask me anything. 😊"
}

/**
 * Generate a conversational response for CHAT path
 * Uses LLM to respond naturally without web search
 * Now includes conversation history for context
 * Uses fast model (8b) to keep costs low for free users
 */
async function generateChatResponse(
  query: string,
  projectName: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    // Build conversation context
    const historyContext = conversationHistory.length > 0 
      ? `\n\nPrevious conversation:\n${conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`).join('\n')}\n\n`
      : ''
    
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'), // Fast model for free users
      prompt: `You are LeafAI, a helpful and knowledgeable AI study companion. You are friendly, engaging, and always provide substantive answers.

IMPORTANT RULES:
1. NEVER ask "what would you like to know?" or "what do you think?" - instead, ANSWER the question directly
2. If user asks for a comparison (e.g., "ChatGPT vs Gemini"), provide a helpful comparison with key differences
3. If user asks a question, ANSWER it with real information
4. Be conversational but informative - give real value in every response
5. If you need clarification, ask a SPECIFIC question, not a vague one
6. Remember the conversation context and refer back to previous topics when relevant
7. Keep responses concise but helpful (3-5 sentences for simple questions)

The user is working in: "${projectName}"
${historyContext}
User's current message: ${query}

Provide a helpful, substantive response:`,
      temperature: 0.7,
      maxOutputTokens: 400
    })
    return text.trim()
  } catch (error) {
    console.error('[generateChatResponse] Error:', error)
    return "I'm here to help! Feel free to ask me anything about your studies. 📚"
  }
}

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

interface Citation {
  number: number
  title: string
  url: string
}

// Search the web using Tavily API
async function searchWeb(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  
  if (!apiKey) {
    console.error('[Tavily] API key not found')
    return []
  }

  console.log('[Tavily] Searching for:', query)

  try {
    const client = tavily({ apiKey })
    
    const response = await client.search(query, {
      searchDepth: 'basic', // Changed from 'advanced' - faster and more reliable
      maxResults: 10,
      includeAnswer: false,
      includeRawContent: false
    })

    console.log('[Tavily] Got', response.results?.length || 0, 'results')
    
    // Log first result for debugging
    if (response.results && response.results.length > 0) {
      console.log('[Tavily] First result:', response.results[0].title)
    }
    
    return response.results || []
  } catch (error: any) {
    console.error('[Tavily] Search error:', error?.message || error)
    // Return empty array, caller will handle fallback
    return []
  }
}

// Rephrase user query for better search results (fast, non-streaming)
async function rephraseQuery(query: string, projectName: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Convert this question into a simple web search query. Keep it short and direct. Remove filler words but keep the core question.

Examples:
- "what is best chatgpt or gemini" → "ChatGPT vs Gemini comparison 2024"
- "how does photosynthesis work" → "photosynthesis process explained"
- "tell me about the french revolution" → "French Revolution history overview"

User query: ${query}

Search query (output ONLY the query, nothing else):`,
      temperature: 0.2,
      maxOutputTokens: 50
    })

    const optimized = text.trim()
    console.log('[Rephrase] Original:', query, '→ Optimized:', optimized)
    return optimized || query
  } catch (error) {
    console.error('[Rephrase] Error:', error)
    return query
  }
}

// AGENTIC: Gap analysis - check if we have enough info to answer
async function analyzeGaps(
  query: string,
  searchResults: TavilyResult[]
): Promise<{ hasGaps: boolean; suggestedQuery: string | null; confidence: number }> {
  if (searchResults.length === 0) {
    return { hasGaps: true, suggestedQuery: query, confidence: 0 }
  }

  const context = searchResults
    .slice(0, 5)
    .map(r => `- ${r.title}: ${r.content.slice(0, 200)}...`)
    .join('\n')

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `You are analyzing if search results can fully answer a user's question.

USER QUESTION: ${query}

SEARCH RESULTS SUMMARY:
${context}

Analyze:
1. Can we comprehensively answer this question with these results?
2. What key information might be missing?
3. Confidence score (0-100) that we can answer well.

Respond in JSON format ONLY:
{"hasGaps": true/false, "suggestedQuery": "follow-up search query if gaps exist, or null", "confidence": 0-100}`,
      temperature: 0.2,
      maxOutputTokens: 200
    })

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        hasGaps: parsed.hasGaps === true && parsed.confidence < 70,
        suggestedQuery: parsed.suggestedQuery || null,
        confidence: parsed.confidence || 50
      }
    }
  } catch (error) {
    console.error('Gap analysis error:', error)
  }

  return { hasGaps: false, suggestedQuery: null, confidence: 70 }
}

// Generate study set items from a topic
async function generateStudySet(
  topic: string,
  searchResults: TavilyResult[],
  notesContext?: Array<{ title: string; content: string }>
): Promise<{ flashcards: { term: string; definition: string }[]; quizzes: { question: string; correct_answer: string; wrong_answers: string[] }[] }> {
  // Build context from search results OR notes
  let context = ''
  
  if (notesContext && notesContext.length > 0) {
    // Use notes context
    context = notesContext.map(note => `📝 ${note.title}:\n${note.content}`).join('\n\n---\n\n')
    console.log('[generateStudySet] Using notes context:', notesContext.length, 'notes')
  } else if (searchResults && searchResults.length > 0) {
    // Use web search results
    context = searchResults.slice(0, 4).map(r => r.content).join('\n\n')
    console.log('[generateStudySet] Using web search context:', searchResults.length, 'results')
  }
  
  if (!context) {
    console.log('[generateStudySet] No context available')
    return { flashcards: [], quizzes: [] }
  }

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `You are an educational content creator. Generate study materials based on the content provided.
Output ONLY valid JSON in this exact format:
{
  "flashcards": [
    {"term": "Key Concept", "definition": "Clear explanation"}
  ],
  "quizzes": [
    {"question": "Question text?", "correct_answer": "Correct option", "wrong_answers": ["Wrong 1", "Wrong 2", "Wrong 3"]}
  ]
}
Generate 10-12 flashcards and 10 quiz questions based on the actual content provided. Make the questions diverse and cover different aspects of the topic.

Topic: ${topic}

Content to create study materials from:
${context}

Generate study materials (JSON only):`,
      temperature: 0.7,
      maxOutputTokens: 4000
    })

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        flashcards: parsed.flashcards || [],
        quizzes: parsed.quizzes || []
      }
    }
    
    return { flashcards: [], quizzes: [] }
  } catch (error) {
    console.error('Study set generation error:', error)
    return { flashcards: [], quizzes: [] }
  }
}

// Model configuration based on search mode
const MODELS = {
  fast: 'llama-3.1-8b-instant',      // Cheaper, faster - for quick answers
  research: 'llama-3.3-70b-versatile' // Best quality - for deep research
} as const

type SearchMode = keyof typeof MODELS

interface FileAttachment {
  name: string
  content: string
  type: string
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Create a TransformStream for streaming
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: any) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  // Track if stream was closed to avoid double-close error
  let streamClosed = false
  const closeStream = async () => {
    if (!streamClosed) {
      streamClosed = true
      await writer.close()
    }
  }

  // Start processing in background
  ;(async () => {
    try {
      const body = await request.json()
      const { 
        query, 
        projectId, 
        projectName, 
        searchMode = 'research',  // Default to research mode
        files = [],               // File attachments
        userId: requestUserId,    // User ID from frontend
        conversationHistory = []  // Previous messages for context
      } = body as {
        query: string
        projectId?: string
        projectName?: string
        searchMode?: SearchMode
        files?: FileAttachment[]
        userId?: string
        conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
      }

      if (!query) {
        await sendEvent('error', { message: 'Query is required' })
        await closeStream()
        return
      }

      // Check if this is a simple greeting - respond without searching
      const greetingCheck = isGreetingOrCasual(query)
      if (greetingCheck.isGreeting) {
        console.log('[Stream API] Detected greeting, responding conversationally')
        // Use same event format as other paths so frontend can handle it
        await sendEvent('text', { content: greetingCheck.response })
        await sendEvent('done', { success: true, citations: [] })
        await closeStream()
        return
      }

      // Model will be selected after subscription check
      let modelId: string = MODELS.fast

      // Initialize Supabase with service role for database operations
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Get user ID - prioritize frontend-provided userId, then project, then cookies
      let userId: string | null = requestUserId || null
      
      if (!userId && projectId) {
        // Space-level search: get user from project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', projectId)
          .single()
        userId = project?.user_id || null
      }
      
      // Fallback to cookie parsing if still no userId
      if (!userId) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/)
          if (tokenMatch) {
            try {
              const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]))
              if (tokenData && Array.isArray(tokenData) && tokenData[0]) {
                const { data: { user } } = await supabase.auth.getUser(tokenData[0])
                userId = user?.id || null
              }
            } catch (e) {
              console.log('[Stream API] Could not parse auth token from cookie')
            }
          }
        }
      }
      
      console.log('[Stream API] User ID:', userId || 'anonymous')

      // ============================================
      // RATE LIMITING FOR ANONYMOUS USERS
      // ============================================
      if (!userId) {
        // Get IP address from headers (Vercel forwards real IP)
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
        
        const rateLimit = checkAnonymousRateLimit(ip)
        console.log(`[Stream API] Anonymous rate limit check for ${ip}: allowed=${rateLimit.allowed}, remaining=${rateLimit.remaining}`)
        
        if (!rateLimit.allowed) {
          const resetInSeconds = Math.ceil(rateLimit.resetIn / 1000)
          await sendEvent('error', { 
            message: `Rate limit exceeded. Please wait ${resetInSeconds} seconds or sign in for unlimited searches.`,
            type: 'rate_limit',
            resetIn: resetInSeconds
          })
          await closeStream()
          return
        }
        
        // Send rate limit info to frontend
        await sendEvent('rateLimit', {
          remaining: rateLimit.remaining,
          limit: ANONYMOUS_RATE_LIMIT,
          isAnonymous: true
        })
      }

      // Check subscription for research mode access
      let effectiveSearchMode = searchMode
      let isFreeUserResearch = false // Track if free user is using their daily research allowance
      
      if (searchMode === 'research' && userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_ends_at, trial_ends_at, grace_period_ends_at')
          .eq('id', userId)
          .single()
        
        if (profile) {
          const subscriptionProfile: SubscriptionProfile = {
            subscription_tier: profile.subscription_tier || 'free',
            subscription_status: profile.subscription_status || 'inactive',
            polar_subscription_id: null,
            polar_customer_id: null,
            subscription_ends_at: profile.subscription_ends_at,
            next_billing_date: null,
            canceled_at: null,
            trial_ends_at: profile.trial_ends_at,
            grace_period_ends_at: profile.grace_period_ends_at,
            auto_renew: false,
            subscription_started_at: null,
            current_period_start: null,
            current_period_end: null,
          }
          
          if (!isPro(subscriptionProfile)) {
            // Free user - check daily research limit (3 per day)
            const researchLimit = checkFreeUserResearchLimit(userId)
            
            if (researchLimit.allowed) {
              // Free user can use research mode (within daily limit)
              console.log(`[Stream API] Free user using research mode (${researchLimit.usedToday + 1}/${FREE_USER_RESEARCH_LIMIT} today)`)
              isFreeUserResearch = true
              await sendEvent('researchLimit', {
                remaining: researchLimit.remaining - 1,
                limit: FREE_USER_RESEARCH_LIMIT,
                usedToday: researchLimit.usedToday + 1
              })
            } else {
              // Daily limit reached - downgrade to fast
              console.log('[Stream API] Free user daily research limit reached, downgrading to fast')
              effectiveSearchMode = 'fast'
              await sendEvent('modeDowngraded', { 
                message: `Daily research limit reached (${FREE_USER_RESEARCH_LIMIT}/day). Using Fast mode. Upgrade to Pro for unlimited.`,
                originalMode: 'research',
                newMode: 'fast',
                dailyLimitReached: true
              })
            }
          }
        } else {
          // No profile found, default to fast mode
          console.log('[Stream API] No profile found, using fast mode')
          effectiveSearchMode = 'fast'
        }
      } else if (searchMode === 'research' && !userId) {
        // Anonymous user trying research mode
        console.log('[Stream API] Anonymous user, downgrading to fast mode')
        effectiveSearchMode = 'fast'
        await sendEvent('modeDowngraded', { 
          message: 'Please sign in for Research mode. Using Fast mode.',
          originalMode: 'research',
          newMode: 'fast'
        })
      }
      
      // Increment free user research count after successful research mode selection
      if (isFreeUserResearch && effectiveSearchMode === 'research' && userId) {
        incrementFreeUserResearchCount(userId)
      }

      // Now select model based on effective search mode (after subscription check)
      modelId = MODELS[effectiveSearchMode] || MODELS.fast
      console.log(`[Stream API] Using model: ${modelId} (mode: ${effectiveSearchMode})`)

      // ============================================
      // MULTI-PURPOSE ROUTER - Three Path Branching
      // ============================================
      
      // Fetch user's notes if they have a project (needed for context)
      let notesContext: Array<{ title: string; content: string }> = []
      if (projectId && userId) {
        const { data: notes } = await supabase
          .from('notes')
          .select('title, content')
          .eq('project_id', projectId)
          .limit(10)
        
        if (notes && notes.length > 0) {
          notesContext = notes.map(n => ({ title: n.title || 'Untitled', content: n.content || '' }))
        }
      }
      const hasNotes = notesContext.length > 0

      // === STEP 0: Route the request ===
      await sendEvent('status', { step: 'understanding', message: 'Understanding your request...' })
      
      const classification = await classifyRequest(query, projectName || 'Global', hasNotes, conversationHistory)
      console.log('[Stream API] Router classification:', classification)

      // ============================================
      // PATH 1: CHAT (The "Human" Path)
      // Fixes: "How you doing?" searching the web
      // ============================================
      if (classification.path === 'CHAT') {
        console.log('[Stream API] Taking CHAT path - no web search')
        
        // Use pre-generated response or generate one with conversation context
        const chatResponse = classification.chat_response || await generateChatResponse(query, projectName || 'Study', conversationHistory)
        
        await sendEvent('text', { content: chatResponse })
        await sendEvent('done', { 
          success: true, 
          citations: [],
          _debug: { path: 'CHAT', reason: classification.reason }
        })
        await closeStream()
        return
      }

      // ============================================
      // PATH 2: COMMAND (The "App" Path)
      // Fixes: "Create study set" searching the web
      // ============================================
      if (classification.path === 'COMMAND') {
        console.log('[Stream API] Taking COMMAND path - using internal context')
        
        const action = classification.action_payload
        
        // Handle: Create Study Set
        if (action?.type === 'create_study_set') {
          const topic = action.topic
          const fromNotes = action.fromNotes
          
          // CONTEXT AWARENESS: Check if we have enough info
          if (!topic && !fromNotes && !hasNotes) {
            await sendEvent('text', { 
              content: "I'd love to create a study set for you! 📚\n\nPlease tell me:\n- **A topic**: \"Create a study set about photosynthesis\"\n- **Or from your notes**: \"Create flashcards from my notes\"\n\nWhat would you like to study?" 
            })
            await sendEvent('done', { success: true, citations: [], _debug: { path: 'COMMAND', needsClarification: true } })
            await closeStream()
            return
          }
          
          // If from notes, use notes context (no web search!)
          if (fromNotes || (!topic && hasNotes)) {
            if (!hasNotes) {
              await sendEvent('text', { 
                content: "You don't have any notes in this space yet. Add some notes, or ask me to search the web for a topic (e.g., 'Create a study set about photosynthesis')." 
              })
              await sendEvent('done', { success: true, citations: [] })
              await closeStream()
              return
            }
            
            await sendEvent('status', { step: 'creating_study_set', message: 'Creating study set from your notes...' })
            
            // Generate study set from NOTES, not web
            const materials = await generateStudySet(projectName || 'My Notes', [], notesContext)
            
            if (materials.flashcards.length > 0 || materials.quizzes.length > 0) {
              // Save to database
              let effectiveProjectId = projectId
              
              if (!effectiveProjectId && userId) {
                // Create or get Global Searches project
                const { data: existingProject } = await supabase
                  .from('projects')
                  .select('id')
                  .eq('user_id', userId)
                  .eq('name', 'Global Searches')
                  .single()
                
                effectiveProjectId = existingProject?.id
                
                if (!effectiveProjectId) {
                  const { data: newProject } = await supabase
                    .from('projects')
                    .insert({ user_id: userId, name: 'Global Searches', description: 'Study sets from global searches', color: '#10b981' })
                    .select()
                    .single()
                  effectiveProjectId = newProject?.id
                }
              }
              
              if (effectiveProjectId && userId) {
                const { data: studySet } = await supabase
                  .from('study_sets')
                  .insert({
                    user_id: userId,
                    project_id: effectiveProjectId,
                    title: `${projectName || 'Notes'} Study Set`,
                    description: `Generated from ${notesContext.length} notes`,
                    is_ai_generated: true,
                    flashcard_count: materials.flashcards.length,
                    quiz_count: materials.quizzes.length,
                    item_count: materials.flashcards.length + materials.quizzes.length
                  })
                  .select()
                  .single()
                
                if (studySet) {
                  // Insert items
                  const flashcardItems = materials.flashcards.map((fc, idx) => ({
                    user_id: userId,
                    study_set_id: studySet.id,
                    item_type: 'flashcard',
                    item_order: idx,
                    front: fc.term,
                    back: fc.definition
                  }))
                  
                  const quizItems = materials.quizzes.map((q, idx) => ({
                    user_id: userId,
                    study_set_id: studySet.id,
                    item_type: 'quiz',
                    item_order: materials.flashcards.length + idx,
                    question: q.question,
                    option_a: q.correct_answer,
                    option_b: q.wrong_answers[0] || '',
                    option_c: q.wrong_answers[1] || '',
                    option_d: q.wrong_answers[2] || '',
                    correct_answer: 'A',
                    explanation: `The correct answer is: ${q.correct_answer}`
                  }))
                  
                  await supabase.from('study_items').insert([...flashcardItems, ...quizItems])
                  
                  await sendEvent('studySetCreated', { 
                    id: studySet.id, 
                    title: studySet.title, 
                    itemCount: flashcardItems.length + quizItems.length 
                  })
                }
              }
              
              await sendEvent('text', { 
                content: `✅ **Study Set Created!**\n\nI've created a study set from your notes with:\n- **${materials.flashcards.length}** flashcards\n- **${materials.quizzes.length}** quiz questions\n\nYou can find it in your study materials!` 
              })
            } else {
              await sendEvent('text', { content: "I couldn't generate enough content from your notes. Try adding more detailed notes first! 📝" })
            }
            
            await sendEvent('done', { success: true, citations: [], _debug: { path: 'COMMAND', action: 'create_study_set_from_notes' } })
            await closeStream()
            return
          }
          
          // If topic provided, search web for that topic THEN create study set
          // This falls through to RESEARCH path with study set flag
          console.log('[Stream API] Create study set with topic - falling through to RESEARCH path', { topic, actionPayload: classification.action_payload })
          classification.path = 'RESEARCH' as RouterPath
          classification.research_query = topic
        }
        
        // Handle: Quiz Me (future feature)
        if (action?.type === 'quiz_me') {
          await sendEvent('text', { content: "Quiz mode is coming soon! For now, try 'Create a quiz about [topic]' 🎯" })
          await sendEvent('done', { success: true, citations: [] })
          await closeStream()
          return
        }
        
        // Handle: Summarize Notes
        if (action?.type === 'summarize_notes') {
          if (!hasNotes) {
            await sendEvent('text', { content: "I don't see any notes to summarize in this space. Add some notes first! 📝" })
          } else {
            await sendEvent('status', { step: 'generating', message: 'Summarizing your notes...' })
            const { text } = await generateText({
              model: groq(modelId),
              prompt: `Summarize these study notes concisely:\n\n${notesContext.map(n => `## ${n.title}\n${n.content}`).join('\n\n')}\n\nProvide a clear, organized summary:`,
              maxOutputTokens: 800
            })
            await sendEvent('text', { content: text })
          }
          await sendEvent('done', { success: true, citations: [] })
          await closeStream()
          return
        }
      }

      // ============================================
      // PATH 3: RESEARCH (The "Search" Path)
      // AI decides if web search is needed
      // ============================================
      
      // Check if this is a study set request that needs web research
      const isStudySetFromWeb = classification.action_payload?.type === 'create_study_set' && classification.action_payload.topic
      const searchTopic = classification.research_query || query
      
      // AI decides if we need web search
      const shouldSearchWeb = classification.needsWebSearch !== false // Default to true if not specified
      
      console.log('[Stream API] Taking RESEARCH path', { 
        needsWebSearch: shouldSearchWeb, 
        isStudySetFromWeb,
        topic: classification.topic 
      })

      // If AI says no web search needed, answer directly from LLM knowledge
      if (!shouldSearchWeb && !isStudySetFromWeb) {
        console.log('[Stream API] AI decided: No web search needed - using LLM knowledge')
        await sendEvent('status', { step: 'generating', message: 'Generating answer...' })
        
        const { textStream } = streamText({
          model: groq(modelId),
          prompt: `You are LeafAI, a knowledgeable study assistant. Answer the user's question directly and helpfully.

Question: ${query}

Provide a clear, accurate, and educational response. Be concise but thorough.`,
          temperature: 0.7,
        })

        for await (const chunk of textStream) {
          await sendEvent('text', { content: chunk })
        }
        
        await sendEvent('done', { 
          success: true, 
          citations: [],
          _debug: { path: 'RESEARCH', webSearchSkipped: true, reason: classification.reason }
        })
        await closeStream()
        return
      }

      // === STEP 1: Send status update ===
      await sendEvent('status', { step: 'optimizing', message: isStudySetFromWeb ? 'Preparing to create your study set...' : 'Optimizing your search...' })

      // Step 1: Rephrase query (or use topic directly for study sets)
      const searchQuery = isStudySetFromWeb
        ? searchTopic
        : await rephraseQuery(query, projectName || 'General Study')

      console.log('[Stream API] Query:', query)
      console.log('[Stream API] Optimized:', searchQuery)

      // === STEP 2: Search web ===
      await sendEvent('status', { step: 'searching', message: 'Searching the web...' })
      
      let searchResults = await searchWeb(searchQuery)
      
      // If no results, try original query
      if (searchResults.length === 0) {
        searchResults = await searchWeb(query)
      }

      // === STEP 3: AGENTIC - Gap Analysis ===
      await sendEvent('status', { step: 'analyzing', message: 'Analyzing information quality...' })
      
      const gapAnalysis = await analyzeGaps(query, searchResults)
      console.log('[Stream API] Gap analysis:', gapAnalysis)

      // If gaps detected and confidence is low, do a second search
      if (gapAnalysis.hasGaps && gapAnalysis.suggestedQuery) {
        await sendEvent('status', { step: 'deepening', message: 'Finding more information...' })
        
        const additionalResults = await searchWeb(gapAnalysis.suggestedQuery)
        
        // Merge results (deduplicate by URL)
        const existingUrls = new Set(searchResults.map(r => r.url))
        const newResults = additionalResults.filter(r => !existingUrls.has(r.url))
        searchResults = [...searchResults, ...newResults].slice(0, 10)
        
        console.log('[Stream API] After second search:', searchResults.length, 'total results')
      }

      // === STEP 4: Build citations ===
      const citations: Citation[] = searchResults.slice(0, 8).map((result, i) => ({
        number: i + 1,
        title: result.title,
        url: result.url
      }))

      // Send citations immediately so UI can show them
      await sendEvent('citations', { citations })

      // === STEP 5: Stream the answer ===
      await sendEvent('status', { step: 'generating', message: 'Generating answer...' })

      if (searchResults.length === 0) {
        console.log('[Stream API] No web results - falling back to LLM knowledge')
        
        // Instead of failing, use LLM's knowledge to answer
        await sendEvent('status', { step: 'generating', message: 'Generating answer from knowledge...' })
        
        const { textStream } = streamText({
          model: groq(modelId),
          prompt: `You are a knowledgeable assistant. The web search didn't return results, but you can answer from your training knowledge.

Question: ${query}

Provide a helpful, accurate answer. If you're not confident about something, say so. Be concise but thorough.`,
          temperature: 0.7,
        })

        for await (const chunk of textStream) {
          await sendEvent('text', { content: chunk })
        }
        
        await sendEvent('text', { content: '\n\n*Note: This answer is from AI knowledge, not live web search.*' })
        await sendEvent('done', { success: true, citations: [] })
        await closeStream()
        return
      }

      // Build context from search results
      const context = searchResults
        .slice(0, 8)
        .map((result, i) => `[${i + 1}] ${result.title}\nURL: ${result.url}\nContent: ${result.content}`)
        .join('\n\n---\n\n')

      // Build file context if files are attached
      let fileContext = ''
      if (files && files.length > 0) {
        fileContext = '\n\nUSER ATTACHED FILES:\n' + files.map((f: FileAttachment) => 
          `--- File: ${f.name} ---\n${f.content}`
        ).join('\n\n')
        console.log(`[Stream API] Including ${files.length} file(s) in context`)
      }

      // Build conversation context for continuity
      let conversationContext = ''
      if (conversationHistory && conversationHistory.length > 0) {
        conversationContext = '\n\nPREVIOUS CONVERSATION:\n' + conversationHistory.slice(-4).map(m => 
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`
        ).join('\n')
      }

      // Stream the answer!
      const { textStream } = streamText({
        model: groq(modelId),
        system: `You are a research assistant that provides comprehensive, factual answers based on the provided search results${files && files.length > 0 ? ' and attached files' : ''}.

CRITICAL RULES:
- Provide DIRECT, SUBSTANTIVE answers - never ask "what would you like to know?" or deflect
- For comparisons (X vs Y, which is better), provide a detailed comparison with pros/cons
- ONLY use information from the search results provided${files && files.length > 0 ? ' and the user\'s attached files' : ''}
- Do NOT use your training data or prior knowledge
- If the search results don't contain enough information, say "Based on the search results, I found limited information about this topic"
- Always cite sources using [1], [2], etc. inline with your text
- Every claim must have a citation from the provided sources
${files && files.length > 0 ? '- When referencing attached files, mention the file name\n' : ''}- Include specific data, numbers, and quotes from the sources when available
- If this is a follow-up question, connect your answer to the previous conversation context
- Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FORMATTING RULES:
- Format your response in clear markdown with proper structure
- Start with a brief overview paragraph
- Use ## for main section headers (e.g., "## Overview", "## Key Points", "## Process")
- Use ### for subsections if needed
- Use bullet points (-) or numbered lists (1.) for listing information
- Use **bold** for emphasis on important terms
- Keep paragraphs concise (2-3 sentences max)
- Organize information logically with clear sections based on the topic`,
        prompt: `${conversationContext ? conversationContext + '\n\n' : ''}Question: ${query}

WEB SEARCH RESULTS (use ONLY these sources):
${context}${fileContext}

Based ONLY on the search results${files && files.length > 0 ? ' and attached files' : ''} above, provide a comprehensive answer with inline citations [1], [2], etc:`,
        temperature: 0.3,
        maxOutputTokens: searchMode === 'fast' ? 1000 : 1500  // Shorter for fast mode
      })

      // Stream tokens to client
      let fullAnswer = ''
      for await (const chunk of textStream) {
        fullAnswer += chunk
        await sendEvent('text', { content: chunk })
      }

      // === STEP 6: Create study set if this was a study set request from RESEARCH path ===
      let studySetCreated: { id: string; title: string; itemCount: number } | undefined

      console.log('[Stream API] Study set check:', { isStudySetFromWeb, userId: userId || 'null', searchTopic })

      if (isStudySetFromWeb) {
        if (!userId) {
          // User not authenticated - can't create study set
          console.log('[Stream API] Cannot create study set - user not authenticated')
          await sendEvent('text', { content: '\n\n---\n\n⚠️ **Note:** Sign in to automatically save study sets to your account!' })
        } else {
          await sendEvent('status', { step: 'creating_study_set', message: 'Creating your study set...' })
        
          const materials = await generateStudySet(searchTopic, searchResults)
        
        if (materials.flashcards.length > 0 || materials.quizzes.length > 0) {
          // For global search, we need to get or create a default project
          let effectiveProjectId = projectId

          if (!effectiveProjectId) {
            // Get or create a "Global Searches" project
            const { data: existingProject } = await supabase
              .from('projects')
              .select('id')
              .eq('user_id', userId)
              .eq('name', 'Global Searches')
              .single()

            if (existingProject) {
              effectiveProjectId = existingProject.id
            } else {
              const { data: newProject } = await supabase
                .from('projects')
                .insert({
                  user_id: userId,
                  name: 'Global Searches',
                  description: 'Study sets from global AI searches',
                  color: '#10b981'
                })
                .select()
                .single()
              
              if (newProject) {
                effectiveProjectId = newProject.id
              }
            }
          }

          if (!effectiveProjectId) {
            console.error('Could not get or create project for study set')
          } else {
            // Create study set
            const { data: studySet, error: setError } = await supabase
              .from('study_sets')
              .insert({
                user_id: userId,
                project_id: effectiveProjectId,
                title: searchTopic,
                description: `Generated from: ${query}`,
                is_ai_generated: true,
                flashcard_count: materials.flashcards.length,
                quiz_count: materials.quizzes.length,
                item_count: materials.flashcards.length + materials.quizzes.length
              })
              .select()
              .single()

            if (studySet && !setError) {
              // Insert flashcards with correct column format
              const flashcardItems = materials.flashcards.map((fc, idx) => ({
                user_id: userId,
                study_set_id: studySet.id,
                item_type: 'flashcard',
                item_order: idx,
                front: fc.term,
                back: fc.definition
              }))

              // Insert quiz items with correct column format
              const quizItems = materials.quizzes.map((q, idx) => ({
                user_id: userId,
                study_set_id: studySet.id,
                item_type: 'quiz',
                item_order: materials.flashcards.length + idx,
                question: q.question,
                option_a: q.correct_answer,
                option_b: q.wrong_answers[0] || '',
                option_c: q.wrong_answers[1] || '',
                option_d: q.wrong_answers[2] || '',
                correct_answer: 'A', // Correct answer is always option A
                explanation: `The correct answer is: ${q.correct_answer}`
              }))

              if (flashcardItems.length > 0 || quizItems.length > 0) {
                await supabase.from('study_items').insert([...flashcardItems, ...quizItems])
              }

              studySetCreated = {
                id: studySet.id,
                title: searchTopic,
                itemCount: flashcardItems.length + quizItems.length
              }

              // Send study set created event
              await sendEvent('studySetCreated', studySetCreated)
            } else {
              console.error('Study set creation error:', setError)
            }
          }
        }
      } // Close else for userId check
      }

      // === STEP 7: Log to history ===
      if (userId && projectId) {
        try {
          await supabase.from('ai_search_history').insert({
            user_id: userId,
            project_id: projectId,
            query,
            search_query: searchQuery,
            answer: fullAnswer,
            citations,
            sources_count: searchResults.length,
            study_set_id: studySetCreated?.id || null,
            model_used: 'llama-3.3-70b-versatile',
            search_engine: 'tavily'
          })
        } catch (logError) {
          console.log('Could not log search history:', logError)
        }
      }

      // Send completion event
      await sendEvent('done', { 
        success: true,
        studySetCreated,
        _debug: {
          path: classification.path,
          reason: classification.reason,
          searchQuery,
          sourcesFound: searchResults.length,
          gapAnalysis,
          secondSearchPerformed: gapAnalysis.hasGaps,
          isStudySetFromWeb
        }
      })

    } catch (error) {
      console.error('Stream API error:', error)
      await sendEvent('error', { message: 'An error occurred while processing your request' })
    } finally {
      await closeStream()
    }
  })()

  // Return the stream as SSE
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
