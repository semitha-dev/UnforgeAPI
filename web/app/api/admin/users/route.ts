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
    const search = searchParams.get('search') || ''
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        name,
        email,
        is_admin,
        subscription_tier,
        subscription_status,
        tokens_balance,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, count, error } = await query

    if (error) throw error

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const [notesCount, projectsCount, tokensUsed] = await Promise.all([
          supabaseAdmin
            .from('notes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseAdmin
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabaseAdmin
            .from('activity_logs')
            .select('tokens_used')
            .eq('user_id', user.id)
            .gt('tokens_used', 0)
        ])

        const totalTokensUsed = tokensUsed.data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0

        return {
          ...user,
          notes_count: notesCount.count || 0,
          projects_count: projectsCount.count || 0,
          total_tokens_used: totalTokensUsed,
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
