import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { getValidTokenBalance, deductTokensWithExpiry, calculateOutputTokenCost, countWords, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription'
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger'

// Initialize Gemini AI instances - supports up to 5 API keys for redundancy
const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
  process.env.GEMINI_API_KEY4,
  process.env.GEMINI_API_KEY5,
].filter(Boolean) as string[]

const genAIInstances = apiKeys.map(key => new GoogleGenerativeAI(key))

// Legacy exports for backward compatibility
const genAI = genAIInstances[0] || new GoogleGenerativeAI('')
const genAI2 = genAIInstances[1] || null

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  files?: {
    type: string
    name: string
    data: string // base64 encoded
  }[]
}

// Primary model for Leaf AI chat
const PRIMARY_MODEL = 'gemini-2.5-flash'

// Fallback models in order of preference
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash']

// Helper to try a single model with a specific API instance
async function tryModel(
  genAIInstance: GoogleGenerativeAI,
  modelName: string,
  parts: Part[],
  history: { role: string; parts: Part[] }[]
): Promise<string> {
  const model = genAIInstance.getGenerativeModel({ model: modelName })
  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: msg.parts
    }))
  })
  const result = await chat.sendMessage(parts)
  return result.response.text()
}

// Helper function to try generation with fallback across ALL available API keys
async function generateWithFallback(
  parts: Part[], 
  modelName: string,
  history: { role: string; parts: Part[] }[]
): Promise<{ text: string; usedFallbackKey: boolean }> {
  
  // Build list of models to try (requested model first, then fallbacks)
  const modelsToTry = [modelName, ...FALLBACK_MODELS.filter(m => m !== modelName)]
  
  // Try each API key with all models before moving to the next key
  for (let keyIndex = 0; keyIndex < genAIInstances.length; keyIndex++) {
    const instance = genAIInstances[keyIndex]
    const keyLabel = keyIndex === 0 ? 'primary' : `key${keyIndex + 1}`
    
    for (const model of modelsToTry) {
      try {
        console.log(`[LeafAI Chat] Trying ${keyLabel} API key with model:`, model)
        const text = await tryModel(instance, model, parts, history)
        console.log(`[LeafAI Chat] Success with ${keyLabel}, model:`, model)
        return { text, usedFallbackKey: keyIndex > 0 }
      } catch (error: any) {
        // Log full error for debugging
        console.error(`[LeafAI Chat] ${keyLabel} failed with ${model}:`, error.message)
        // Continue to next model/key
      }
    }
  }
  
  // All attempts failed
  console.error(`[LeafAI Chat] All ${genAIInstances.length} API keys exhausted across ${modelsToTry.length} models`)
  throw new Error('RATE_LIMITED')
}

// Convert file to Gemini-compatible format
function fileToGenerativePart(base64Data: string, mimeType: string): Part {
  // Remove data URL prefix if present
  const base64Content = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data
    
  return {
    inlineData: {
      data: base64Content,
      mimeType
    }
  }
}

// Get MIME type from file type or name
function getMimeType(fileType: string, fileName: string): string {
  // If file type is provided and valid, use it
  if (fileType && fileType !== 'application/octet-stream') {
    return fileType
  }
  
  // Infer from extension
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    // Spreadsheets
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    // Presentations
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const { ip, userAgent } = getRequestInfo(request)
  
  try {
    console.log('[LeafAI Chat] Starting request...')
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('[LeafAI Chat] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[LeafAI Chat] User:', user.id)

    const body = await request.json()
    const { message, files, history, mode } = body as {
      message: string
      files?: { type: string; name: string; data: string }[]
      history?: ChatMessage[]
      mode?: 'light' | 'heavy'
    }
    
    console.log('[LeafAI Chat] Request:', { 
      messageLength: message?.length, 
      filesCount: files?.length || 0,
      historyLength: history?.length || 0,
      mode 
    })

    if (!message && (!files || files.length === 0)) {
      return NextResponse.json({ error: 'Message or files required' }, { status: 400 })
    }

    // Check user's token balance
    console.log('[LeafAI Chat] Checking token balance...')
    const validBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI Chat] Valid balance:', validBalance)
    
    // Files cost more tokens
    const fileCount = files?.length || 0
    const minRequired = MIN_TOKENS_TO_GENERATE + (fileCount * 2)
    
    if (validBalance < minRequired) {
      return NextResponse.json({ 
        error: `Insufficient tokens. You need at least ${minRequired} tokens. Current balance: ${validBalance}`,
        tokensRequired: minRequired,
        currentBalance: validBalance
      }, { status: 402 })
    }

    // Select model - use gemini-2.5-flash for all modes
    const modelName = PRIMARY_MODEL
    console.log('[LeafAI Chat] Using model:', modelName)

    // Build parts array for the message
    const messageParts: Part[] = []
    
    // Add system context as the first part
    const systemContext = `You are Leaf AI, a powerful and friendly AI assistant for LeafLearning - an educational platform. You can:
- Analyze images, PDFs, and documents that users share with you
- Answer questions about uploaded content
- Help with studying, homework, and learning any topic
- Explain complex concepts in simple terms
- Generate study materials, summaries, and explanations

Your personality:
- Friendly, encouraging, and patient
- Thorough but concise in explanations
- Uses examples and analogies to clarify concepts
- Celebrates learning progress
- Professional but approachable

When analyzing files:
- For images: Describe what you see, answer questions about the content, extract text if present
- For PDFs/Documents: Summarize key points, answer questions about the content, help understand complex parts
- Be specific and reference actual content from the files

Current message from user:`

    // Add text message
    if (message) {
      messageParts.push({ text: `${systemContext}\n\n${message}` })
    }
    
    // Add files
    if (files && files.length > 0) {
      for (const file of files) {
        const mimeType = getMimeType(file.type, file.name)
        console.log('[LeafAI Chat] Processing file:', file.name, 'MIME:', mimeType)
        
        // Add file part
        messageParts.push(fileToGenerativePart(file.data, mimeType))
        
        // Add context about the file
        messageParts.push({ text: `\n[Attached file: ${file.name}]` })
      }
    }

    // Convert history to Gemini format
    const geminiHistory: { role: string; parts: Part[] }[] = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    console.log('[LeafAI Chat] Generating response with', messageParts.length, 'parts')
    
    let text = ''
    try {
      const result = await generateWithFallback(messageParts, modelName, geminiHistory)
      text = result.text
      console.log('[LeafAI Chat] Generated response length:', text.length, 'Used fallback:', result.usedFallbackKey)
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

    // Calculate token cost
    const outputWords = countWords(text)
    let tokenCost = calculateOutputTokenCost(outputWords)
    
    // Add cost for files (2 tokens per file)
    tokenCost += fileCount * 2
    
    // Double cost for heavy mode
    if (mode === 'heavy') {
      tokenCost = tokenCost * 2
    }
    
    // Minimum cost
    tokenCost = Math.max(tokenCost, mode === 'heavy' ? 2 : 1)
    console.log('[LeafAI Chat] Token cost:', tokenCost, '(output words:', outputWords, ', files:', fileCount, ')')

    // Deduct tokens
    console.log('[LeafAI Chat] Deducting tokens...')
    const deductSuccess = await deductTokensWithExpiry(user.id, tokenCost)
    console.log('[LeafAI Chat] Deduct success:', deductSuccess)
    
    if (!deductSuccess) {
      console.error('[LeafAI Chat] Token deduction failed for user:', user.id)
    }

    // Get updated balance
    const newBalance = await getValidTokenBalance(user.id)
    console.log('[LeafAI Chat] New balance:', newBalance)

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.LEAF_AI_CHAT,
      endpoint: '/api/leafai/chat',
      method: 'POST',
      tokens_used: tokenCost,
      model: modelName,
      metadata: { 
        mode, 
        outputWords,
        filesCount: fileCount,
        fileTypes: files?.map(f => f.type) || []
      },
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
    console.error('[LeafAI Chat] Unexpected error:', error.message)
    console.error('[LeafAI Chat] Error stack:', error.stack)
    return NextResponse.json(
      { error: `Failed to process request: ${error.message}` },
      { status: 500 }
    )
  }
}
