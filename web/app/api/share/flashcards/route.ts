import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/app/lib/supabaseServer'

// Public client for reading shared content (no auth required)
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Get shared flashcard set by token (public access)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 })
    }

    // Fetch the flashcard set by share token
    const { data: set, error: setError } = await supabasePublic
      .from('flashcard_sets')
      .select('id, title, description, card_count, created_at')
      .eq('share_token', token)
      .eq('is_public', true)
      .single()

    if (setError || !set) {
      return NextResponse.json({ error: 'Flashcard set not found or not shared' }, { status: 404 })
    }

    // Fetch the flashcards
    const { data: cards, error: cardsError } = await supabasePublic
      .from('flashcards')
      .select('id, front, back, card_order')
      .eq('set_id', set.id)
      .order('card_order', { ascending: true })

    if (cardsError) {
      return NextResponse.json({ error: 'Failed to load flashcards' }, { status: 500 })
    }

    return NextResponse.json({ set, cards })
  } catch (error) {
    console.error('Error fetching shared flashcards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate or toggle share link for a flashcard set (requires auth)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { setId, action } = await request.json()

    if (!setId) {
      return NextResponse.json({ error: 'Set ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existingSet, error: fetchError } = await supabase
      .from('flashcard_sets')
      .select('id, share_token, is_public, user_id')
      .eq('id', setId)
      .single()

    if (fetchError || !existingSet) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 })
    }

    if (existingSet.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only share your own flashcard sets' }, { status: 403 })
    }

    if (action === 'disable') {
      // Disable sharing
      const { error: updateError } = await supabase
        .from('flashcard_sets')
        .update({ is_public: false })
        .eq('id', setId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to disable sharing' }, { status: 500 })
      }

      return NextResponse.json({ success: true, isPublic: false })
    }

    // Enable sharing - generate token if doesn't exist
    let shareToken = existingSet.share_token
    if (!shareToken) {
      shareToken = crypto.randomUUID()
    }

    const { error: updateError } = await supabase
      .from('flashcard_sets')
      .update({ 
        share_token: shareToken,
        is_public: true 
      })
      .eq('id', setId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leaflearning.com'}/share/flashcards/${shareToken}`

    return NextResponse.json({ 
      success: true, 
      shareToken,
      shareUrl,
      isPublic: true
    })
  } catch (error) {
    console.error('Error managing flashcard share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
