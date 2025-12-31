'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SubscriptionData {
  tier: string
  status: string
  ends_at: string | null
  isLoading: boolean
}

// Simple in-memory cache with timestamp
let cachedSubscription: { data: SubscriptionData | null; timestamp: number } = {
  data: null,
  timestamp: 0
}

const CACHE_DURATION = 60000 // 1 minute cache

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    tier: 'free',
    status: 'inactive',
    ends_at: null,
    isLoading: true
  })
  const fetchedRef = useRef(false)

  const fetchSubscription = useCallback(async (force = false) => {
    // Check cache first
    const now = Date.now()
    if (!force && cachedSubscription.data && (now - cachedSubscription.timestamp) < CACHE_DURATION) {
      setSubscription({ ...cachedSubscription.data, isLoading: false })
      return cachedSubscription.data
    }

    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        const subscriptionData: SubscriptionData = {
          tier: data.subscription?.tier || 'free',
          status: data.subscription?.status || 'inactive',
          ends_at: data.subscription?.ends_at || null,
          isLoading: false
        }
        
        // Update cache
        cachedSubscription = { data: subscriptionData, timestamp: now }
        setSubscription(subscriptionData)
        return subscriptionData
      }
    } catch (e) {
      console.error('Error fetching subscription:', e)
    }
    
    setSubscription(prev => ({ ...prev, isLoading: false }))
    return null
  }, [])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchSubscription()
    }
  }, [fetchSubscription])

  const refetch = useCallback(() => fetchSubscription(true), [fetchSubscription])

  return {
    ...subscription,
    isPro: subscription.tier === 'pro',
    isAnonymous: subscription.tier === 'anonymous',
    refetch
  }
}

// Helper to prefetch subscription (can be called early)
export function prefetchSubscription() {
  const now = Date.now()
  if (!cachedSubscription.data || (now - cachedSubscription.timestamp) >= CACHE_DURATION) {
    fetch('/api/subscription')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          cachedSubscription = {
            data: {
              tier: data.subscription?.tier || 'free',
              status: data.subscription?.status || 'inactive',
              ends_at: data.subscription?.ends_at || null,
              isLoading: false
            },
            timestamp: Date.now()
          }
        }
      })
      .catch(() => {})
  }
}

// Get cached subscription synchronously (returns null if not cached)
export function getCachedSubscription(): SubscriptionData | null {
  const now = Date.now()
  if (cachedSubscription.data && (now - cachedSubscription.timestamp) < CACHE_DURATION) {
    return cachedSubscription.data
  }
  return null
}

// Clear cache (useful after subscription changes)
export function clearSubscriptionCache() {
  cachedSubscription = { data: null, timestamp: 0 }
}
