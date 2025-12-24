import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import Groq from 'groq-sdk'
import { getValidTokenBalance, deductTokensWithExpiry, countWords, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription'
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger'

// Initialize Groq (100% FREE!)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

// Models - optimized for production
const PRIMARY_MODEL = 'llama-3.1-8b-instant' // Fast, 14.4K requests/day
const FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct' // Quality, 30K tokens/min

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  files?: {
    type: string
    name: string
    data: string
  }[]
}

// System prompt for Leaf AI
const SYSTEM_PROMPT = `You are Leaf AI, a powerful and friendly AI assistant for LeafLearning - an educational platform. You can:
- Answer questions about any topic
- Help with studying, homework, and learning
- Explain complex concepts in simple terms
- Generate study materials, summaries, and explanations

Your personality:
- Friendly, encouraging, and patient
- Thorough but concise in explanations
- Uses examples and analogies to clarify concepts
- Celebrates learning progress
- Professional but approachable

When users share files or documents, analyze them carefully and provide helpful insights.
Use markdown formatting for better readability (headers, bullet points, code blocks, etc.).`

// Generate response with fallback
async function generateResponse(
  message: string,
  history: { role: string; content: string }[],
  mode: 'light' | 'heavy'
): Promise<{ text: string; model: string }> {
  const model = mode === 'heavy' ? FALLBACK_MODEL : PRIMARY_MODEL
  
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ]
  
  // Add chat history
  for (const msg of history) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    })
  }
  
  // Add current message
  messages.push({ role: 'user', content: message })
  
  try {
    console.log(`[LeafAI Chat] Using model: ${model}`)
    const completion = await groq.chat.completions.create({
      model,
      messages,
      max_tokens: mode === 'heavy' ? 4096 : 2048,
      temperature: 0.7,
    })
    
    const text = completion.choices[0]?.message?.content || ''
    console.log(`[LeafAI Chat] Success with ${model}`)
    return { text, model }
  } catch (error: any) {
    console.error(`[LeafAI Chat] ${model} failed:`, error.message)
    
    // Try fallback model
    if (model === PRIMARY_MODEL) {
      console.log(`[LeafAI Chat] Trying fallback: ${FALLBACK_MODEL}`)
      const completion = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      })
      
      const text = completion.choices[0]?.message?.content || ''
      console.log(`[LeafAI Chat] Success with fallback ${FALLBACK_MODEL}`)
      return { text, model: FALLBACK_MODEL }
    }
    
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('[LeafAI Chat] Starting request...')
  
  try {
    // Get user session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[LeafAI Chat] Unauthorized:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[LeafAI Chat] User:', user.id)

    // Parse request body
    const body = await request.json()
    const { message, files, history, mode = 'light' } = body
    
    console.log('[LeafAI Chat] Request:', { 
      messageLength: message?.length, 
      filesCount: files?.length || 0,
      historyLength: history?.length || 0,
      mode 
    })

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check token balance
    console.log('[LeafAI Chat] Checking token balance...')
    const validBalance = await getValidTokenBalance(user.id)
    
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      console.log('[LeafAI Chat] Insufficient balance:', validBalance)
      return NextResponse.json({ 
        error: 'Insufficient tokens',
        currentBalance: validBalance
      }, { status: 402 })
    }
    console.log('[LeafAI Chat] Valid balance:', validBalance)

    // Build the message with file context
    let fullMessage = message
    
    // Add file descriptions if present (Groq doesn't support images directly yet)
    if (files && files.length > 0) {
      const fileDescriptions = files.map((f: any) => 
        `[Attached file: ${f.name} (${f.type})]`
      ).join('\n')
      fullMessage = `${fileDescriptions}\n\n${message}`
    }

    // Generate response
    const { text, model } = await generateResponse(
      fullMessage,
      history || [],
      mode
    )

    console.log('[LeafAI Chat] Generated response length:', text.length)

    // Calculate and deduct tokens
    const outputWords = countWords(text)
    const fileTokens = (files?.length || 0) * 10
    const tokenCost = Math.ceil(outputWords / 4) + fileTokens + (mode === 'heavy' ? 10 : 5)
    
    console.log('[LeafAI Chat] Token cost:', tokenCost)
    
    const deductSuccess = await deductTokensWithExpiry(user.id, tokenCost)
    console.log('[LeafAI Chat] Deduct success:', deductSuccess)

    // Get new balance
    const newBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI Chat] New balance:', newBalance)

    // Log activity
    const requestInfo = getRequestInfo(request)
    await logActivity({
      user_id: user.id,
      action_type: ActionTypes.LEAF_AI_CHAT,
      tokens_used: tokenCost,
      model,
      metadata: {
        messageLength: message.length,
        responseLength: text.length,
        filesCount: files?.length || 0,
        mode,
        provider: 'groq'
      },
      ip_address: requestInfo.ip,
      user_agent: requestInfo.userAgent
    })

    return NextResponse.json({
      response: text,
      tokensUsed: tokenCost,
      remainingTokens: newBalance,
      model,
      provider: 'groq'
    })

  } catch (error: any) {
    console.error('[LeafAI Chat] Error:', error)
    
    if (error.message === 'RATE_LIMITED') {
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable. Please try again.',
      }, { status: 429 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate response',
      details: error.message 
    }, { status: 500 })
  }
}
