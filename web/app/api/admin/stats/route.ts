import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if user is admin
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
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    if (!await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d' // 7d, 30d, all
    
    // Calculate date filter
    let dateFilter = new Date()
    if (period === '7d') {
      dateFilter.setDate(dateFilter.getDate() - 7)
    } else if (period === '30d') {
      dateFilter.setDate(dateFilter.getDate() - 30)
    } else {
      dateFilter = new Date('2020-01-01') // All time
    }

    // Parallel queries for dashboard stats
    const [
      usersResult,
      notesResult,
      projectsResult,
      logsResult,
      feedbackResult,
      tokenUsageResult,
      recentUsersResult,
      activityByTypeResult,
      dailyActivityResult
    ] = await Promise.all([
      // Total users (count from auth.users via admin API)
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      
      // Total notes
      supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }),
      
      // Total projects
      supabaseAdmin.from('projects').select('id', { count: 'exact', head: true }),
      
      // Total API calls in period
      supabaseAdmin
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dateFilter.toISOString()),
      
      // Pending feedback count
      supabaseAdmin
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Total tokens used in period
      supabaseAdmin
        .from('activity_logs')
        .select('tokens_used')
        .gte('created_at', dateFilter.toISOString())
        .gt('tokens_used', 0),
      
      // Recent user signups (last 7 days)
      supabaseAdmin
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Activity breakdown by type
      supabaseAdmin
        .from('activity_logs')
        .select('action_type')
        .gte('created_at', dateFilter.toISOString()),
      
      // Daily activity for chart (last 7 days)
      supabaseAdmin
        .from('activity_logs')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Calculate total tokens used
    const totalTokensUsed = tokenUsageResult.data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0

    // Group activity by type
    const activityByType: Record<string, number> = {}
    activityByTypeResult.data?.forEach(log => {
      activityByType[log.action_type] = (activityByType[log.action_type] || 0) + 1
    })

    // Group daily activity
    const dailyActivity: Record<string, number> = {}
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
    last7Days.forEach(day => { dailyActivity[day] = 0 })
    
    dailyActivityResult.data?.forEach(log => {
      const day = new Date(log.created_at).toISOString().split('T')[0]
      if (dailyActivity[day] !== undefined) {
        dailyActivity[day]++
      }
    })

    return NextResponse.json({
      stats: {
        totalUsers: usersResult.data?.users?.length || 0,
        totalNotes: notesResult.count || 0,
        totalProjects: projectsResult.count || 0,
        totalApiCalls: logsResult.count || 0,
        pendingFeedback: feedbackResult.count || 0,
        totalTokensUsed,
      },
      recentUsers: recentUsersResult.data || [],
      activityByType,
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({ date, count })),
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
