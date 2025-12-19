import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getValidTokenBalance, deductTokensWithExpiry, calculateOutputTokenCost, countWords, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription'
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger'

// Primary and fallback API keys
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const genAI2 = process.env.GEMINI_API_KEY2 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY2) 
  : null

// Helper function to try generation with fallback
async function generateWithFallback(
  prompt: string, 
  modelName: string
): Promise<{ text: string; usedFallbackKey: boolean }> {
  const fallbackModel = 'gemini-2.5-flash-lite'
  
  // Try primary API key
  try {
    console.log('[LeafAI] Trying primary API key with model:', modelName)
    const model = genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent(prompt)
    return { text: result.response.text(), usedFallbackKey: false }
  } catch (primaryError: any) {
    console.error('[LeafAI] Primary API error:', primaryError.message)
    
    const isRateLimit = primaryError.message?.includes('429') || 
                        primaryError.message?.includes('quota') || 
                        primaryError.message?.includes('Too Many Requests')
    
    if (isRateLimit && genAI2) {
      // Try fallback API key
      console.log('[LeafAI] Rate limited on primary, trying GEMINI_API_KEY2...')
      try {
        const fallbackKeyModel = genAI2.getGenerativeModel({ model: modelName })
        const result = await fallbackKeyModel.generateContent(prompt)
        console.log('[LeafAI] Fallback API key succeeded!')
        return { text: result.response.text(), usedFallbackKey: true }
      } catch (fallbackKeyError: any) {
        console.error('[LeafAI] Fallback API key also failed:', fallbackKeyError.message)
        
        // Try gemini-2.5-flash-lite on fallback key
        if (modelName !== fallbackModel) {
          console.log(`[LeafAI] Trying ${fallbackModel} on fallback key...`)
          try {
            const lastResort = genAI2.getGenerativeModel({ model: fallbackModel })
            const result = await lastResort.generateContent(prompt)
            return { text: result.response.text(), usedFallbackKey: true }
          } catch (e) {
            // Fall through
          }
        }
      }
    }
    
    // Try gemini-2.5-flash-lite on primary key
    if (modelName !== fallbackModel) {
      console.log(`[LeafAI] Trying ${fallbackModel} on primary key...`)
      try {
        const fallbackModelInstance = genAI.getGenerativeModel({ model: fallbackModel })
        const result = await fallbackModelInstance.generateContent(prompt)
        return { text: result.response.text(), usedFallbackKey: false }
      } catch (e) {
        // Fall through
      }
    }
    
    // All attempts failed
    if (isRateLimit) {
      throw new Error('RATE_LIMITED')
    }
    throw primaryError
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const { ip, userAgent } = getRequestInfo(request)
  
  try {
    console.log('[LeafAI] Starting request...')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[LeafAI] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[LeafAI] User:', user.id)

    const body = await request.json()
    const { noteContent, noteTitle, userMessage, mode, action, isGlobal } = body
    console.log('[LeafAI] Request body:', { noteTitle, mode, action, isGlobal, messageLength: userMessage?.length, contentLength: noteContent?.length })

    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check user's token balance using the proper utility function
    console.log('[LeafAI] Checking token balance...')
    const validBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI] Valid balance:', validBalance)
    
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      return NextResponse.json({ 
        error: `Insufficient tokens. You need at least ${MIN_TOKENS_TO_GENERATE} tokens. Current balance: ${validBalance}`,
        tokensRequired: MIN_TOKENS_TO_GENERATE,
        currentBalance: validBalance
      }, { status: 402 })
    }

    // Select model based on mode - Heavy uses pro model
    const modelName = mode === 'heavy' ? 'gemini-1.5-pro' : 'gemini-2.0-flash'
    console.log('[LeafAI] Using model:', modelName)

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

    console.log('[LeafAI] Generating content with prompt length:', prompt.length)
    
    let text = ''
    try {
      const result = await generateWithFallback(prompt, modelName)
      text = result.text
      console.log('[LeafAI] Generated response length:', text.length, 'Used fallback key:', result.usedFallbackKey)
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
    console.log('[LeafAI] Output words:', outputWords, 'Token cost:', tokenCost)
    
    // Double the cost for heavy mode
    if (mode === 'heavy') {
      tokenCost = tokenCost * 2
    }
    
    // Minimum cost
    tokenCost = Math.max(tokenCost, mode === 'heavy' ? 2 : 1)
    console.log('[LeafAI] Final token cost:', tokenCost)

    // Deduct tokens using FIFO system
    console.log('[LeafAI] Deducting tokens...')
    const deductSuccess = await deductTokensWithExpiry(user.id, tokenCost)
    console.log('[LeafAI] Deduct success:', deductSuccess)
    
    if (!deductSuccess) {
      // Still return the response but warn about token deduction failure
      console.error('[LeafAI] Token deduction failed for user:', user.id)
    }

    // Get updated balance
    const newBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI] New balance:', newBalance)

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: action === 'generate' ? ActionTypes.LEAF_AI_GENERATE : ActionTypes.LEAF_AI_CHAT,
      endpoint: '/api/notes/leafai',
      method: 'POST',
      tokens_used: tokenCost,
      model: mode === 'heavy' ? 'gemini-1.5-pro' : 'gemini-2.0-flash',
      metadata: { action, mode, isGlobal, outputWords },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 200,
      duration_ms: Date.now() - startTime,
    })

    return NextResponse.json({
      response: text,
      tokensUsed: tokenCost,
      remainingTokens: newBalance,
      mode
    })
  } catch (error: any) {
    console.error('[LeafAI] Unexpected error:', error.message)
    console.error('[LeafAI] Error stack:', error.stack)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    )
  }
}
