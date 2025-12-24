import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'

// Image generation is NOT supported by Groq (free tier)
// This endpoint exists for future when we add a paid image API

export async function POST(request: NextRequest) {
  console.log('[LeafAI Image] Request received - feature disabled')
  
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Image generation is not available with Groq
    return NextResponse.json({ 
      error: 'Image generation is currently unavailable. Leaf AI uses text-based responses only.',
      suggestion: 'Try asking me to describe, explain, or help with text-based content instead!'
    }, { status: 501 })

  } catch (error: any) {
    console.error('[LeafAI Image] Error:', error)
    return NextResponse.json({ 
      error: 'Image generation is not available' 
    }, { status: 501 })
  }
}
