'use client'

import { useEffect, useCallback } from 'react'
import { useTokenSubscription } from './useTokenSubscription'

const CHECKOUT_KEY = 'token_checkout_initiated'

/**
 * Hook to handle token balance refresh after checkout return
 * Call this in any page that displays token balance
 */
export function useTokenRefresh() {
  useEffect(() => {
    // Check if returning from checkout
    const checkoutInitiated = localStorage.getItem(CHECKOUT_KEY)
    if (checkoutInitiated) {
      localStorage.removeItem(CHECKOUT_KEY)
      // Dispatch event to refresh tokens across all components
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    }
  }, [])

  // Helper to mark checkout as initiated before redirect
  const markCheckoutInitiated = useCallback(() => {
    localStorage.setItem(CHECKOUT_KEY, 'true')
  }, [])

  return { markCheckoutInitiated }
}

/**
 * Combined hook for complete token synchronization
 * - Handles checkout return refresh
 * - Subscribes to Supabase Realtime for live updates
 * 
 * @param userId - The current user's ID for realtime subscription
 */
export function useTokenSync(userId: string | null | undefined) {
  // Handle checkout return
  useTokenRefresh()
  
  // Subscribe to Supabase Realtime for live token updates
  useTokenSubscription(userId)
}
