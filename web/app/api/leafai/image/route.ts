import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getValidTokenBalance, deductTokensWithExpiry, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription'
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger'

// Initialize Gemini AI instances
const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4,
  process.env.GEMINI_API_KEY5,
].filter(Boolean) as string[]

const genAIInstances = apiKeys.map(key => new GoogleGenerativeAI(key))

// Image generation model
const IMAGE_MODEL = 'gemini-2.0-flash-exp'

// Helper function to generate image with fallback across API keys
async function generateImageWithFallback(
  prompt: string
): Promise<{ imageData: string; mimeType: string }> {
  
  for (let keyIndex = 0; keyIndex < genAIInstances.length; keyIndex++) {
    const instance = genAIInstances[keyIndex]
    const keyLabel = keyIndex === 0 ? 'primary' : `key${keyIndex + 1}`
    
    try {
      console.log(`[LeafAI Image] Trying ${keyLabel} API key with model:`, IMAGE_MODEL)
      
      const model = instance.getGenerativeModel({ 
        model: IMAGE_MODEL,
        generationConfig: {
          // @ts-ignore - responseModalities is a valid config for image generation
          responseModalities: ['image', 'text'],
        }
      })
      
      const result = await model.generateContent(prompt)
      const response = result.response
      
      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts || []
      
      for (const part of parts) {
        // @ts-ignore - inlineData exists for image responses
        if (part.inlineData) {
          console.log(`[LeafAI Image] Success with ${keyLabel}`)
          return {
            // @ts-ignore
            imageData: part.inlineData.data,
            // @ts-ignore
            mimeType: part.inlineData.mimeType || 'image/png'
          }
        }
      }
      
      throw new Error('No image in response')
    } catch (error: any) {
      console.error(`[LeafAI Image] ${keyLabel} failed:`, error.message)
      // Continue to next key
    }
  }
  
  throw new Error('IMAGE_GENERATION_FAILED')
}

export async function POST(request: NextRequest) {
  console.log('[LeafAI Image] Starting request...')
  
  try {
    // Get user session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[LeafAI Image] Unauthorized:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[LeafAI Image] User:', user.id)

    // Parse request body
    const body = await request.json()
    const { prompt, projectId } = body
    
    console.log('[LeafAI Image] Prompt length:', prompt?.length)

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Check token balance
    console.log('[LeafAI Image] Checking token balance...')
    const validBalance = await getValidTokenBalance(user.id)
    
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      console.log('[LeafAI Image] Insufficient balance:', validBalance)
      return NextResponse.json({ 
        error: 'Insufficient tokens',
        currentBalance: validBalance
      }, { status: 402 })
    }
    console.log('[LeafAI Image] Valid balance:', validBalance)

    // Generate image
    console.log('[LeafAI Image] Generating image...')
    
    const imagePrompt = `Generate an image based on this description: ${prompt}. 
Create a high-quality, educational, and visually appealing image.`

    const { imageData, mimeType } = await generateImageWithFallback(imagePrompt)
    
    // Deduct tokens (image generation costs more)
    const tokenCost = 100 // Fixed cost for image generation
    await deductTokensWithExpiry(user.id, tokenCost)
    console.log(`[LeafAI Image] Deducted ${tokenCost} tokens`)

    // Log activity
    const requestInfo = getRequestInfo(request)
    await logActivity({
      user_id: user.id,
      action_type: ActionTypes.AI_IMAGE_GENERATED,
      tokens_used: tokenCost,
      model: IMAGE_MODEL,
      metadata: {
        promptLength: prompt.length,
        projectId
      },
      ip_address: requestInfo.ip,
      user_agent: requestInfo.userAgent
    })

    return NextResponse.json({
      success: true,
      image: {
        data: imageData,
        mimeType
      },
      tokensUsed: tokenCost,
      newBalance: validBalance - tokenCost
    })

  } catch (error: any) {
    console.error('[LeafAI Image] Error:', error)
    
    if (error.message === 'IMAGE_GENERATION_FAILED') {
      return NextResponse.json({ 
        error: 'Image generation failed. Please try again later.',
        details: 'All API keys exhausted'
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate image',
      details: error.message 
    }, { status: 500 })
  }
}
