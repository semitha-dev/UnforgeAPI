'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  Zap, 
  Key, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  BarChart3, 
  Clock, 
  ArrowUpRight,
  Loader2,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Workspace {
  id: string
  name: string
  slug: string
  settings: any
}

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  tier: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  unkey_id: string
}

interface UsageStats {
  total_requests: number
  chat_requests: number
  context_requests: number
  research_requests: number
  total_cost_microcents: number
  estimated_savings_microcents: number
}

export default function WorkspaceDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('API Key')
  const [isCreatingKey, setIsCreatingKey] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    
    // Check for newly created API key
    const storedKey = sessionStorage.getItem('new_api_key')
    if (storedKey) {
      setNewApiKey(storedKey)
      sessionStorage.removeItem('new_api_key')
    }
  }, [slug])

  const loadData = async () => {
    setIsLoading(true)
    
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      // Get workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .single()

      if (workspaceError || !workspaceData) {
        router.push('/dashboard')
        return
      }
      setWorkspace(workspaceData)

      // Get API keys
      const { data: keysData } = await supabase
        .from('api_keys')
        .select('*')
        .eq('workspace_id', workspaceData.id)
        .order('created_at', { ascending: false })

      setApiKeys(keysData || [])

      // Get usage stats (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: statsData } = await supabase
        .from('daily_usage_stats')
        .select('*')
        .eq('workspace_id', workspaceData.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

      if (statsData && statsData.length > 0) {
        const aggregated = statsData.reduce((acc, day) => ({
          total_requests: acc.total_requests + day.total_requests,
          chat_requests: acc.chat_requests + day.chat_requests,
          context_requests: acc.context_requests + day.context_requests,
          research_requests: acc.research_requests + day.research_requests,
          total_cost_microcents: acc.total_cost_microcents + day.total_cost_microcents,
          estimated_savings_microcents: acc.estimated_savings_microcents + day.estimated_savings_microcents,
        }), {
          total_requests: 0,
          chat_requests: 0,
          context_requests: 0,
          research_requests: 0,
          total_cost_microcents: 0,
          estimated_savings_microcents: 0,
        })
        setUsageStats(aggregated)
      } else {
        setUsageStats({
          total_requests: 0,
          chat_requests: 0,
          context_requests: 0,
          research_requests: 0,
          total_cost_microcents: 0,
          estimated_savings_microcents: 0,
        })
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!workspace) return
    
    setIsCreatingKey(true)
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call API to create key via Unkey
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          name: newKeyName,
          tier: 'managed'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create API key')
      }

      setNewApiKey(result.key)
      setShowNewKeyModal(false)
      setNewKeyName('API Key')
      await loadData()
    } catch (err: any) {
      console.error('Error creating API key:', err)
      alert(err.message || 'Failed to create API key')
    } finally {
      setIsCreatingKey(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call API to revoke key via Unkey
      const response = await fetch(`/api/keys?id=${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete API key')
      }

      await loadData()
    } catch (err: any) {
      console.error('Error deleting API key:', err)
      alert(err.message || 'Failed to delete API key')
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatCost = (microcents: number) => {
    return (microcents / 100000).toFixed(2)
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
      {/* New API Key Banner */}
      <AnimatePresence>
        {newApiKey && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white mb-1">Your API Key is Ready!</h3>
                  <p className="text-neutral-400 text-sm mb-4">
                    Copy this key now — you won't be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-4 py-2 bg-neutral-900 rounded-lg font-mono text-sm text-white">
                      {newApiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newApiKey, 'new')}
                      className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      {copiedKey === 'new' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setNewApiKey(null)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Workspace: {workspace?.name}</h1>
          <p className="text-neutral-400">Monitor your API usage and manage keys</p>
        </div>
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          New API Key
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-neutral-500">Last 30 days</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{usageStats?.total_requests.toLocaleString() || 0}</div>
          <div className="text-sm text-neutral-400">Total Requests</div>
        </div>

        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs text-neutral-500">Last 30 days</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">${formatCost(usageStats?.total_cost_microcents || 0)}</div>
          <div className="text-sm text-neutral-400">Total Cost</div>
        </div>

        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-xs text-neutral-500">Estimated</span>
          </div>
          <div className="text-3xl font-bold text-teal-400 mb-1">${formatCost(usageStats?.estimated_savings_microcents || 0)}</div>
          <div className="text-sm text-neutral-400">Cost Saved</div>
        </div>

        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{apiKeys.filter(k => k.is_active).length}</div>
          <div className="text-sm text-neutral-400">Active API Keys</div>
        </div>
      </div>

      {/* Route Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <h3 className="font-semibold text-white mb-6">Route Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">CHAT</span>
                <span className="text-sm font-medium text-white">{usageStats?.chat_requests || 0}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ 
                    width: `${usageStats?.total_requests ? (usageStats.chat_requests / usageStats.total_requests) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">CONTEXT</span>
                <span className="text-sm font-medium text-white">{usageStats?.context_requests || 0}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ 
                    width: `${usageStats?.total_requests ? (usageStats.context_requests / usageStats.total_requests) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">RESEARCH</span>
                <span className="text-sm font-medium text-white">{usageStats?.research_requests || 0}</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full"
                  style={{ 
                    width: `${usageStats?.total_requests ? (usageStats.research_requests / usageStats.total_requests) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <h3 className="font-semibold text-white mb-4">Quick Start</h3>
          <div className="bg-neutral-950 rounded-xl p-4 font-mono text-sm overflow-x-auto">
            <div className="text-neutral-500 mb-2"># Make your first request</div>
            <div>
              <span className="text-emerald-400">curl</span>
              <span className="text-neutral-300"> -X POST https://www.unforgeapi.com/api/v1/chat \</span>
            </div>
            <div className="pl-4">
              <span className="text-neutral-300">-H </span>
              <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span>
              <span className="text-neutral-300"> \</span>
            </div>
            <div className="pl-4">
              <span className="text-neutral-300">-H </span>
              <span className="text-green-400">"Content-Type: application/json"</span>
              <span className="text-neutral-300"> \</span>
            </div>
            <div className="pl-4">
              <span className="text-neutral-300">-d </span>
              <span className="text-green-400">'{`{"query": "Hello, world!"}`}'</span>
            </div>
          </div>
          <a
            href="/docs"
            className="flex items-center gap-2 mt-4 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            View full documentation
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* API Keys */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">API Keys</h3>
          <button
            onClick={() => setShowNewKeyModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Key
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No API keys yet</p>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="mt-4 text-emerald-400 hover:text-emerald-300"
            >
              Create your first key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-neutral-950 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                    <Key className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{key.name}</div>
                    <div className="text-sm text-neutral-500 font-mono">{key.key_prefix}...</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    key.tier === 'sandbox' ? 'bg-neutral-700 text-neutral-300' :
                    key.tier === 'managed' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-teal-500/20 text-teal-400'
                  }`}>
                    {key.tier}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                  <button
                    onClick={() => deleteApiKey(key.unkey_id)}
                    className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Key Modal */}
      <AnimatePresence>
        {showNewKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setShowNewKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 bg-neutral-900 border border-neutral-700 rounded-2xl"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Create API Key</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Production Key"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl font-medium text-white hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createApiKey}
                  disabled={isCreatingKey}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
                >
                  {isCreatingKey ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Key
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
