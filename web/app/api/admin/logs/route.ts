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
    const limit = parseInt(searchParams.get('limit') || '50')
    const actionType = searchParams.get('action_type') || ''
    const userId = searchParams.get('user_id') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (actionType) {
      query = query.eq('action_type', actionType)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: logs, count, error } = await query

    if (error) throw error

    // Get unique action types for filter dropdown
    const { data: actionTypes } = await supabaseAdmin
      .from('activity_logs')
      .select('action_type')
      .limit(100)

    const uniqueActionTypes = [...new Set(actionTypes?.map(a => a.action_type) || [])]

    return NextResponse.json({
      logs: logs || [],
      actionTypes: uniqueActionTypes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
