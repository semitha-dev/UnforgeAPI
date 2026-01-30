'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  KeyRound,
  HelpCircle,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSubscription } from '@/lib/SubscriptionContext'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  tier: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
  unkey_id: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('Production Key')
  const [newKeyTier, setNewKeyTier] = useState<'managed'>('managed')
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const { tier: subscriptionTier, isPro } = useSubscription()
  const MAX_KEYS = 5

  // Derive subscription state from context
  const subscription = {
    tier: subscriptionTier || 'free',
    status: 'active',
    hasManagedIndie: subscriptionTier === 'managed_indie',
    hasManagedPro: subscriptionTier === 'managed_pro',
    hasManagedExpert: subscriptionTier === 'managed_expert',
    hasManagedProduction: subscriptionTier === 'managed_production'
  }

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    console.log('[Keys:load:start]')
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[Keys:load:noUser] Redirecting to signin')
        router.push('/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      if (!profile?.default_workspace_id) {
        console.log('[Keys:load] No workspace found, will use user ID as workspace')
      }

      const workspaceId = profile?.default_workspace_id || user.id
      console.log('[Keys:load:request]', { workspaceId })

      const response = await fetch(`/api/keys?workspaceId=${workspaceId}`)
      const data = await response.json()

      console.log('[Keys:load:response]', {
        status: response.status,
        ok: response.ok,
        keyCount: data.keys?.length || 0
      })

      if (!response.ok) {
        console.error('[Keys:load:error]', data)
        throw new Error(data.error || 'Failed to load API keys')
      }

      setApiKeys(data.keys || [])
      console.log('[Keys:load:success]', { keyCount: data.keys?.length || 0 })
    } catch (err) {
      console.error('[Keys:load:exception]', err)
      setError('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    console.log('[Keys:create:start]', { name: newKeyName, tier: newKeyTier })
    setIsCreatingKey(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[Keys:create:error] No user found')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      const workspaceId = profile?.default_workspace_id || user.id

      const requestBody = {
        name: newKeyName,
        tier: newKeyTier,
        workspaceId: workspaceId
      }

      console.log('[Keys:create:request]', requestBody)

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      console.log('[Keys:create:response]', {
        status: response.status,
        ok: response.ok,
        hasKey: !!data.key,
        error: data.error
      })

      if (!response.ok) {
        console.error('[Keys:create:error]', data)
        throw new Error(data.error || 'Failed to create API key')
      }

      console.log('[Keys:create:success]', { keyPrefix: data.key?.substring(0, 10) + '...' })

      setNewApiKey(data.key)
      setShowNewKeyModal(false)
      setNewKeyName('Production Key')

      loadApiKeys()
    } catch (err: any) {
      console.error('[Keys:create:exception]', { message: err.message, stack: err.stack })
      setError(err.message)
    } finally {
      setIsCreatingKey(false)
    }
  }

  const deleteApiKey = async (unkeyId: string) => {
    console.log('[Keys:delete:start]', { unkeyId })
    try {
      const response = await fetch(`/api/keys?id=${unkeyId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      console.log('[Keys:delete:response]', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (!response.ok) {
        console.error('[Keys:delete:error]', data)
        throw new Error(data.error || 'Failed to delete API key')
      }

      console.log('[Keys:delete:success]')

      setApiKeys(keys => keys.filter(k => k.unkey_id !== unkeyId))
    } catch (err: any) {
      console.error('[Keys:delete:exception]', { message: err.message })
      setError(err.message)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const keysUsedPercentage = (apiKeys.length / MAX_KEYS) * 100
  const managedKeys = apiKeys // All keys are managed now

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">API Keys</h1>
          <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
            Create and manage API keys to authenticate your requests.
          </p>
        </div>
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-4 h-4" />
          Create New Key
        </button>
      </div>

      {/* New API Key Banner */}
      <AnimatePresence>
        {newApiKey && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Key className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Your API Key is Ready!</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Copy this key now — you won't be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-[#0e0e11] border border-white/5 rounded-lg font-mono text-sm text-white break-all">
                      {newApiKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newApiKey, 'new')}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {copiedKey === 'new' ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setNewApiKey(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Keys Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-8 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Key className="w-16 h-16" />
          </div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Keys</p>
              <h3 className="text-2xl font-bold text-white">{apiKeys.length} / {MAX_KEYS}</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${keysUsedPercentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{Math.round(keysUsedPercentage)}%</span>
          </div>
          <p className="text-sm text-slate-400 font-light">API key slots used</p>
        </div>

        {/* Managed Keys Card */}
        <div className="bg-[#0e0e11]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Managed Keys</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tracking-tight font-mono">
                  {managedKeys.length}
                </span>
                <span className="text-sm text-slate-500 font-medium">keys</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {subscription.hasManagedProduction ? '800 deep research/month' :
             subscription.hasManagedExpert ? '300 deep research/month' :
             subscription.hasManagedPro ? '70 deep research/month' :
             subscription.hasManagedIndie ? '25 deep research/month' :
             '3 deep research/day'}
          </p>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
            {(subscription.hasManagedIndie || subscription.hasManagedPro || subscription.hasManagedExpert || subscription.hasManagedProduction) && <Crown className="w-4 h-4 text-emerald-400" />}
            <span className="text-xs text-slate-400">
              {subscription.hasManagedProduction ? 'Managed Production' :
               subscription.hasManagedExpert ? 'Managed Expert' :
               subscription.hasManagedPro ? 'Managed Pro' :
               subscription.hasManagedIndie ? 'Managed Indie' :
               'Sandbox (Free)'}
            </span>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Your API Keys</h2>
          <Link
            href="/docs"
            className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            View Documentation
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#0e0e11] rounded-xl border border-white/5 overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#18181b] px-6 py-3 border-b border-white/5 flex text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="flex-1">Key Details</div>
            <div className="w-32 text-center">Tier</div>
            <div className="w-24 text-center">Status</div>
            <div className="w-20 text-right">Actions</div>
          </div>

          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-14 w-14 rounded-full bg-slate-900/50 flex items-center justify-center mb-4">
                <KeyRound className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 font-medium mb-1">No API keys yet</p>
              <p className="text-xs text-slate-600 mb-6">Create your first key to start making API requests</p>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Your First Key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {apiKeys.map((key) => (
                <div key={key.id} className="px-6 py-4 flex items-center hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-center">
                      <Key className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{key.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{key.key_prefix}...</div>
                    </div>
                  </div>
                  <div className="w-32 flex justify-center">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${
                      key.tier === 'managed_production' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' :
                      key.tier === 'managed_expert' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' :
                      key.tier === 'managed_pro' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      key.tier === 'managed_indie' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {key.tier === 'managed_production' ? 'PRODUCTION' :
                       key.tier === 'managed_expert' ? 'EXPERT' :
                       key.tier === 'managed_pro' ? 'PRO' :
                       key.tier === 'managed_indie' ? 'INDIE' :
                       'SANDBOX'}
                    </span>
                  </div>
                  <div className="w-24 flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${key.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="w-20 flex justify-end">
                    <button
                      onClick={() => deleteApiKey(key.unkey_id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-[#18181b]/30 border-t border-white/5 text-center">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              {apiKeys.length} of {MAX_KEYS} keys created
            </span>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Key Types</h2>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm mb-1">Managed Keys</h4>
                  <p className="text-xs text-slate-400">We handle the AI providers. Sandbox: 50 req/day. Managed Pro: 50k req/month. Managed Expert: 200k req/month.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Quick Start</h2>
          </div>
          <div className="bg-[#0e0e11] rounded-xl border border-white/5 p-6 h-[calc(100%-44px)] flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/20">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm mb-1">Need help getting started?</h4>
                <p className="text-xs text-slate-400">Check out our quickstart guide to integrate the API into your application.</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <Link
                href="/docs"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 group transition-colors"
              >
                View Documentation
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      <AnimatePresence>
        {showNewKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowNewKeyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 bg-[#0e0e11] border border-white/10 rounded-2xl shadow-2xl"
            >
              <h3 className="text-xl font-semibold text-white mb-6">Create API Key</h3>

              <div className="space-y-5 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#18181b] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., Production, Development"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Key Type
                  </label>
                  <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-white">
                        {subscription.hasManagedProduction ? 'Managed Production' :
                         subscription.hasManagedExpert ? 'Managed Expert' :
                         subscription.hasManagedPro ? 'Managed Pro' :
                         subscription.hasManagedIndie ? 'Managed Indie' :
                         'Sandbox'}
                      </span>
                      {(subscription.hasManagedIndie || subscription.hasManagedPro || subscription.hasManagedExpert || subscription.hasManagedProduction) && <Crown className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-500">
                      {subscription.hasManagedProduction ? '800 deep research/month' :
                       subscription.hasManagedExpert ? '300 deep research/month' :
                       subscription.hasManagedPro ? '70 deep research/month' :
                       subscription.hasManagedIndie ? '25 deep research/month' :
                       '3 deep research/day'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  className="flex-1 px-4 py-3 bg-[#18181b] border border-white/10 rounded-xl font-medium text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createApiKey}
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
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
    </div>
  )
}
