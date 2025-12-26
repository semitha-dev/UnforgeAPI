// app/project/[id]/schedule/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loading } from '@/components/ui/loading'
import CreateScheduleModal from './CreateScheduleModal'
import ScheduleCalendar from './ScheduleCalendar'
import TodayFocusView from './TodayFocusView'
import ExamReadinessScore from './ExamReadinessScore'
import ScheduleActions from './ScheduleActions'

interface Schedule {
  id: string
  user_id: string
  exam_date: string
  difficulty: 'low' | 'medium' | 'high'
  preferred_days: number[]
  preferred_time: string
  created_at: string
  buffer_day?: number
  daily_study_minutes?: number
  cram_mode_enabled?: boolean
}

type ViewMode = 'calendar' | 'today' | 'analytics' | 'actions'

export default function SchedulePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

  useEffect(() => {
    loadSchedule()
  }, [])

  const loadSchedule = async () => {
    console.log('🔄 Loading schedule...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      console.log('👤 User ID:', user.id)

      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      console.log('📅 Schedule loaded:', data)
      console.log('❌ Error:', error)

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setSchedule(data)
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleCreated = () => {
    console.log('✅ Schedule created - refreshing...')
    setShowCreateModal(false)
    setLoading(true)
    loadSchedule()
  }

  const handleScheduleUpdated = () => {
    setShowEditModal(false)
    loadSchedule()
  }

  const handleDeleteSchedule = async () => {
    if (!schedule) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/schedule/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete schedule')
      }

      // Successfully deleted - just reset state (don't reload)
      setSchedule(null)
      setShowDeleteConfirm(false)
    } catch (error: any) {
      console.error('Error deleting schedule:', error)
      alert(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <Loading message="Loading schedule..." fullScreen />
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
        <p className="text-sm sm:text-base text-gray-600">
          {schedule 
            ? `Your personalized study plan until ${new Date(schedule.exam_date).toLocaleDateString()}`
            : 'Create a personalized study schedule for your exams'
          }
        </p>
        {schedule ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3 sm:gap-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 font-medium text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Add More Subjects</span>
              <span className="sm:hidden">Add Subjects</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 font-medium text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 font-medium text-sm"
            style={{ backgroundColor: '#4285F4' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Create Schedule</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {schedule ? (
          <div className="space-y-6">
            {/* View Mode Tabs */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                onClick={() => setViewMode('today')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'today'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Today
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <button
                onClick={() => setViewMode('actions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'actions'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Actions
              </button>
            </div>

            {/* View Content */}
            {viewMode === 'today' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TodayFocusView 
                    scheduleId={schedule.id}
                    onTaskClick={(taskId) => setViewMode('calendar')}
                  />
                </div>
                <div>
                  <ExamReadinessScore scheduleId={schedule.id} compact />
                </div>
              </div>
            )}

            {viewMode === 'calendar' && (
              <ScheduleCalendar 
                schedule={schedule} 
                onUpdate={loadSchedule}
              />
            )}

            {viewMode === 'analytics' && (
              <ExamReadinessScore scheduleId={schedule.id} />
            )}

            {viewMode === 'actions' && (
              <ScheduleActions scheduleId={schedule.id} onUpdate={loadSchedule} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-full max-w-md mb-8 rounded-2xl overflow-hidden">
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-auto"
              >
                <source src="/vid.webm" type="video/webm" />
                <source src="/vid.mp4" type="video/mp4" />
              </video>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Create Your Study Schedule</h3>
            <p className="text-zinc-500 mb-6 text-center max-w-md">
              Build a personalized study plan based on your exam date, preferences, and priorities.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-zinc-900/10"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleScheduleCreated}
          isEdit={false}
        />
      )}

      {showEditModal && schedule && (
        <CreateScheduleModal
          onClose={() => setShowEditModal(false)}
          onSuccess={handleScheduleUpdated}
          isEdit={true}
          existingSchedule={schedule}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Schedule</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete your study schedule? This will remove:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>All scheduled tasks</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>All recorded mistakes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Your study progress</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSchedule}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Schedule</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
