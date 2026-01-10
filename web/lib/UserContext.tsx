'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

// Debug helper
function debug(tag: string, data: any) {
  const timestamp = new Date().toISOString()
  console.log(`%c[UserContext:${tag}]`, 'color: #8B5CF6; font-weight: bold', data)
}

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  educationLevel: string | null
  subscriptionTier: string
  subscriptionStatus: string | null
  subscriptionEndsAt: string | null
  createdAt: string | null
}

interface UserContextType {
  user: UserProfile | null
  isPro: boolean
  isAnonymous: boolean
  isLoading: boolean
  refetch: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => void
}

const defaultUser: UserProfile = {
  id: '',
  name: 'Guest',
  email: '',
  avatarUrl: null,
  educationLevel: null,
  subscriptionTier: 'free',
  subscriptionStatus: null,
  subscriptionEndsAt: null,
  createdAt: null
}

const UserContext = createContext<UserContextType>({
  user: null,
  isPro: false,
  isAnonymous: true,
  isLoading: true,
  refetch: async () => {},
  updateProfile: () => {}
})

// Global cache that persists across component mounts (survives navigation)
let globalUserCache: { user: UserProfile; timestamp: number } | null = null
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes - profile data changes less frequently

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(globalUserCache?.user || null)
  const [isLoading, setIsLoading] = useState(!globalUserCache)
  const fetchingRef = useRef(false)
  const initialLoadDone = useRef(!!globalUserCache)

  const fetchUser = useCallback(async (force = false) => {
    debug('fetchUser:start', { force, hasCachedUser: !!globalUserCache })
    
    // If forcing, clear the cache first
    if (force) {
      debug('fetchUser:clearCache', { reason: 'force=true' })
      globalUserCache = null
      fetchingRef.current = false // Reset in case previous fetch hung
    }
    
    // Check global cache first (unless forced)
    if (!force && globalUserCache && Date.now() - globalUserCache.timestamp < CACHE_DURATION) {
      debug('fetchUser:useCache', { 
        subscriptionTier: globalUserCache.user.subscriptionTier,
        cacheAge: Math.round((Date.now() - globalUserCache.timestamp) / 1000) + 's'
      })
      setUser(globalUserCache.user)
      setIsLoading(false)
      return
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      debug('fetchUser:skip', { reason: 'already fetching' })
      return
    }
    fetchingRef.current = true
    setIsLoading(true)
    debug('fetchUser:fetching', { timestamp: new Date().toISOString() })

    try {
      const supabase = createClient()
      debug('fetchUser:getAuth', { timestamp: new Date().toISOString() })
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      debug('fetchUser:authResult', { 
        hasUser: !!authUser, 
        userId: authUser?.id,
        email: authUser?.email,
        error: authError?.message 
      })
      
      if (!authUser) {
        debug('fetchUser:noAuth', { reason: 'No authenticated user' })
        const anonymousUser = { ...defaultUser, subscriptionTier: 'anonymous' }
        setUser(anonymousUser)
        globalUserCache = { user: anonymousUser, timestamp: Date.now() }
        return
      }

      debug('fetchUser:queryProfile', { userId: authUser.id })
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, full_name, email, avatar_url, education_level, subscription_tier, subscription_status, subscription_ends_at, created_at')
        .eq('id', authUser.id)
        .single()
      
      debug('fetchUser:profileResult', { 
        hasProfile: !!profile,
        error: profileError?.message,
        subscription_tier: profile?.subscription_tier,
        subscription_status: profile?.subscription_status
      })

      const userData: UserProfile = {
        id: authUser.id,
        name: profile?.name || profile?.full_name || authUser.email?.split('@')[0] || 'User',
        email: profile?.email || authUser.email || '',
        avatarUrl: profile?.avatar_url || null,
        educationLevel: profile?.education_level || null,
        subscriptionTier: profile?.subscription_tier || 'free',
        subscriptionStatus: profile?.subscription_status || null,
        subscriptionEndsAt: profile?.subscription_ends_at || null,
        createdAt: profile?.created_at || null
      }

      debug('fetchUser:success', { 
        subscriptionTier: userData.subscriptionTier,
        subscriptionStatus: userData.subscriptionStatus,
        name: userData.name,
        email: userData.email
      })
      
      setUser(userData)
      globalUserCache = { user: userData, timestamp: Date.now() }
      debug('fetchUser:cached', { tier: userData.subscriptionTier })
    } catch (error) {
      console.error('Error fetching user:', error)
      // On error, set as guest
      const guestUser = { ...defaultUser }
      setUser(guestUser)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [])

  // Local update (for optimistic UI updates after saving)
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      // Also update global cache
      if (globalUserCache) {
        globalUserCache = { user: updated, timestamp: Date.now() }
      }
      return updated
    })
  }, [])

  useEffect(() => {
    // Only fetch on first mount if no cache exists
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      fetchUser()
    } else if (globalUserCache) {
      // Use cached value immediately
      setUser(globalUserCache.user)
      setIsLoading(false)
    }
  }, [fetchUser])

  const value: UserContextType = {
    user,
    isPro: user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'managed_pro' || user?.subscriptionTier === 'byok_pro',
    isAnonymous: !user || user.subscriptionTier === 'anonymous',
    isLoading,
    refetch: () => fetchUser(true),
    updateProfile
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

// Utility to clear cache (call after sign out)
export function clearUserCache() {
  globalUserCache = null
}

// Utility to get cached user synchronously (for quick checks)
export function getCachedUser(): UserProfile | null {
  return globalUserCache?.user || null
}
