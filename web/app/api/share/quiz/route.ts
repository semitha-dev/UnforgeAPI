import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/app/lib/supabaseServer'

// Public client for reading shared content (no auth required)
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Get shared quiz by token (public access)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 })
    }

    // Fetch the quiz by share token
    const { data: quiz, error: quizError } = await supabasePublic
      .from('quizzes')
      .select('id, title, description, question_count, created_at')
      .eq('share_token', token)
      .eq('is_public', true)
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found or not shared' }, { status: 404 })
    }

    // Fetch the questions
    const { data: questions, error: questionsError } = await supabasePublic
      .from('quiz_questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order')
      .eq('quiz_id', quiz.id)
      .order('question_order', { ascending: true })

    if (questionsError) {
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }

    return NextResponse.json({ quiz, questions })
  } catch (error) {
    console.error('Error fetching shared quiz:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate or toggle share link for a quiz (requires auth)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId, action } = await request.json()

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existingQuiz, error: fetchError } = await supabase
      .from('quizzes')
      .select('id, share_token, is_public, user_id')
      .eq('id', quizId)
      .single()

    if (fetchError || !existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (existingQuiz.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only share your own quizzes' }, { status: 403 })
    }

    if (action === 'disable') {
      // Disable sharing
      const { error: updateError } = await supabase
        .from('quizzes')
        .update({ is_public: false })
        .eq('id', quizId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to disable sharing' }, { status: 500 })
      }

      return NextResponse.json({ success: true, isPublic: false })
    }

    // Enable sharing - generate token if doesn't exist
    let shareToken = existingQuiz.share_token
    if (!shareToken) {
      shareToken = crypto.randomUUID()
    }

    const { error: updateError } = await supabase
      .from('quizzes')
      .update({ 
        share_token: shareToken,
        is_public: true 
      })
      .eq('id', quizId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leaflearning.com'}/share/quiz/${shareToken}`

    return NextResponse.json({ 
      success: true, 
      shareToken,
      shareUrl,
      isPublic: true
    })
  } catch (error) {
    console.error('Error managing quiz share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
