'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook to subscribe to real-time token balance updates from Supabase.
 * When the user's profile is updated (specifically tokens_balance),
 * this will dispatch a 'tokensUpdated' event to refresh all components.
 * 
 * NOTE: Supabase Realtime requires the table to have Realtime enabled in the dashboard:
 * Database -> Replication -> Select "profiles" table -> Enable Realtime
 * 
 * @param userId - The current user's ID to subscribe to
 */
export function useTokenSubscription(userId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) {
      console.log('[TokenSubscription] No userId, skipping subscription')
      return
    }

    console.log('[TokenSubscription] Setting up Realtime subscription for user:', userId)
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
          console.log('[TokenSubscription] Received Realtime update:', payload)
          
          // Check if tokens_balance was actually changed
          const oldTokens = payload.old?.tokens_balance
          const newTokens = payload.new?.tokens_balance
          
          console.log(`[TokenSubscription] Token change detected: ${oldTokens} -> ${newTokens}`)
          
          // Always dispatch the event to refresh - even if values look the same
          // (the RPC function might return different values than the cached column)
          window.dispatchEvent(new CustomEvent('tokensUpdated', { 
            detail: { oldTokens, newTokens } 
          }))
        }
      )
      .subscribe((status, err) => {
        console.log('[TokenSubscription] Subscription status:', status)
        if (err) {
          console.error('[TokenSubscription] Subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('[TokenSubscription] ✅ Successfully subscribed to profile changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[TokenSubscription] ❌ Channel error - check if Realtime is enabled for profiles table')
        }
      })

    channelRef.current = channel

    // Cleanup on unmount or userId change
    return () => {
      console.log('[TokenSubscription] Cleaning up subscription')
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
