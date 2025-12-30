import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { tavily } from '@tavily/core'
import { getUserSubscription, isPro, LIMITS, FREE_TIER_RATE_LIMIT } from '@/lib/subscription'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// In-memory rate limit store (for serverless, use Redis in production)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

/**
 * Check rate limit for free tier users
 * Uses sliding window counter (5 requests per 60 seconds)
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 60 seconds
  const limit = FREE_TIER_RATE_LIMIT
  
  const userLimit = rateLimitStore.get(userId)
  
  if (!userLimit || now - userLimit.windowStart >= windowMs) {
    // New window
    rateLimitStore.set(userId, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }
  
  if (userLimit.count >= limit) {
    const resetIn = windowMs - (now - userLimit.windowStart)
    return { allowed: false, remaining: 0, resetIn }
  }
  
  // Increment count
  userLimit.count++
  return { allowed: true, remaining: limit - userLimit.count, resetIn: windowMs - (now - userLimit.windowStart) }
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
// MULTI-PURPOSE ROUTER - Three Path System
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
  chat_response?: string
  research_query?: string
}

/**
 * ROUTER BRAIN - Classifies user requests into 3 distinct paths
 */
async function classifyRequest(
  query: string, 
  projectName: string,
  hasNotes: boolean
): Promise<RouterClassification> {
  // Quick check for obvious greetings (saves API call)
  const greetingCheck = isGreetingOrCasual(query)
  if (greetingCheck.isGreeting) {
    return {
      path: 'CHAT',
      reason: 'Detected greeting pattern',
      action_payload: null,
      chat_response: greetingCheck.response
    }
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are the "Router Brain" for an educational AI. Your job is to classify the user's request into one of 3 distinct paths.

PATHS:
1. "CHAT": Casual conversation, greetings, jokes, emotional support, or simple acknowledgments. Examples: "How are you?", "That's cool", "Thanks!", "Tell me a joke", "I'm stressed about exams". DO NOT SEARCH THE WEB.

2. "COMMAND": User wants to perform a specific app action. Examples: "Create flashcards from my notes", "Quiz me on this", "Make a study set about biology", "Summarize my notes", "Generate practice questions". DO NOT SEARCH THE WEB unless they explicitly ask for web info.

3. "RESEARCH": User is asking for NEW information, facts, or topics they don't know. Examples: "How does photosynthesis work?", "What caused World War 2?", "Explain quantum computing", "Tell me about the French Revolution". This is the ONLY path that searches the web.

CRITICAL RULES:
- If user says "create", "make", "generate" + "flashcards"/"quiz"/"study set" → COMMAND, not RESEARCH
- If user is asking about their OWN notes/content → COMMAND, not RESEARCH  
- If user is making small talk or reacting → CHAT, not RESEARCH
- Only use RESEARCH when user genuinely needs external information

Respond with JSON only:
{
  "path": "CHAT" | "COMMAND" | "RESEARCH",
  "reason": "Brief explanation",
  "command_type": "create_study_set" | "quiz_me" | "summarize_notes" | "explain_more" | null,
  "topic": "extracted topic if any",
  "from_notes": true/false,
  "chat_response": "response text if CHAT path"
}`
        },
        {
          role: 'user',
          content: `User message: "${query}"\nProject: "${projectName}"\nHas notes: ${hasNotes}`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      const path = (parsed.path as RouterPath) || 'RESEARCH'
      
      // Build action payload for COMMAND path
      let action_payload: CommandAction | null = null
      if (path === 'COMMAND' && parsed.command_type) {
        switch (parsed.command_type) {
          case 'create_study_set':
            action_payload = {
              type: 'create_study_set',
              topic: parsed.topic || undefined,
              fromNotes: parsed.from_notes === true || /notes?|my\s+content|my\s+material/i.test(query)
            }
            break
          case 'quiz_me':
            action_payload = { type: 'quiz_me', topic: parsed.topic }
            break
          case 'summarize_notes':
            action_payload = { type: 'summarize_notes' }
            break
          case 'explain_more':
            action_payload = { type: 'explain_more', context: parsed.topic }
            break
        }
      }
      
      return {
        path,
        reason: parsed.reason || 'AI classification',
        action_payload,
        chat_response: path === 'CHAT' ? (parsed.chat_response || undefined) : undefined,
        research_query: path === 'RESEARCH' ? (parsed.topic || query) : undefined
      }
    }
  } catch (error) {
    console.error('[Router Brain] Classification error:', error)
  }

  // Fallback to RESEARCH
  return {
    path: 'RESEARCH',
    reason: 'Fallback - could not classify',
    action_payload: null,
    research_query: query
  }
}

/**
 * Generate a conversational response for CHAT path
 */
async function generateChatResponse(
  query: string,
  projectName: string
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a friendly, helpful study companion AI called LeafAI. The user is working on their "${projectName}" project. Respond naturally and helpfully. Be warm, encouraging, and supportive. Keep responses concise (2-3 sentences).`
        },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 150
    })
    return completion.choices[0]?.message?.content?.trim() || "I'm here to help! Feel free to ask me anything about your studies. 📚"
  } catch (error) {
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
    console.error('[Tavily] API key not found in environment variables')
    console.error('[Tavily] Available env keys:', Object.keys(process.env).filter(k => k.includes('TAVILY') || k.includes('tavily')))
    return []
  }

  console.log('[Tavily] Searching for:', query)
  console.log('[Tavily] API key starts with:', apiKey.substring(0, 10) + '...')

  try {
    // Use official Tavily SDK
    const client = tavily({ apiKey })
    
    const response = await client.search(query, {
      searchDepth: 'advanced',
      maxResults: 8,
      includeAnswer: false,
      includeRawContent: false
    })

    console.log('[Tavily] Got', response.results?.length || 0, 'results')
    
    if (response.results && response.results.length > 0) {
      console.log('[Tavily] First result:', response.results[0].title)
    }
    
    return response.results || []
  } catch (error) {
    console.error('[Tavily] Search error:', error)
    return []
  }
}

// Rephrase user query for better search results
async function rephraseQuery(query: string, projectName: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a query optimizer. Transform user questions into optimal search queries. Output ONLY the search query, no explanation.'
        },
        {
          role: 'user',
          content: `Project context: ${projectName}\nUser query: ${query}\n\nOptimize this into a search query:`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    })

    return completion.choices[0]?.message?.content?.trim() || query
  } catch (error) {
    console.error('Query rephrase error:', error)
    return query
  }
}

// Synthesize answer from search results and notes
async function synthesizeAnswer(
  query: string,
  searchResults: TavilyResult[],
  projectName: string,
  notesContext?: Array<{ title: string; content: string }>
): Promise<{ answer: string; citations: Citation[] }> {
  // If no search results and no notes, return a message saying we couldn't find anything
  if ((!searchResults || searchResults.length === 0) && (!notesContext || notesContext.length === 0)) {
    console.log('[Synthesize] No search results or notes to synthesize from')
    return {
      answer: 'I couldn\'t find any relevant information for your query. Please try rephrasing your question or being more specific.',
      citations: []
    }
  }

  // Build context from search results
  const webContext = searchResults
    .slice(0, 6)
    .map((result, i) => `[${i + 1}] ${result.title}\nURL: ${result.url}\nContent: ${result.content}`)
    .join('\n\n---\n\n')

  // Build context from user notes
  let userNotesContext = ''
  if (notesContext && notesContext.length > 0) {
    userNotesContext = '\n\nUSER\'S NOTES FROM THIS PROJECT:\n' + notesContext.map(note => 
      `📝 ${note.title}:\n${note.content}`
    ).join('\n\n---\n\n')
  }

  // Build citations
  const citations: Citation[] = searchResults.slice(0, 6).map((result, i) => ({
    number: i + 1,
    title: result.title,
    url: result.url
  }))

  console.log('[Synthesize] Building answer from', searchResults.length, 'sources and', notesContext?.length || 0, 'notes')

  const hasNotes = notesContext && notesContext.length > 0

  try {
    const systemPrompt = `You are a research assistant that answers based on the provided search results${hasNotes ? ' AND the user\'s own notes from their project' : ''}.

CRITICAL RULES:
- Use information from the web search results provided below
${hasNotes ? '- IMPORTANT: Also reference and incorporate relevant information from the user\'s own notes when applicable\n- When using info from user notes, mention "Based on your notes..." or "Your notes mention..."\n' : ''}- Do NOT use your training data or prior knowledge beyond what's provided
- If the search results don't contain enough information, say "Based on the search results, I found limited information about this topic"
- Always cite web sources using [1], [2], etc. inline with your text
- Every claim from web sources must have a citation from the provided sources
- Include specific data, numbers, and quotes from the sources when available
- Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

FORMATTING RULES:
- Format your response in clear markdown with proper structure
- Start with a brief overview paragraph
- Use ## for main section headers (e.g., "## Overview", "## Key Points", "## Process")
- Use ### for subsections if needed
- Use bullet points (-) or numbered lists (1.) for listing information
- Use **bold** for emphasis on important terms
- Keep paragraphs concise (2-3 sentences max)
- Organize information logically with clear sections based on the topic`

    const userPrompt = `Question: ${query}

WEB SEARCH RESULTS (use ONLY these sources for citations):
${webContext}${userNotesContext}

Based on the search results${hasNotes ? ' and your notes' : ''} above, provide a comprehensive answer with citations:`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const answer = completion.choices[0]?.message?.content?.trim() || 'I could not generate an answer.'
    return { answer, citations }
  } catch (error) {
    console.error('Synthesis error:', error)
    return {
      answer: 'I encountered an error while generating the answer. Please try again.',
      citations: []
    }
  }
}

// Generate study set items from a topic
async function generateStudySet(
  topic: string,
  projectName: string,
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
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an educational content creator. Generate study materials based on the content provided.
Output ONLY valid JSON in this exact format:
{
  "flashcards": [
    {"term": "Key Concept", "definition": "Clear explanation"}
  ],
  "quizzes": [
    {"question": "Question text?", "correct_answer": "Correct option", "wrong_answers": ["Wrong 1", "Wrong 2", "Wrong 3"]}
  ]
}
Generate 8-10 flashcards and 5-6 quiz questions based on the actual content provided. Make the questions specific to the material.`
        },
        {
          role: 'user',
          content: `Project: ${projectName}\nTopic: ${topic}\n\nContent to create study materials from:\n${context}\n\nGenerate study materials (JSON only):`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })

    const content = completion.choices[0]?.message?.content || '{}'
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
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

// Detect if query is asking to create a study set
function isStudySetRequest(query: string): { isRequest: boolean; topic: string; fromNotes: boolean } {
  // Normalize query - remove extra spaces and convert to lowercase for matching
  const normalizedQuery = query.toLowerCase().trim()
  
  // Check for explicit study set creation keywords
  const hasStudySetKeyword = /(?:create|make|generate|build|give\s+me)\s+(?:a\s+|me\s+)?(?:study\s*set|flashcards?|quiz(?:zes)?)/i.test(query)
  
  // Check if user wants to create from their notes
  const fromNotesPattern = /(?:based\s+on|from|using)\s+(?:my\s+)?(?:notes?|content|material)/i.test(query)
  if (hasStudySetKeyword && fromNotesPattern) {
    return { isRequest: true, topic: 'my notes', fromNotes: true }
  }
  
  // Patterns with prepositions (highest priority - most specific)
  const patternsWithPrep = [
    /(?:create|make|generate|build|give\s+me)\s+(?:a\s+|me\s+)?(?:study\s*set|flashcards?|quiz(?:zes)?)\s+(?:about|on|for|covering|related\s+to)\s+(.+)/i,
    /(?:study\s*set|flashcards?|quiz(?:zes)?)\s+(?:about|on|for|covering|related\s+to)\s+(.+)/i,
  ]

  for (const pattern of patternsWithPrep) {
    const match = query.match(pattern)
    if (match) {
      const topic = match[1].trim().replace(/[?.!]+$/, '')
      // Check if extracted topic is about notes
      if (/^(?:my\s+)?notes?$/i.test(topic)) {
        return { isRequest: true, topic: 'my notes', fromNotes: true }
      }
      return { isRequest: true, topic, fromNotes: false }
    }
  }

  // Patterns without prepositions (e.g., "create study set biology", "biology flashcards")
  const patternsNoPrep = [
    /(?:create|make|generate|build|give\s+me)\s+(?:a\s+|me\s+)?(?:study\s*set|flashcards?|quiz(?:zes)?)\s+(?!about|on|for|covering)(.+)/i,
    /(.+?)\s+(?:study\s*set|flashcards?|quiz(?:zes)?)\s*$/i,
  ]

  for (const pattern of patternsNoPrep) {
    const match = query.match(pattern)
    if (match && hasStudySetKeyword) {
      const topic = match[1].trim().replace(/[?.!]+$/, '')
      // Filter out common filler words that might get captured
      if (topic && !['a', 'an', 'the', 'some', 'my', 'me'].includes(topic.toLowerCase())) {
        return { isRequest: true, topic, fromNotes: false }
      }
    }
  }

  // Final fallback: if it has study set keyword and meaningful content after removing the keyword
  if (hasStudySetKeyword) {
    const topicMatch = query.replace(/(?:create|make|generate|build|give\s+me)\s+(?:a\s+|me\s+)?(?:study\s*set|flashcards?|quiz(?:zes)?)\s*/gi, '').trim()
    if (topicMatch && topicMatch.length > 2) {
      return { isRequest: true, topic: topicMatch.replace(/[?.!]+$/, ''), fromNotes: false }
    }
    // If just "create study set" with no topic, assume from notes
    return { isRequest: true, topic: 'my notes', fromNotes: true }
  }

  return { isRequest: false, topic: '', fromNotes: false }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value

    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from session
    let userId: string | null = null

    const body = await request.json()
    const { query, projectId, projectName, notesContext, mode } = body as {
      query: string
      projectId?: string
      projectName?: string
      notesContext?: Array<{ title: string; content: string }>
      mode?: 'normal' | 'research'
    }

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get user - either from project ownership or from auth cookies
    if (projectId) {
      // Space-level search: get user from project ownership
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()
      
      userId = project?.user_id
    } else {
      // Global search: get user from auth cookies/header
      const cookieHeader = request.headers.get('cookie')
      
      if (cookieHeader) {
        // Parse the sb-auth-token cookie to get user
        const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/)
        if (tokenMatch) {
          try {
            const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]))
            if (tokenData && Array.isArray(tokenData) && tokenData[0]) {
              // Verify the token and get user
              const { data: { user } } = await supabase.auth.getUser(tokenData[0])
              userId = user?.id || null
            }
          } catch (e) {
            console.log('[Search API] Could not parse auth token')
          }
        }
      }
    }
    
    console.log('[Search API] User ID:', userId || 'anonymous')

    // SUBSCRIPTION CHECKS: Rate limiting & Research mode
    if (userId) {
      const subscription = await getUserSubscription(userId)
      const userIsPro = isPro(subscription)

      // Check research mode access
      if (mode === 'research' && !userIsPro) {
        return NextResponse.json(
          { 
            error: 'Research mode requires Atlas Pro. Upgrade to access deep research features.',
            upgradeRequired: true 
          },
          { status: 403 }
        )
      }

      // Rate limiting for free users
      if (!userIsPro) {
        const rateLimit = checkRateLimit(userId)
        
        if (!rateLimit.allowed) {
          return NextResponse.json(
            { 
              error: `Rate limit exceeded. Free tier is limited to ${FREE_TIER_RATE_LIMIT} searches per minute. Upgrade to Atlas Pro for unlimited searches.`,
              upgradeRequired: true,
              resetIn: Math.ceil(rateLimit.resetIn / 1000)
            },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000))
              }
            }
          )
        }

        // Add rate limit headers for free users
        console.log(`[Search API] Rate limit: ${rateLimit.remaining}/${FREE_TIER_RATE_LIMIT} remaining`)
      }
    }

    // ============================================
    // MULTI-PURPOSE ROUTER - Three Path Branching
    // ============================================
    
    const hasNotes = !!(notesContext && notesContext.length > 0)
    
    // === STEP 0: Route the request ===
    const classification = await classifyRequest(query, projectName || 'Global', hasNotes)
    console.log('[Search API] Router classification:', classification)

    // ============================================
    // PATH 1: CHAT (The "Human" Path)
    // ============================================
    if (classification.path === 'CHAT') {
      console.log('[Search API] Taking CHAT path - no web search')
      
      const chatResponse = classification.chat_response || await generateChatResponse(query, projectName || 'Study')
      
      return NextResponse.json({
        answer: chatResponse,
        citations: [],
        _debug: { path: 'CHAT', reason: classification.reason }
      })
    }

    // ============================================
    // PATH 2: COMMAND (The "App" Path)
    // ============================================
    if (classification.path === 'COMMAND') {
      console.log('[Search API] Taking COMMAND path - using internal context')
      
      const action = classification.action_payload
      
      // Handle: Create Study Set from Notes
      if (action?.type === 'create_study_set') {
        const topic = action.topic
        const fromNotes = action.fromNotes
        
        // CONTEXT AWARENESS: Check if we have enough info
        if (!topic && !fromNotes && !hasNotes) {
          return NextResponse.json({
            answer: "I'd love to create a study set for you! 📚\n\nPlease tell me:\n- **A topic**: \"Create a study set about photosynthesis\"\n- **Or from your notes**: \"Create flashcards from my notes\"\n\nWhat would you like to study?",
            citations: [],
            _debug: { path: 'COMMAND', needsClarification: true }
          })
        }
        
        // If from notes, use notes context (no web search!)
        if (fromNotes || (!topic && hasNotes)) {
          if (!hasNotes) {
            return NextResponse.json({
              answer: "You don't have any notes in this space yet. Add some notes, or ask me to search the web for a topic (e.g., 'Create a study set about photosynthesis').",
              citations: [],
              _debug: { path: 'COMMAND', noNotes: true }
            })
          }
          
          // Generate study set from NOTES, not web
          const materials = await generateStudySet(
            projectName || 'My Notes',
            projectName || 'Study',
            [], // No web results
            notesContext
          )
          
          let studySetCreated: { id: string; title: string; itemCount: number } | undefined
          
          if (materials.flashcards.length > 0 || materials.quizzes.length > 0) {
            if (userId && projectId) {
              const { data: studySet } = await supabase
                .from('study_sets')
                .insert({
                  user_id: userId,
                  project_id: projectId,
                  title: `${projectName || 'Notes'} Study Set`,
                  description: `Generated from ${notesContext?.length || 0} notes`,
                  source_type: 'notes'
                })
                .select()
                .single()
              
              if (studySet) {
                const flashcardItems = materials.flashcards.map(fc => ({
                  study_set_id: studySet.id,
                  item_type: 'flashcard',
                  content: { term: fc.term, definition: fc.definition }
                }))
                
                const quizItems = materials.quizzes.map(q => ({
                  study_set_id: studySet.id,
                  item_type: 'quiz',
                  content: {
                    question: q.question,
                    correct_answer: q.correct_answer,
                    wrong_answers: q.wrong_answers
                  }
                }))
                
                await supabase.from('study_items').insert([...flashcardItems, ...quizItems])
                
                studySetCreated = {
                  id: studySet.id,
                  title: studySet.title,
                  itemCount: flashcardItems.length + quizItems.length
                }
              }
            }
            
            return NextResponse.json({
              answer: `✅ **Study Set Created!**\n\nI've created a study set from your notes with:\n- **${materials.flashcards.length}** flashcards\n- **${materials.quizzes.length}** quiz questions\n\nYou can find it in your study materials!`,
              citations: [],
              studySetCreated,
              _debug: { path: 'COMMAND', action: 'create_study_set_from_notes' }
            })
          } else {
            return NextResponse.json({
              answer: "I couldn't generate enough content from your notes. Try adding more detailed notes first! 📝",
              citations: [],
              _debug: { path: 'COMMAND', noContent: true }
            })
          }
        }
        
        // If topic provided, fall through to RESEARCH path
        classification.path = 'RESEARCH' as RouterPath
        classification.research_query = topic
      }
      
      // Handle: Summarize Notes
      if (action?.type === 'summarize_notes') {
        if (!hasNotes) {
          return NextResponse.json({
            answer: "I don't see any notes to summarize in this space. Add some notes first! 📝",
            citations: [],
            _debug: { path: 'COMMAND', noNotes: true }
          })
        }
        
        const summary = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Summarize these study notes concisely and clearly.' },
            { role: 'user', content: notesContext?.map(n => `## ${n.title}\n${n.content}`).join('\n\n') || '' }
          ],
          max_tokens: 800
        })
        
        return NextResponse.json({
          answer: summary.choices[0]?.message?.content || "I couldn't generate a summary.",
          citations: [],
          _debug: { path: 'COMMAND', action: 'summarize_notes' }
        })
      }
    }

    // ============================================
    // PATH 3: RESEARCH (The "Search" Path)
    // ============================================
    console.log('[Search API] Taking RESEARCH path - searching the web')
    
    const isStudySetFromWeb = classification.action_payload?.type === 'create_study_set' && classification.action_payload.topic
    const searchTopic = classification.research_query || query
    
    let studySetCreated: { id: string; title: string; itemCount: number } | undefined

    console.log('[Search API] Original query:', query)
    console.log('[Search API] Search topic:', searchTopic)

    // Step 1: Rephrase query for better search
    const searchQuery = isStudySetFromWeb
      ? searchTopic
      : await rephraseQuery(query, projectName || 'General Study')

    console.log('[Search API] Optimized search query:', searchQuery)

    // Step 2: Search the web
    const searchResults = await searchWeb(searchQuery)
    
    console.log('[Search API] Search results count:', searchResults.length)
    
    // If no results, try searching with the original query
    let finalResults = searchResults
    if (searchResults.length === 0) {
      console.log('[Search API] No results, trying original query...')
      finalResults = await searchWeb(query)
      console.log('[Search API] Retry results count:', finalResults.length)
    }

    // Step 3: If study set request from web, generate and save study materials
    if (isStudySetFromWeb && userId) {
      const materials = await generateStudySet(
        searchTopic, 
        projectName || 'Study', 
        finalResults,
        undefined
      )
      
      if (materials.flashcards.length > 0 || materials.quizzes.length > 0) {
        // Create study set
        const studySetTitle = searchTopic
        const studySetDescription = `Generated from search: ${query}`
        
        const { data: studySet, error: setError } = await supabase
          .from('study_sets')
          .insert({
            user_id: userId,
            project_id: projectId,
            title: studySetTitle,
            description: studySetDescription,
            source_type: 'ai_generated'
          })
          .select()
          .single()

        if (studySet && !setError) {
          // Insert flashcards
          const flashcardItems = materials.flashcards.map(fc => ({
            study_set_id: studySet.id,
            item_type: 'flashcard',
            content: {
              term: fc.term,
              definition: fc.definition
            }
          }))

          // Insert quiz items
          const quizItems = materials.quizzes.map(q => ({
            study_set_id: studySet.id,
            item_type: 'quiz',
            content: {
              question: q.question,
              correct_answer: q.correct_answer,
              wrong_answers: q.wrong_answers
            }
          }))

          await supabase.from('study_items').insert([...flashcardItems, ...quizItems])

          studySetCreated = {
            id: studySet.id,
            title: studySetTitle,
            itemCount: flashcardItems.length + quizItems.length
          }
        }
      }
    }

    // Step 4: Synthesize answer from search results and notes
    const { answer, citations } = await synthesizeAnswer(
      query,
      finalResults,
      projectName || 'Study',
      notesContext
    )

    // Step 5: Log search to history (for Atlas Intelligence)
    if (userId && projectId) {
      try {
        await supabase.from('ai_search_history').insert({
          user_id: userId,
          project_id: projectId,
          query,
          search_query: searchQuery,
          answer,
          citations,
          sources_count: finalResults.length,
          study_set_id: studySetCreated?.id || null
        })
      } catch (logError) {
        // Table might not exist yet, that's okay
        console.log('Could not log search history:', logError)
      }
    }

    console.log('[Search API] Returning response with', citations.length, 'citations')

    return NextResponse.json({
      answer,
      citations,
      studySetCreated,
      _debug: {
        searchQuery,
        sourcesFound: finalResults.length,
        tavilyConfigured: !!process.env.TAVILY_API_KEY
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
