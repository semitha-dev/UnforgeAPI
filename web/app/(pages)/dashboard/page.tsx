'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  BarChart3, 
  Key, 
  Zap, 
  ArrowUpRight,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardOverviewPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeKeys: 0,
    workspace: ''
  })

  const router = useRouter()
  const supabase = createClient()

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

      setStats({
        totalRequests: 0, // Would come from api_usage table
        activeKeys: keysCount || 0,
        workspace: workspace?.name || 'Workspace'
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
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome to {stats.workspace}</h1>
        <p className="text-neutral-400">Your UnforgeAPI dashboard overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalRequests.toLocaleString()}</div>
          <div className="text-sm text-neutral-400">Total API Requests</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.activeKeys}</div>
          <div className="text-sm text-neutral-400">Active API Keys</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">BYOK</div>
          <div className="text-sm text-neutral-400">Current Tier</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/keys"
            className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-medium text-white">Create API Key</div>
                <div className="text-sm text-neutral-400">Generate a new API key</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/dashboard/docs"
            className="p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white">View Documentation</div>
                <div className="text-sm text-neutral-400">Learn how to integrate</div>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Getting Started</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center font-medium">1</div>
            <p className="text-neutral-300">Create an API key from the <Link href="/dashboard/keys" className="text-emerald-400 hover:underline">API Keys</Link> page</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center font-medium">2</div>
            <p className="text-neutral-300">Get your Groq API key from <a href="https://console.groq.com" target="_blank" rel="noopener" className="text-emerald-400 hover:underline">console.groq.com</a></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center font-medium">3</div>
            <p className="text-neutral-300">Make your first API call using the examples in <Link href="/dashboard/docs" className="text-emerald-400 hover:underline">Documentation</Link></p>
          </div>
        </div>
      </div>
    </>
  )
}
