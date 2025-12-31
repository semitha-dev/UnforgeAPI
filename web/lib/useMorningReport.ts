'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

interface Insight {
  id: string
  insight_type: string
  category: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  related_project_id?: string
  metadata: Record<string, unknown>
  is_actionable: boolean
  action_type?: string
  action_data?: Record<string, unknown>
  is_dismissed: boolean
}

interface UseMorningReportReturn {
  showMorningReport: boolean
  insights: Insight[]
  userName: string
  isLoading: boolean
  closeMorningReport: () => void
  dismissInsight: (insightId: string) => Promise<void>
  deleteInsightOnAction: (insightId: string) => Promise<void>
}

/**
 * Hook to manage morning report display
 * - Checks if user is visiting for the first time today
 * - Auto-generates insights if none exist
 * - Cleans up old insights for free users
 */
export function useMorningReport(): UseMorningReportReturn {
  const [showMorningReport, setShowMorningReport] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [userName, setUserName] = useState('there')
  const [isLoading, setIsLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  
  const supabase = createClient()

  const checkAndShowMorningReport = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, subscription_tier, last_seen_at, morning_report_shown_at')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setIsLoading(false)
        return
      }

      setUserName(profile.name || user.email?.split('@')[0] || 'there')
      const userIsPro = profile.subscription_tier === 'pro'
      setIsPro(userIsPro)

      const today = new Date().toISOString().split('T')[0]
      const morningReportShownToday = profile.morning_report_shown_at === today

      // Update last_seen_at
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)

      // For free users: cleanup old insights (keep only today's)
      if (!userIsPro) {
        await cleanupOldInsights(user.id, today)
      }

      // Check if this is first visit today and morning report hasn't been shown
      if (!morningReportShownToday) {
        // Check for today's insights
        const { data: todayInsights } = await supabase
          .from('insights')
          .select('*')
          .eq('user_id', user.id)
          .eq('insight_date', today)
          .eq('is_dismissed', false)
          .order('severity', { ascending: true })

        // If no insights for today, try to generate them
        if (!todayInsights || todayInsights.length === 0) {
          try {
            const response = await fetch('/api/insights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ forceRegenerate: false })
            })
            
            if (response.ok) {
              // Fetch the newly generated insights
              const { data: newInsights } = await supabase
                .from('insights')
                .select('*')
                .eq('user_id', user.id)
                .eq('insight_date', today)
                .eq('is_dismissed', false)
                .order('severity', { ascending: true })

              if (newInsights && newInsights.length > 0) {
                // Apply 50% limit for free users
                const limitedInsights = userIsPro 
                  ? newInsights 
                  : newInsights.slice(0, Math.ceil(newInsights.length / 2))
                
                setInsights(limitedInsights)
                setShowMorningReport(true)
                
                // Mark morning report as shown today
                await supabase
                  .from('profiles')
                  .update({ morning_report_shown_at: today })
                  .eq('id', user.id)
              }
            }
          } catch (error) {
            console.error('Failed to generate insights:', error)
          }
        } else {
          // Apply 50% limit for free users
          const limitedInsights = userIsPro 
            ? todayInsights 
            : todayInsights.slice(0, Math.ceil(todayInsights.length / 2))
          
          setInsights(limitedInsights)
          setShowMorningReport(true)
          
          // Mark morning report as shown today
          await supabase
            .from('profiles')
            .update({ morning_report_shown_at: today })
            .eq('id', user.id)
        }
      }
    } catch (error) {
      console.error('Error in morning report check:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  /**
   * Clean up old insights for free users
   * Only keeps today's insights
   */
  const cleanupOldInsights = async (userId: string, today: string) => {
    try {
      await supabase
        .from('insights')
        .delete()
        .eq('user_id', userId)
        .neq('insight_date', today)
    } catch (error) {
      console.error('Failed to cleanup old insights:', error)
    }
  }

  /**
   * Close the morning report modal
   */
  const closeMorningReport = useCallback(() => {
    setShowMorningReport(false)
  }, [])

  /**
   * Dismiss an insight (marks as dismissed but keeps in DB)
   */
  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      await fetch('/api/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, action: 'dismiss' })
      })
      
      setInsights(prev => prev.filter(i => i.id !== insightId))
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }, [])

  /**
   * Delete an insight when user takes action (review note, create flashcard, etc)
   * This completely removes the insight from the database
   */
  const deleteInsightOnAction = useCallback(async (insightId: string) => {
    try {
      await fetch('/api/insights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId })
      })
      
      setInsights(prev => prev.filter(i => i.id !== insightId))
    } catch (error) {
      console.error('Failed to delete insight:', error)
    }
  }, [])

  useEffect(() => {
    checkAndShowMorningReport()
  }, [checkAndShowMorningReport])

  return {
    showMorningReport,
    insights,
    userName,
    isLoading,
    closeMorningReport,
    dismissInsight,
    deleteInsightOnAction
  }
}
