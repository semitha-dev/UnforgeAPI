'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook to subscribe to real-time token balance updates from Supabase.
 * When the user's profile is updated (specifically tokens_balance),
 * this will dispatch a 'tokensUpdated' event to refresh all components.
 * 
 * @param userId - The current user's ID to subscribe to
 */
export function useTokenSubscription(userId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to changes on the profiles table for this specific user
    const channel = supabase
      .channel(`profile-tokens-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Token balance updated via Supabase Realtime:', payload)
          
          // Check if tokens_balance was actually changed
          const oldTokens = payload.old?.tokens_balance
          const newTokens = payload.new?.tokens_balance
          
          if (oldTokens !== newTokens) {
            console.log(`Tokens changed: ${oldTokens} -> ${newTokens}`)
            // Dispatch the tokensUpdated event to refresh all components
            window.dispatchEvent(new CustomEvent('tokensUpdated'))
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime subscription status:', status)
      })

    channelRef.current = channel

    // Cleanup on unmount or userId change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])
}

/**
 * Alternative: Subscribe to token_ledger changes for more granular updates
 * Use this if you need to track individual token transactions
 */
export function useTokenLedgerSubscription(userId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Subscribe to new entries in token_ledger for this user
    const channel = supabase
      .channel(`token-ledger-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_ledger',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New token transaction:', payload)
          // Dispatch the tokensUpdated event to refresh all components
          window.dispatchEvent(new CustomEvent('tokensUpdated'))
        }
      )
      .subscribe((status) => {
        console.log('Token ledger subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])
}
