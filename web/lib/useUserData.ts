'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { getCachedSubscription, prefetchSubscription } from './useSubscription'

interface UserProfile {
  id: string | null
  name: string
  email: string
  subscription_tier: string
}

interface UseUserDataOptions {
  redirectToSignIn?: boolean
  allowAnonymous?: boolean
}

// Simple in-memory cache
let cachedProfile: { data: UserProfile | null; timestamp: number; userId: string | null } = {
  data: null,
  timestamp: 0,
  userId: null
}

const PROFILE_CACHE_DURATION = 30000 // 30 seconds

export function useUserData(options: UseUserDataOptions = {}) {
  const { redirectToSignIn = false, allowAnonymous = true } = options
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fetchedRef = useRef(false)
  const supabase = createClient()

  const loadUserData = useCallback(async () => {
    try {
      // Start subscription fetch early (will use cache if available)
      prefetchSubscription()
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        if (allowAnonymous) {
          const anonymousProfile: UserProfile = {
            id: null,
            name: 'Guest',
            email: '',
            subscription_tier: 'anonymous'
          }
          setProfile(anonymousProfile)
          setIsLoading(false)
          return anonymousProfile
        } else if (redirectToSignIn) {
          window.location.href = '/signin'
          return null
        }
        setIsLoading(false)
        return null
      }

      // Check profile cache
      const now = Date.now()
      if (cachedProfile.data && 
          cachedProfile.userId === user.id && 
          (now - cachedProfile.timestamp) < PROFILE_CACHE_DURATION) {
        // Use cached profile but still check for updated subscription
        const cachedSub = getCachedSubscription()
        const profileWithSub: UserProfile = {
          ...cachedProfile.data,
          subscription_tier: cachedSub?.tier || cachedProfile.data.subscription_tier
        }
        setProfile(profileWithSub)
        setIsLoading(false)
        return profileWithSub
      }

      // Fetch profile and subscription in parallel
      const [profileResult, subscriptionResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, email, full_name')
          .eq('id', user.id)
          .single(),
        fetch('/api/subscription').then(res => res.ok ? res.json() : null).catch(() => null)
      ])

      const profileData = profileResult.data
      const subscriptionTier = subscriptionResult?.subscription?.tier || 'free'

      const userProfile: UserProfile = {
        id: user.id,
        name: profileData?.name || profileData?.full_name || '',
        email: profileData?.email || user.email || '',
        subscription_tier: subscriptionTier
      }

      // Update cache
      cachedProfile = { data: userProfile, timestamp: now, userId: user.id }
      
      setProfile(userProfile)
      setIsLoading(false)
      return userProfile
    } catch (error) {
      console.error('Error loading user data:', error)
      if (allowAnonymous) {
        const anonymousProfile: UserProfile = {
          id: null,
          name: 'Guest',
          email: '',
          subscription_tier: 'anonymous'
        }
        setProfile(anonymousProfile)
      }
      setIsLoading(false)
      return null
    }
  }, [supabase, redirectToSignIn, allowAnonymous])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      loadUserData()
    }
  }, [loadUserData])

  const refetch = useCallback(() => {
    cachedProfile = { data: null, timestamp: 0, userId: null }
    return loadUserData()
  }, [loadUserData])

  return {
    profile,
    isLoading,
    isPro: profile?.subscription_tier === 'pro',
    isAnonymous: profile?.subscription_tier === 'anonymous',
    refetch
  }
}

// Clear user cache (useful after sign out)
export function clearUserCache() {
  cachedProfile = { data: null, timestamp: 0, userId: null }
}
