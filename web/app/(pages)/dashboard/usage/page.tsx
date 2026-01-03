'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter
} from 'lucide-react'
import { motion } from 'framer-motion'

interface UsageStats {
  totalRequests: number
  requestsToday: number
  requestsThisWeek: number
  requestsThisMonth: number
  avgLatency: number
  costSaved: number
  intentBreakdown: {
    chat: number
    context: number
    research: number
  }
  dailyUsage: Array<{
    date: string
    requests: number
    cost: number
  }>
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [selectedKeyId, setSelectedKeyId] = useState<string>('all')
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string }>>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUsageData()
  }, [timeRange, selectedKeyId])

  const loadUsageData = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      // Get user's workspace
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      const workspaceId = profile?.default_workspace_id || user.id

      // Fetch API keys for filter dropdown
      const keysResponse = await fetch(`/api/keys?workspaceId=${workspaceId}`)
      const keysData = await keysResponse.json()
      setApiKeys(keysData.keys || [])

      // Fetch usage stats
      const usageResponse = await fetch(
        `/api/usage?workspaceId=${workspaceId}&range=${timeRange}${selectedKeyId !== 'all' ? `&keyId=${selectedKeyId}` : ''}`
      )
      const usageData = await usageResponse.json()

      if (usageResponse.ok) {
        setStats(usageData)
      } else {
        // Set default/empty stats
        setStats({
          totalRequests: 0,
          requestsToday: 0,
          requestsThisWeek: 0,
          requestsThisMonth: 0,
          avgLatency: 0,
          costSaved: 0,
          intentBreakdown: { chat: 0, context: 0, research: 0 },
          dailyUsage: []
        })
      }
    } catch (err) {
      console.error('Error loading usage data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend 
  }: { 
    title: string
    value: string | number
    subtitle?: string
    icon: any
    trend?: { value: number; positive: boolean }
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-neutral-500 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-neutral-800 rounded-lg">
          <Icon className="w-6 h-6 text-emerald-400" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-4 text-sm ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(trend.value)}% from last period</span>
        </div>
      )}
    </motion.div>
  )

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Usage Analytics</h1>
          <p className="text-neutral-400 mt-1">Track your API usage and costs</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Key Filter */}
          <select
            value={selectedKeyId}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Keys</option>
            {apiKeys.map((key) => (
              <option key={key.id} value={key.id}>{key.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Requests"
              value={formatNumber(stats?.totalRequests || 0)}
              subtitle={`${formatNumber(stats?.requestsToday || 0)} today`}
              icon={Zap}
            />
            <StatCard
              title="This Month"
              value={formatNumber(stats?.requestsThisMonth || 0)}
              subtitle={`${formatNumber(stats?.requestsThisWeek || 0)} this week`}
              icon={Calendar}
            />
            <StatCard
              title="Avg Latency"
              value={`${stats?.avgLatency || 0}ms`}
              subtitle="Response time"
              icon={Clock}
            />
            <StatCard
              title="Cost Saved"
              value={`$${(stats?.costSaved || 0).toFixed(2)}`}
              subtitle="Via Router Brain"
              icon={TrendingUp}
            />
          </div>

          {/* Intent Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Intent Distribution</h3>
              <p className="text-neutral-400 text-sm mb-6">
                How the Router Brain classified your requests
              </p>
              
              <div className="space-y-4">
                {[
                  { label: 'CHAT', value: stats?.intentBreakdown.chat || 0, color: 'bg-blue-500', description: 'Free (Greetings, small talk)' },
                  { label: 'CONTEXT', value: stats?.intentBreakdown.context || 0, color: 'bg-emerald-500', description: 'Free (Answered from context)' },
                  { label: 'RESEARCH', value: stats?.intentBreakdown.research || 0, color: 'bg-amber-500', description: 'Paid (Web search required)' },
                ].map((intent) => {
                  const total = (stats?.intentBreakdown.chat || 0) + (stats?.intentBreakdown.context || 0) + (stats?.intentBreakdown.research || 0)
                  const percentage = total > 0 ? (intent.value / total) * 100 : 0
                  
                  return (
                    <div key={intent.label}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{intent.label}</span>
                          <span className="text-neutral-500 text-sm ml-2">{intent.description}</span>
                        </div>
                        <span className="text-neutral-400">{formatNumber(intent.value)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${intent.color} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {stats && (stats.intentBreakdown.chat + stats.intentBreakdown.context) > 0 && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 text-sm">
                    🎉 <strong>{((stats.intentBreakdown.chat + stats.intentBreakdown.context) / (stats.intentBreakdown.chat + stats.intentBreakdown.context + stats.intentBreakdown.research) * 100).toFixed(0)}%</strong> of requests avoided expensive web search!
                  </p>
                </div>
              )}
            </motion.div>

            {/* Usage Over Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Usage Over Time</h3>
              <p className="text-neutral-400 text-sm mb-6">
                Daily request volume
              </p>
              
              {stats?.dailyUsage && stats.dailyUsage.length > 0 ? (
                <div className="h-48 flex items-end gap-1">
                  {stats.dailyUsage.slice(-14).map((day, i) => {
                    const maxRequests = Math.max(...stats.dailyUsage.map(d => d.requests), 1)
                    const height = (day.requests / maxRequests) * 100
                    
                    return (
                      <div
                        key={day.date}
                        className="flex-1 group relative"
                      >
                        <div
                          className="bg-emerald-500/30 hover:bg-emerald-500/50 rounded-t transition-all cursor-pointer"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          {day.date}: {day.requests} requests
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-neutral-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No usage data yet</p>
                    <p className="text-sm">Make some API requests to see stats</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">💡 Optimization Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-neutral-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Provide Context</h4>
                <p className="text-neutral-400 text-sm">
                  Pass relevant documents in the <code className="text-emerald-400">context</code> field to avoid web searches
                </p>
              </div>
              <div className="p-4 bg-neutral-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Cache Responses</h4>
                <p className="text-neutral-400 text-sm">
                  Cache common queries on your end to reduce API calls
                </p>
              </div>
              <div className="p-4 bg-neutral-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Use BYOK</h4>
                <p className="text-neutral-400 text-sm">
                  Bring your own Groq/Tavily keys for unlimited requests
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  )
}
