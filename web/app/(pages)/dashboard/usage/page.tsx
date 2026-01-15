'use client'

import { useState, useEffect, useRef } from 'react'
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
  Search,
  ChevronDown,
  Key,
  Check,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Debug helper
const debug = (tag: string, data: any) => {
  console.log(`%c[UsagePage:${tag}]`, 'color: #8B5CF6; font-weight: bold', data)
}

// Deep Research limits per API plan (must match subscription-constants.ts PLAN_CONFIG)
const DEEP_RESEARCH_LIMITS: Record<string, { limit: number; period: 'daily' | 'monthly' }> = {
  'sandbox': { limit: 5, period: 'daily' },
  'free': { limit: 5, period: 'daily' },
  'managed_pro': { limit: 50, period: 'monthly' },
  'pro': { limit: 50, period: 'monthly' },
  'managed_expert': { limit: 200, period: 'monthly' },
  'managed_ultra': { limit: 200, period: 'monthly' },
  'enterprise': { limit: 1000, period: 'monthly' },
  'byok_starter': { limit: 5, period: 'daily' },
  'byok_pro': { limit: -1, period: 'daily' },
}

interface DeepResearchQuota {
  plan: string
  used: number
  limit: number
  period: 'daily' | 'monthly'
  resetsAt: string
}

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

// Usage Ring Chart Component (matching billing page)
function UsageRingChart({ percentage }: { percentage: number }) {
  const radius = 32
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-800/50"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [selectedKeyId, setSelectedKeyId] = useState<string>('all')
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; tier: string }>>([])
  const [deepResearchQuota, setDeepResearchQuota] = useState<DeepResearchQuota | null>(null)
  const [keyDropdownOpen, setKeyDropdownOpen] = useState(false)
  const keyDropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keyDropdownRef.current && !keyDropdownRef.current.contains(event.target as Node)) {
        setKeyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    debug('mount', { timeRange, selectedKeyId })
    loadUsageData()
  }, [timeRange, selectedKeyId])

  const loadUsageData = async () => {
    debug('loadUsageData:start', { timeRange, selectedKeyId })
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        debug('loadUsageData:noUser', {})
        router.push('/signin')
        return
      }

      debug('loadUsageData:user', { userId: user.id })

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      const workspaceId = profile?.default_workspace_id || user.id
      debug('loadUsageData:workspace', { workspaceId, hasDefaultWorkspace: !!profile?.default_workspace_id })

      const keysResponse = await fetch(`/api/keys?workspaceId=${workspaceId}`)
      const keysData = await keysResponse.json()
      debug('loadUsageData:keys', {
        status: keysResponse.status,
        keyCount: keysData.keys?.length || 0,
        keys: keysData.keys?.map((k: any) => ({ id: k.id, name: k.name, tier: k.tier }))
      })
      setApiKeys(keysData.keys || [])

      const usageUrl = `/api/usage?workspaceId=${workspaceId}&range=${timeRange}${selectedKeyId !== 'all' ? `&keyId=${selectedKeyId}` : ''}`
      debug('loadUsageData:fetchingUsage', { url: usageUrl })

      const usageResponse = await fetch(usageUrl)
      const usageData = await usageResponse.json()

      debug('loadUsageData:usageResponse', {
        status: usageResponse.status,
        ok: usageResponse.ok,
        totalRequests: usageData?.totalRequests,
        requestsToday: usageData?.requestsToday,
        intentBreakdown: usageData?.intentBreakdown,
        deepResearchUsage: usageData?.deepResearchUsage
      })

      if (usageResponse.ok) {
        setStats(usageData)
      } else {
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

      const userPlan = keysData.keys?.[0]?.tier || keysData.keys?.[0]?.metadata?.plan || 'sandbox'
      const deepResearchUsed = usageData?.deepResearchUsage || 0
      const planLimits = DEEP_RESEARCH_LIMITS[userPlan] ?? { limit: 0, period: 'daily' as const }

      const now = new Date()
      let resetsAt: string
      if (planLimits.period === 'daily') {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        resetsAt = tomorrow.toISOString()
      } else {
        resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      }

      setDeepResearchQuota({
        plan: userPlan,
        used: deepResearchUsed,
        limit: planLimits.limit,
        period: planLimits.period,
        resetsAt: resetsAt
      })

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  const totalIntents = (stats?.intentBreakdown.chat || 0) + (stats?.intentBreakdown.context || 0) + (stats?.intentBreakdown.research || 0)
  const requestsUsedPercentage = stats?.requestsThisMonth ? Math.min((stats.requestsThisMonth / 50000) * 100, 100) : 0

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Usage Analytics</h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Track your API usage, monitor costs, and optimize your requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div className="flex items-center bg-[#0e0e11] border border-white/[0.08] rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Key Filter - Custom Dropdown */}
          <div className="relative" ref={keyDropdownRef}>
            <button
              onClick={() => setKeyDropdownOpen(!keyDropdownOpen)}
              className="flex items-center gap-2 bg-[#0e0e11] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-white hover:bg-white/[0.02] transition-colors min-w-[160px]"
            >
              <Key className="w-4 h-4 text-slate-400" />
              <span className="flex-1 text-left truncate text-xs">
                {selectedKeyId === 'all'
                  ? 'All Keys'
                  : apiKeys.find(k => k.id === selectedKeyId)?.name || 'Select Key'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${keyDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {keyDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[#0e0e11] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-2 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        debug('keyDropdown:select', { keyId: 'all' })
                        setSelectedKeyId('all')
                        setKeyDropdownOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedKeyId === 'all'
                          ? 'bg-white/5 text-white'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <Key className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate text-sm">All Keys</span>
                      {selectedKeyId === 'all' && (
                        <Check className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                      )}
                    </button>

                    {apiKeys.length > 0 && (
                      <div className="h-px bg-white/5 my-2"></div>
                    )}

                    {apiKeys.map((key) => (
                      <button
                        key={key.id}
                        onClick={() => {
                          debug('keyDropdown:select', { keyId: key.id, keyName: key.name })
                          setSelectedKeyId(key.id)
                          setKeyDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedKeyId === key.id
                            ? 'bg-white/5 text-white'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <Key className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{key.name}</p>
                          <p className="text-xs text-slate-500">{key.tier}</p>
                        </div>
                        {selectedKeyId === key.id && (
                          <Check className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        )}
                      </button>
                    ))}

                    {apiKeys.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-500">No API keys found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Requests Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-16 h-16" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Requests</p>
              <h3 className="text-2xl font-bold text-white">{formatNumber(stats?.totalRequests || 0)}</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]">
              ALL TIME
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full rounded-full"></div>
            </div>
            <span className="text-xs text-slate-400">
              {formatNumber(stats?.requestsToday || 0)} today
            </span>
          </div>
          <p className="text-sm text-slate-400 font-light">{formatNumber(stats?.requestsThisWeek || 0)} this week</p>
        </div>

        {/* Period Usage Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">This Month</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tracking-tight font-mono">
                  {formatNumber(stats?.requestsThisMonth || 0)}
                </span>
                <span className="text-sm text-slate-500 font-medium">requests</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                API Requests this billing period
              </p>
            </div>
            <UsageRingChart percentage={requestsUsedPercentage} />
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">
              Resets at end of billing period
            </span>
          </div>
        </div>

        {/* Cost Saved Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Cost Saved</p>
              <h3 className="text-2xl font-bold text-white">${(stats?.costSaved || 0).toFixed(2)}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex-grow">
            <p className="text-sm text-slate-500 mt-2">
              Via intelligent Router Brain routing
            </p>
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <span className="text-sm text-indigo-400 font-medium flex items-center gap-1 group transition-colors">
              Avg latency: {stats?.avgLatency || 0}ms
            </span>
          </div>
        </div>
      </div>

      {/* Deep Research Quota */}
      {deepResearchQuota && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Deep Research Quota</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              deepResearchQuota.limit === -1
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                : deepResearchQuota.limit === 0
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
            }`}>
              {deepResearchQuota.plan.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Search className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Deep Research</h3>
                <p className="text-slate-400 text-sm">AI-powered comprehensive research reports</p>
              </div>
            </div>

            {deepResearchQuota.limit === -1 ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Usage</span>
                  <span className="text-emerald-400 font-medium">
                    {deepResearchQuota.used} requests (Unlimited)
                  </span>
                </div>
                <p className="text-emerald-400 text-sm">
                  Unlimited Deep Research — Full access using your own API keys.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">
                    {deepResearchQuota.period === 'daily' ? 'Daily' : 'Monthly'} Usage
                  </span>
                  <span className="text-white font-medium">
                    {deepResearchQuota.used} / {deepResearchQuota.limit} requests
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      deepResearchQuota.used >= deepResearchQuota.limit
                        ? 'bg-red-500'
                        : deepResearchQuota.used >= deepResearchQuota.limit * 0.8
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min((deepResearchQuota.used / deepResearchQuota.limit) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${
                    deepResearchQuota.used >= deepResearchQuota.limit
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}>
                    {deepResearchQuota.limit - deepResearchQuota.used} remaining
                  </span>
                  <span className="text-slate-500">
                    Resets {deepResearchQuota.period === 'daily'
                      ? 'at midnight'
                      : new Date(deepResearchQuota.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                  </span>
                </div>

                {deepResearchQuota.used >= deepResearchQuota.limit && deepResearchQuota.limit > 0 && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">
                      You&apos;ve reached your {deepResearchQuota.period} limit. {deepResearchQuota.period === 'daily'
                        ? 'It will reset at midnight.'
                        : <a href="/dashboard/billing" className="underline hover:no-underline">Upgrade your plan</a>}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Intent Breakdown & Usage Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Intent Distribution */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Intent Distribution</h2>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6">
            <p className="text-slate-400 text-sm mb-6">
              How the Router Brain classified your requests
            </p>

            <div className="space-y-4">
              {[
                { label: 'CHAT', value: stats?.intentBreakdown.chat || 0, color: 'bg-blue-500', description: 'Free (Greetings, small talk)' },
                { label: 'CONTEXT', value: stats?.intentBreakdown.context || 0, color: 'bg-emerald-500', description: 'Free (Answered from context)' },
                { label: 'RESEARCH', value: stats?.intentBreakdown.research || 0, color: 'bg-amber-500', description: 'Paid (Web search required)' },
              ].map((intent) => {
                const percentage = totalIntents > 0 ? (intent.value / totalIntents) * 100 : 0

                return (
                  <div key={intent.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium text-sm">{intent.label}</span>
                        <span className="text-slate-500 text-xs ml-2">{intent.description}</span>
                      </div>
                      <span className="text-slate-400 text-sm">{formatNumber(intent.value)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${intent.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {stats && (stats.intentBreakdown.chat + stats.intentBreakdown.context) > 0 && totalIntents > 0 && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-emerald-400 text-sm">
                  <strong>{((stats.intentBreakdown.chat + stats.intentBreakdown.context) / totalIntents * 100).toFixed(0)}%</strong> of requests avoided expensive web search!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Usage Over Time */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Usage Over Time</h2>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6 h-[calc(100%-44px)]">
            <p className="text-slate-400 text-sm mb-6">
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
                        className="bg-indigo-500/30 hover:bg-indigo-500/50 rounded-t transition-all cursor-pointer"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#18181b] border border-white/10 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {day.date}: {day.requests} requests
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-900/50 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No usage data yet</p>
                  <p className="text-xs text-slate-600 mt-1">Make some API requests to see stats</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optimization Tips */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Optimization Tips</h2>
        </div>
        <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <h4 className="font-medium text-white text-sm mb-2">Provide Context</h4>
              <p className="text-slate-400 text-xs">
                Pass relevant documents in the <code className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">context</code> field to avoid web searches
              </p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <h4 className="font-medium text-white text-sm mb-2">Cache Responses</h4>
              <p className="text-slate-400 text-xs">
                Cache common queries on your end to reduce API calls
              </p>
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <h4 className="font-medium text-white text-sm mb-2">Use BYOK</h4>
              <p className="text-slate-400 text-xs">
                Bring your own Groq/Tavily keys for unlimited requests
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
