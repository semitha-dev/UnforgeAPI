'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

interface SubscriptionContextType {
  tier: string
  isPro: boolean
  isAnonymous: boolean
  isLoading: boolean
  refetch: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  isPro: false,
  isAnonymous: false,
  isLoading: true,
  refetch: async () => {}
})

// Global cache that persists across component mounts (survives navigation)
let globalCache: { tier: string; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<string>(globalCache?.tier || 'free')
  const [isLoading, setIsLoading] = useState(!globalCache)
  const fetchingRef = useRef(false)
  const initialLoadDone = useRef(!!globalCache)

  const fetchSubscription = useCallback(async (force = false) => {
    // Check global cache first (unless forced)
    if (!force && globalCache && Date.now() - globalCache.timestamp < CACHE_DURATION) {
      setTier(globalCache.tier)
      setIsLoading(false)
      return
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setTier('anonymous')
        globalCache = { tier: 'anonymous', timestamp: Date.now() }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      const newTier = profile?.subscription_tier || 'free'
      setTier(newTier)
      globalCache = { tier: newTier, timestamp: Date.now() }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    // Only fetch on first mount if no cache exists
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchSubscription()
    } else if (globalCache) {
      // Use cached value immediately
      setTier(globalCache.tier)
      setIsLoading(false)
    }
  }, [fetchSubscription])

  const value: SubscriptionContextType = {
    tier,
    isPro: tier === 'pro' || tier === 'managed_pro' || tier === 'managed_expert' || tier === 'byok_pro',
    isAnonymous: tier === 'anonymous',
    isLoading,
    refetch: () => fetchSubscription(true)
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext)
}

// Alias for useSubscriptionContext for convenience
export function useSubscription() {
  return useContext(SubscriptionContext)
}

// Utility to clear cache (call after subscription change)
export function clearSubscriptionCache() {
  globalCache = null
}

// Export tier and isPro for convenience
export function useSubscriptionTier() {
  const { tier } = useSubscriptionContext()
  const isPro = tier === 'pro' || tier === 'managed_pro' || tier === 'managed_expert' || tier === 'byok_pro'
  return { tier, isPro }
}
