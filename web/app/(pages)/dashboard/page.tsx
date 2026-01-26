'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import {
  BarChart3,
  Key,
  Zap,
  ArrowUpRight,
  Loader2,
  Shield,
  Clock,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/lib/UserContext'
import { useSubscription } from '@/lib/SubscriptionContext'
import { PLAN_CONFIG } from '@/lib/subscription-constants'
import type { ApiPlan } from '@/lib/subscription-constants'

export default function DashboardOverviewPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeKeys: 0,
    workspace: '',
    workspaceId: ''
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [planConfig, setPlanConfig] = useState(PLAN_CONFIG.sandbox)

  const router = useRouter()
  const supabase = createClient()
  const { user } = useUser()
  const { tier: subscriptionTier } = useSubscription()

  // Update plan config when subscription tier changes
  useEffect(() => {
    if (subscriptionTier) {
      const tier = subscriptionTier as ApiPlan
      setPlanConfig(PLAN_CONFIG[tier] || PLAN_CONFIG.sandbox)
    }
  }, [subscriptionTier])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
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

      if (!profile?.default_workspace_id) {
        router.push('/onboarding/workspace')
        return
      }

      // Get workspace info
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', profile.default_workspace_id)
        .single()

      // Get API keys count
      const { count: keysCount } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', profile.default_workspace_id)
        .eq('is_active', true)

      // Fetch usage data from API
      let totalRequests = 0
      try {
        const usageResponse = await fetch(`/api/usage?workspaceId=${profile.default_workspace_id}`)
        if (usageResponse.ok) {
          const usageData = await usageResponse.json()
          // Use requestsThisMonth for total requests in current period
          totalRequests = usageData.requestsThisMonth || usageData.totalRequests || 0
        }
      } catch (usageError) {
        console.error('Error fetching usage data:', usageError)
      }

      setStats({
        totalRequests,
        activeKeys: keysCount || 0,
        workspace: workspace?.name || 'Workspace',
        workspaceId: profile.default_workspace_id
      })
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{stats.workspace}</h1>
        <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
          Your UnforgeAPI dashboard overview and quick access to key features.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Requests Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <BarChart3 className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Requests</p>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight font-mono mb-1">
            {stats.totalRequests.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500">API calls this period</div>
        </div>

        {/* Active Keys Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Keys</p>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight font-mono mb-1">
            {stats.activeKeys}
          </div>
          <div className="text-sm text-slate-500">API keys in use</div>
        </div>

        {/* Current Plan Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-14 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current Plan</p>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight mb-1">
            {planConfig.name}
          </div>
          <div className="text-sm text-slate-500">{planConfig.description}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/dashboard/keys"
            className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-6 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Key className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-white mb-1">Create API Key</div>
                <div className="text-sm text-slate-500">Generate a new API key for your app</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/dashboard/docs"
            className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-6 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white mb-1">View Documentation</div>
                <div className="text-sm text-slate-500">Learn how to integrate the API</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/dashboard/usage"
            className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-6 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <div className="font-medium text-white mb-1">View Usage</div>
                <div className="text-sm text-slate-500">Monitor your API usage and analytics</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/dashboard/billing"
            className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-6 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-white mb-1">Manage Billing</div>
                <div className="text-sm text-slate-500">Upgrade plan or manage subscription</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Getting Started</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25">1</div>
            <p className="text-slate-300">Create an API key from the <Link href="/dashboard/keys" className="text-indigo-400 hover:text-indigo-300 font-medium">API Keys</Link> page</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25">2</div>
            <p className="text-slate-300">Get your Groq API key from <a href="https://console.groq.com" target="_blank" rel="noopener" className="text-indigo-400 hover:text-indigo-300 font-medium">console.groq.com</a></p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white text-sm flex items-center justify-center font-bold shadow-lg shadow-indigo-500/25">3</div>
            <p className="text-slate-300">Make your first API call using the examples in <Link href="/dashboard/docs" className="text-indigo-400 hover:text-indigo-300 font-medium">Documentation</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
