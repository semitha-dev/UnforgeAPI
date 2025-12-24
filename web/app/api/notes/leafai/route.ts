import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import Groq from 'groq-sdk'
import { getValidTokenBalance, deductTokensWithExpiry, calculateOutputTokenCost, countWords, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription'
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger'

// Initialize Groq - 100% FREE!
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

// Models optimized for production - high rate limits
const PRIMARY_MODEL = 'llama-3.1-8b-instant' // 14,400 requests/day, fast
const HEAVY_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct' // Better quality, 30K tokens/min
const FILE_MODEL = 'llama-3.3-70b-versatile' // Best for file/document analysis, 70B params

// Helper function to generate with fallback
async function generateWithFallback(
  prompt: string, 
  modelName: string
): Promise<{ text: string; model: string }> {
  // Try requested model
  try {
    console.log('[LeafAI Notes] Using model:', modelName)
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7,
    })
    return { text: completion.choices[0]?.message?.content || '', model: modelName }
  } catch (primaryError: any) {
    console.error('[LeafAI Notes] Primary model failed:', primaryError.message)
    
    // Try fallback model
    const fallbackModel = modelName === PRIMARY_MODEL ? HEAVY_MODEL : PRIMARY_MODEL
    try {
      console.log('[LeafAI Notes] Trying fallback:', fallbackModel)
      const completion = await groq.chat.completions.create({
        model: fallbackModel,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
      })
      return { text: completion.choices[0]?.message?.content || '', model: fallbackModel }
    } catch (fallbackError: any) {
      console.error('[LeafAI Notes] Fallback also failed:', fallbackError.message)
      
      if (fallbackError?.status === 429) {
        throw new Error('RATE_LIMITED')
      }
      throw fallbackError
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const { ip, userAgent } = getRequestInfo(request)
  
  try {
    console.log('[LeafAI Notes] Starting request...')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[LeafAI Notes] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[LeafAI Notes] User:', user.id)

    const body = await request.json()
    const { noteContent, noteTitle, userMessage, mode, action, isGlobal } = body
    console.log('[LeafAI Notes] Request:', { noteTitle, mode, action, isGlobal })

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check user's token balance
    console.log('[LeafAI Notes] Checking token balance...')
    const validBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI Notes] Valid balance:', validBalance)
    
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      return NextResponse.json({ 
        error: `Insufficient tokens. You need at least ${MIN_TOKENS_TO_GENERATE} tokens. Current balance: ${validBalance}`,
        tokensRequired: MIN_TOKENS_TO_GENERATE,
        currentBalance: validBalance
      }, { status: 402 })
    }

    // Select model based on mode
    const modelName = mode === 'heavy' ? HEAVY_MODEL : PRIMARY_MODEL
    console.log('[LeafAI Notes] Using model:', modelName)

    let prompt = ''
    
    // Different context for global vs note-specific usage
    if (isGlobal) {
      // Global assistant - no note context
      const systemContext = `You are Leaf AI, a friendly and knowledgeable personal learning assistant. You help students with their studies, answer questions about any topic, explain concepts, help with homework, and provide study tips.

Your personality:
- Friendly and encouraging
- Patient and thorough in explanations
- Uses examples to clarify complex topics
- Breaks down difficult concepts into simpler parts
- Celebrates learning progress

`
      if (action === 'generate') {
        prompt = `${systemContext}
The user wants you to help them with: "${userMessage}"

Provide helpful, well-structured content. Use proper formatting with headers, bullet points, or numbered lists where appropriate. Write in a clear, educational style.`
      } else {
        prompt = `${systemContext}
The user asks: "${userMessage}"

Provide a helpful, educational response. Be conversational but informative. If it's a complex topic, break it down into understandable parts.`
      }
    } else {
      // Note-specific context
      const systemContext = `You are Leaf AI, a helpful writing and study assistant. You're helping the user with their note titled "${noteTitle || 'Untitled'}".

Current note content:
${noteContent || '(Empty note)'}

`

      if (action === 'generate') {
        // Generate content for the note
        prompt = `${systemContext}
The user wants you to generate content for their note based on this request: "${userMessage}"

Write helpful, well-structured content that can be directly added to their note. Use proper formatting with headers, bullet points, or numbered lists where appropriate. Write in a clear, educational style.

Important: Only output the content to be added to the note, no explanations or preambles.`
      } else if (action === 'chat') {
        // Answer questions about the note
        prompt = `${systemContext}
The user has a question about their note: "${userMessage}"

Provide a helpful, concise answer. If the question relates to the note content, reference specific parts. If it's a general question related to the topic, provide useful information. Be conversational but informative.`
      }
    }
    
    if (!prompt) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    console.log('[LeafAI Notes] Generating content...')
    
    let text = ''
    let modelUsed = ''
    try {
      const result = await generateWithFallback(prompt, modelName)
      text = result.text
      modelUsed = result.model
      console.log('[LeafAI Notes] Generated response length:', text.length)
    } catch (genError: any) {
      if (genError.message === 'RATE_LIMITED') {
        return NextResponse.json({ 
          error: 'AI service is temporarily busy. Please wait a minute and try again.',
          retryAfter: 60
        }, { status: 429 })
      }
      return NextResponse.json({ 
        error: `AI generation failed: ${genError.message}` 
      }, { status: 500 })
    }

    // Calculate token cost based on output word count
    const outputWords = countWords(text)
    let tokenCost = calculateOutputTokenCost(outputWords)
    console.log('[LeafAI Notes] Output words:', outputWords, 'Token cost:', tokenCost)
    
    // Double the cost for heavy mode
    if (mode === 'heavy') {
      tokenCost = tokenCost * 2
    }
    
    // Minimum cost
    tokenCost = Math.max(tokenCost, mode === 'heavy' ? 2 : 1)
    console.log('[LeafAI Notes] Final token cost:', tokenCost)

    // Deduct tokens using FIFO system
    console.log('[LeafAI Notes] Deducting tokens...')
    const deductSuccess = await deductTokensWithExpiry(user.id, tokenCost)
    console.log('[LeafAI Notes] Deduct success:', deductSuccess)
    
    if (!deductSuccess) {
      console.error('[LeafAI Notes] Token deduction failed')
    }

    // Get updated balance
    const newBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI Notes] New balance:', newBalance)

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: action === 'generate' ? ActionTypes.LEAF_AI_GENERATE : ActionTypes.LEAF_AI_CHAT,
      endpoint: '/api/notes/leafai',
      method: 'POST',
      tokens_used: tokenCost,
      model: modelUsed,
      metadata: { action, mode, isGlobal, outputWords, provider: 'groq' },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 200,
      duration_ms: Date.now() - startTime,
    })

    return NextResponse.json({
      response: text,
      tokensUsed: tokenCost,
      remainingTokens: newBalance,
      mode,
      model: modelUsed,
      provider: 'groq'
    })
  } catch (error: any) {
    console.error('[LeafAI Notes] Unexpected error:', error.message)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    )
  }
}
