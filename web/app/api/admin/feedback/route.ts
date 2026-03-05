import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  return data?.is_admin === true
}

// GET - List all feedback
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const priority = searchParams.get('priority') || ''
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: feedback, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      feedback: feedback || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Submit new feedback (from users)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { page_url, category, message } = body

    if (!page_url || !category || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: user.id,
        user_email: user.email,
        page_url,
        category,
        message,
        status: 'pending',
        priority: 'medium',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, feedback: data })
  } catch (error) {
    console.error('Submit feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update feedback status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, priority, admin_notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing feedback id' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'resolved') {
        updateData.resolved_by = user.id
        updateData.resolved_at = new Date().toISOString()
      }
    }
    if (priority) updateData.priority = priority
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, feedback: data })
  } catch (error) {
    console.error('Update feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
