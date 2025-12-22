// lib/useProjectTimeTracking.ts
'use client'

import { useEffect, useRef } from 'react'
import { useParams, usePathname } from 'next/navigation'

/**
 * Hook to track time spent on a project page
 * Automatically starts/stops tracking when component mounts/unmounts
 */
export function useProjectTimeTracking() {
  const params = useParams()
  const pathname = usePathname()
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const projectId = params.id as string | undefined

  useEffect(() => {
    if (!projectId) return

    let isActive = true

    // Start session
    const startSession = async () => {
      try {
        const response = await fetch('/api/project-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            action: 'start',
            pagePath: pathname
          })
        })

        if (response.ok) {
          const data = await response.json()
          sessionIdRef.current = data.sessionId
          console.log('[TimeTracking] Session started:', data.sessionId)
        }
      } catch (error) {
        console.error('[TimeTracking] Failed to start session:', error)
      }
    }

    // End session
    const endSession = async () => {
      if (!sessionIdRef.current) return

      try {
        await fetch('/api/project-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            action: 'end',
            sessionId: sessionIdRef.current
          })
        })
        console.log('[TimeTracking] Session ended:', sessionIdRef.current)
      } catch (error) {
        console.error('[TimeTracking] Failed to end session:', error)
      }
    }

    // Send heartbeat to keep session active
    const sendHeartbeat = async () => {
      if (!sessionIdRef.current || !isActive) return

      // Check if user has been inactive for more than 5 minutes
      const inactiveTime = Date.now() - lastActivityRef.current
      if (inactiveTime > 5 * 60 * 1000) {
        console.log('[TimeTracking] User inactive, ending session')
        await endSession()
        sessionIdRef.current = null
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
        return
      }

      try {
        await fetch('/api/project-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            action: 'heartbeat',
            sessionId: sessionIdRef.current,
            pagePath: pathname
          })
        })
      } catch (error) {
        console.error('[TimeTracking] Heartbeat failed:', error)
      }
    }

    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // Add activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    // Start tracking
    startSession()

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000)

    // Cleanup function
    return () => {
      isActive = false
      
      // Remove activity listeners
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      // End session
      endSession()
    }
  }, [projectId, pathname])

  return { projectId }
}
