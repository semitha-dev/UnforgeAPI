/**
 * Usage Analytics API
 * Tracks API key usage statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEBUG = true // Always log for now
function debug(tag: string, data: any) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} [API/usage:${tag}]`, JSON.stringify(data, null, 2))
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  debug('GET:start', { timestamp: new Date().toISOString() })
  
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const range = searchParams.get('range') || '30d'
    const keyId = searchParams.get('keyId')
    
    debug('GET:params', { workspaceId, range, keyId })

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
    const days = daysMap[range] || 30
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Get usage logs from api_usage table (if it exists)
    debug('GET:querying', { 
      table: 'api_usage', 
      workspaceId, 
      startDate: startDate.toISOString(),
      keyIdFilter: keyId 
    })
    
    const { data: usageLogs, error } = await supabaseAdmin
      .from('api_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      // Table might not exist yet - return empty stats
      debug('GET:supabase:error', { 
        error: error.message, 
        code: error.code,
        hint: error.hint,
        details: error.details 
      })
      
      return NextResponse.json({
        totalRequests: 0,
        requestsToday: 0,
        requestsThisWeek: 0,
        requestsThisMonth: 0,
        avgLatency: 0,
        costSaved: 0,
        intentBreakdown: { chat: 0, context: 0, research: 0 },
        dailyUsage: [],
        _debug: { error: error.message, tableExists: false }
      })
    }

    debug('GET:rawLogs', { 
      count: usageLogs?.length || 0,
      sample: usageLogs?.slice(0, 3)
    })

    // Filter by keyId if specified
    const filteredLogs = keyId && keyId !== 'all' 
      ? (usageLogs || []).filter(log => log.key_id === keyId)
      : (usageLogs || [])

    // Calculate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const requestsToday = filteredLogs.filter(log => 
      new Date(log.created_at) >= today
    ).length

    const requestsThisWeek = filteredLogs.filter(log => 
      new Date(log.created_at) >= weekAgo
    ).length

    const requestsThisMonth = filteredLogs.filter(log => 
      new Date(log.created_at) >= monthAgo
    ).length

    // Intent breakdown
    const intentBreakdown = {
      chat: filteredLogs.filter(log => log.intent === 'CHAT').length,
      context: filteredLogs.filter(log => log.intent === 'CONTEXT').length,
      research: filteredLogs.filter(log => log.intent === 'RESEARCH').length,
    }

    // Deep Research usage (count this month only)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const deepResearchUsage = filteredLogs.filter(log => 
      log.intent === 'DEEP_RESEARCH' && new Date(log.created_at) >= firstOfMonth
    ).length

    // Average latency
    const latencies = filteredLogs
      .filter(log => log.latency_ms)
      .map(log => log.latency_ms)
    const avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0

    // Cost saved (CHAT + CONTEXT = free, RESEARCH = ~$0.01)
    const costSaved = (intentBreakdown.chat + intentBreakdown.context) * 0.01

    // Daily usage
    const dailyMap = new Map<string, { requests: number; cost: number }>()
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap.set(dateStr, { requests: 0, cost: 0 })
    }

    filteredLogs.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0]
      const existing = dailyMap.get(dateStr)
      if (existing) {
        existing.requests++
        if (log.intent === 'RESEARCH') {
          existing.cost += 0.01
        }
      }
    })

    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const stats = {
      totalRequests: filteredLogs.length,
      requestsToday,
      requestsThisWeek,
      requestsThisMonth,
      avgLatency,
      costSaved,
      intentBreakdown,
      dailyUsage,
      deepResearchUsage
    }

    debug('GET:success', { totalRequests: stats.totalRequests, deepResearchUsage })

    return NextResponse.json(stats)

  } catch (error: any) {
    console.error('[API/usage:GET:ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST - Log a new API usage event (called from /api/v1/chat and /api/v1/deep-research)
export async function POST(request: NextRequest) {
  debug('POST:start', { timestamp: new Date().toISOString() })

  try {
    const body = await request.json()
    const { workspaceId, keyId, intent, latencyMs, query, cached } = body

    debug('POST:body', { workspaceId, keyId, intent, latencyMs, cached })

    // Validate required fields
    if (!keyId || !intent) {
      console.log(`[USAGE_LOG] Workspace: ${workspaceId || 'unknown'} | Intent: ${intent || 'unknown'} | Latency: ${latencyMs || 0}ms | Saved to DB: ❌ (missing keyId or intent)`)
      return NextResponse.json(
        { error: 'keyId and intent are required' },
        { status: 400 }
      )
    }

    // If workspaceId is missing, we can still log but won't be able to query by workspace
    if (!workspaceId) {
      console.log(`[USAGE_LOG] Workspace: unknown | Intent: ${intent} | Latency: ${latencyMs || 0}ms | Saved to DB: ❌ (missing workspaceId)`)
      // Still return success - the API routes should continue working
      return NextResponse.json({ success: false, reason: 'missing workspaceId' })
    }

    // Insert usage log
    const { error } = await supabaseAdmin
      .from('api_usage')
      .insert({
        workspace_id: workspaceId,
        key_id: keyId,
        intent,
        latency_ms: latencyMs,
        query_preview: query?.substring(0, 100) // First 100 chars for debugging
      })

    if (error) {
      debug('POST:supabase:error', { error: error.message })
      console.log(`[USAGE_LOG] Workspace: ${workspaceId} | Intent: ${intent} | Latency: ${latencyMs || 0}ms | Saved to DB: ❌ (${error.message})`)
      // Don't fail the request if logging fails
      return NextResponse.json({ success: false, reason: error.message })
    }

    // Also update the api_keys last_used_at timestamp
    const { error: updateError } = await supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('unkey_id', keyId)

    if (updateError) {
      debug('POST:updateKey:error', { error: updateError.message })
      console.warn('[API/usage:POST] Failed to update key last_used_at:', updateError.message)
    }

    // Success log in the requested format
    console.log(`[USAGE_LOG] Workspace: ${workspaceId} | Intent: ${intent} | Latency: ${latencyMs || 0}ms | Saved to DB: ✅`)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API/usage:POST:ERROR]', error)
    console.log(`[USAGE_LOG] Workspace: unknown | Intent: unknown | Latency: 0ms | Saved to DB: ❌ (${error.message})`)
    // Don't fail - usage logging should be non-blocking
    return NextResponse.json({ success: false })
  }
}
