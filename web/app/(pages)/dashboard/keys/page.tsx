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
  ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

interface UserSubscription {
  tier: string
  status: string
  hasManagedPro: boolean
  hasByokPro: boolean
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('Production Key')
  const [newKeyTier, setNewKeyTier] = useState<'byok' | 'managed'>('byok')
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: 'free',
    status: 'inactive',
    hasManagedPro: false,
    hasByokPro: false
  })

  const router = useRouter()
  const supabase = createClient()
  const MAX_KEYS = 5

  useEffect(() => {
    loadApiKeys()
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Check subscription tier to determine pro status
        const tier = profile.subscription_tier || 'free'
        console.log('[Keys] Loaded subscription tier:', tier, 'status:', profile.subscription_status)
        
        // Only mark as pro if explicitly on a pro plan
        // 'free', 'sandbox', 'byok_starter' are all free tiers
        const isManagedPro = tier === 'managed_pro'
        const isByokPro = tier === 'byok_pro'
        
        setSubscription({
          tier,
          status: profile.subscription_status || 'inactive',
          hasManagedPro: isManagedPro,
          hasByokPro: isByokPro
        })
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
    }
  }

  const loadApiKeys = async () => {
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

      if (!profile?.default_workspace_id) {
        // Create default workspace for new users
        console.log('No workspace found, will use user ID as workspace')
      }

      const workspaceId = profile?.default_workspace_id || user.id

      // Fetch API keys via our API (bypasses RLS)
      const response = await fetch(`/api/keys?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load API keys')
      }

      setApiKeys(data.keys || [])
    } catch (err) {
      console.error('Error loading API keys:', err)
      setError('Failed to load API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    setIsCreatingKey(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single()

      // Use default_workspace_id or user.id as fallback
      const workspaceId = profile?.default_workspace_id || user.id

      // Call API to create key via Unkey
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          tier: newKeyTier,
          workspaceId: workspaceId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      // Show the new key (only shown once)
      setNewApiKey(data.key)
      setShowNewKeyModal(false)
      setNewKeyName('Production Key')
      
      // Reload keys
      loadApiKeys()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCreatingKey(false)
    }
  }

  const deleteApiKey = async (unkeyId: string) => {
    try {
      const response = await fetch(`/api/keys?id=${unkeyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete API key')
      }

      // Remove from local state
      setApiKeys(keys => keys.filter(k => k.unkey_id !== unkeyId))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const keysUsedPercentage = (apiKeys.length / MAX_KEYS) * 100

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-end px-8 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Key
        </button>
      </header>

      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Title Section */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white">Manage API Keys</h2>
          <p className="text-neutral-400">Control access to your projects by creating and managing secure API tokens.</p>
        </div>

        {/* New API Key Banner */}
        <AnimatePresence>
          {newApiKey && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-1">Your API Key is Ready!</h3>
                    <p className="text-neutral-400 text-sm mb-4">
                      Copy this key now — you won't be able to see it again.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="px-4 py-2 bg-neutral-900 rounded-lg font-mono text-sm text-white break-all">
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
                  className="text-neutral-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-xl border transition-all ${
            subscription.hasByokPro 
              ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30' 
              : 'bg-neutral-900/40 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <h3 className="font-bold text-xs tracking-widest uppercase text-neutral-300">
                {subscription.hasByokPro ? 'BYOK PRO' : 'BYOK FREE'}
              </h3>
              {subscription.hasByokPro && (
                <Crown className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              {subscription.hasByokPro 
                ? 'Unlimited requests (10/sec rate limit). Uses your Groq & Tavily keys.'
                : '100 requests/day. Pass your own AI provider keys in headers for higher limits.'
              }
            </p>
          </div>
          <div className={`p-6 rounded-xl border transition-all ${
            subscription.hasManagedPro 
              ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30' 
              : 'bg-neutral-900/40 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <h3 className="font-bold text-xs tracking-widest uppercase text-neutral-300">
                {subscription.hasManagedPro ? 'MANAGED PRO' : 'MANAGED FREE'}
              </h3>
              {subscription.hasManagedPro && (
                <Crown className="w-3 h-3 text-emerald-400" />
              )}
            </div>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              {subscription.hasManagedPro 
                ? 'System API keys with search enabled. 50,000 requests/month fair usage.'
                : '50 requests/day. Integrated billing for all providers in one simple place.'
              }
            </p>
          </div>
        </div>

        {/* API Keys List */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden min-h-[400px] flex flex-col">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Your Active Keys</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-500">{apiKeys.length} of {MAX_KEYS} keys used</span>
              <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${keysUsedPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {apiKeys.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mb-6">
                <KeyRound className="w-8 h-8 text-neutral-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-white">No API keys yet</h4>
              <p className="text-neutral-400 max-w-sm text-sm mb-8 leading-relaxed">
                Generate your first API key to start integrating our production-grade models into your application.
              </p>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-md font-medium flex items-center gap-2 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
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
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      key.tier === 'byok_pro' ? 'bg-amber-500/20 text-amber-400' :
                      key.tier === 'byok_starter' ? 'bg-amber-500/10 text-amber-300' :
                      key.tier === 'managed_pro' ? 'bg-emerald-500/20 text-emerald-400' :
                      key.tier === 'byok' ? 'bg-amber-500/10 text-amber-300' :
                      'bg-emerald-500/10 text-emerald-300'
                    }`}>
                      {key.tier === 'byok_pro' ? 'BYOK PRO' :
                       key.tier === 'byok_starter' ? 'BYOK FREE' :
                       key.tier === 'managed_pro' ? 'MANAGED PRO' :
                       key.tier === 'byok' ? 'BYOK' :
                       key.tier === 'sandbox' ? 'MANAGED FREE' :
                       key.tier?.toUpperCase() || 'MANAGED FREE'}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                    <button
                      onClick={() => deleteApiKey(key.unkey_id)}
                      className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between p-6 border border-dashed border-neutral-700 rounded-xl bg-neutral-900/30">
          <div className="flex items-center gap-4 text-left">
            <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-sm text-white">Need help getting started?</h4>
              <p className="text-xs text-neutral-500">Check out our quickstart guide for developers.</p>
            </div>
          </div>
          <Link 
            href="/docs" 
            className="text-sm font-semibold text-emerald-500 hover:underline flex items-center gap-1"
          >
            View Documentation
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Create Key Modal */}
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
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g., Production, Development"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Tier
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewKeyTier('byok')}
                      className={`p-3 rounded-xl border transition-colors ${
                        newKeyTier === 'byok'
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white">
                          {subscription.hasByokPro ? 'BYOK PRO' : 'BYOK FREE'}
                        </div>
                        {subscription.hasByokPro && (
                          <Crown className="w-3 h-3 text-amber-400" />
                        )}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {subscription.hasByokPro ? 'Unlimited (10/sec)' : '100 req/day'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewKeyTier('managed')}
                      className={`p-3 rounded-xl border transition-colors ${
                        newKeyTier === 'managed'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white">
                          {subscription.hasManagedPro ? 'MANAGED PRO' : 'MANAGED FREE'}
                        </div>
                        {subscription.hasManagedPro && (
                          <Crown className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {subscription.hasManagedPro ? '50k req/mo' : '50 req/day'}
                      </div>
                    </button>
                  </div>
                  
                  {/* Show what tier will be created */}
                  <div className="mt-3 p-2 bg-neutral-800/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs">
                      <Zap className="w-3 h-3 text-neutral-400" />
                      <span className="text-neutral-400">
                        Will create: <span className="text-white font-medium">
                          {newKeyTier === 'byok' 
                            ? (subscription.hasByokPro ? 'BYOK PRO' : 'BYOK FREE')
                            : (subscription.hasManagedPro ? 'MANAGED PRO' : 'MANAGED FREE')
                          }
                        </span> key
                      </span>
                    </div>
                  </div>
                </div>
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
                  disabled={isCreatingKey || !newKeyName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-white transition-colors disabled:opacity-50"
                >
                  {isCreatingKey ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create
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
