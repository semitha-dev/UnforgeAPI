'use client'

import { useMorningReport } from '@/lib/useMorningReport'
import DailyBriefingModal from './DailyBriefingModal'

/**
 * Morning Report Provider
 * 
 * Wraps the DailyBriefingModal with the useMorningReport hook.
 * Add this component once at the root layout or GlobalSidebar.
 * 
 * Features:
 * - Auto-shows on first visit of the day
 * - Auto-generates insights if none exist
 * - Deletes insights when user takes action
 * - Cleans up old insights for free users
 */
export default function MorningReportProvider() {
  const {
    showMorningReport,
    insights,
    userName,
    isLoading,
    closeMorningReport,
    deleteInsightOnAction
  } = useMorningReport()

  // Don't render anything while loading
  if (isLoading) return null

  return (
    <DailyBriefingModal
      isOpen={showMorningReport}
      onClose={closeMorningReport}
      insights={insights}
      userName={userName}
      onInsightAction={deleteInsightOnAction}
    />
  )
}
