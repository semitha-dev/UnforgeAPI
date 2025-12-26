// app/(pages)/project/[id]/schedule/ScheduleActions.tsx
'use client'

import { useState, useEffect } from 'react'
import { RefreshCcw, Rocket, Download, ChevronRight, X, AlertTriangle, CheckCircle2, Clock, CalendarDays, Loader2 } from 'lucide-react'

interface ScheduleActionsProps {
  scheduleId: string
  onUpdate?: () => void
}

export default function ScheduleActions({ scheduleId, onUpdate }: ScheduleActionsProps) {
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showCramModal, setShowCramModal] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExportICS = async () => {
    setLoading('export')
    setMessage(null)
    try {
      const response = await fetch(`/api/schedule/export?scheduleId=${scheduleId}`)
      if (!response.ok) throw new Error('Failed to export schedule')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `study-schedule.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Schedule exported successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Schedule Actions</h2>
          <p className="text-zinc-500 mt-1">Manage and adjust your study schedule</p>
        </div>
      </div>
      
      {/* Alert Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Shift Schedule */}
        <div className="col-span-12 lg:col-span-4">
          <button
            onClick={() => setShowShiftModal(true)}
            className="w-full bg-white rounded-xl border border-zinc-200 p-6 hover:border-amber-300 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <RefreshCcw className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Shift Schedule</h3>
            <p className="text-sm text-zinc-500">Redistribute tasks after missed days to catch up on your study plan</p>
          </button>
        </div>

        {/* Cram Mode */}
        <div className="col-span-12 lg:col-span-4">
          <button
            onClick={() => setShowCramModal(true)}
            className="w-full bg-white rounded-xl border border-zinc-200 p-6 hover:border-red-300 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-red-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-red-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Cram Mode</h3>
            <p className="text-sm text-zinc-500">Emergency schedule compression for intensive last-minute study</p>
          </button>
        </div>

        {/* Export to Calendar */}
        <div className="col-span-12 lg:col-span-4">
          <button
            onClick={handleExportICS}
            disabled={loading === 'export'}
            className="w-full bg-white rounded-xl border border-zinc-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                {loading === 'export' ? (
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                ) : (
                  <Download className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Export Calendar</h3>
            <p className="text-sm text-zinc-500">Download ICS file for Google Calendar, Apple Calendar, or Outlook</p>
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <RefreshCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">When to Shift</h4>
                <p className="text-sm text-amber-700">Use shift when you've missed a few days and need to catch up. It redistributes overdue tasks evenly across remaining days.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Rocket className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-red-900 mb-1">When to Cram</h4>
                <p className="text-sm text-red-700">Use cram mode when your exam is very close and you're behind schedule. This compresses all tasks into intensive study sessions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Schedule Modal */}
      {showShiftModal && (
        <ShiftScheduleModal
          scheduleId={scheduleId}
          onClose={() => setShowShiftModal(false)}
          onSuccess={() => {
            setShowShiftModal(false)
            setMessage({ type: 'success', text: 'Schedule shifted successfully!' })
            onUpdate?.()
          }}
        />
      )}

      {/* Cram Mode Modal */}
      {showCramModal && (
        <CramModeModal
          scheduleId={scheduleId}
          onClose={() => setShowCramModal(false)}
          onSuccess={() => {
            setShowCramModal(false)
            setMessage({ type: 'success', text: 'Cram mode activated!' })
            onUpdate?.()
          }}
        />
      )}
    </div>
  )
}

// Shift Schedule Modal
function ShiftScheduleModal({ 
  scheduleId, 
  onClose, 
  onSuccess 
}: { 
  scheduleId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [shiftInfo, setShiftInfo] = useState<{
    needsShift: boolean
    overdueTaskCount: number
    pendingTaskCount: number
    daysUntilExam: number
    overdueTasks: Array<{ id: string; name: string; date: string; priority: string }>
  } | null>(null)
  const [error, setError] = useState('')

  const checkShiftStatus = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/schedule/shift?scheduleId=${scheduleId}`)
      if (!response.ok) throw new Error('Failed to check status')
      const data = await response.json()
      setShiftInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkShiftStatus()
  }, [])

  const handleShift = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/schedule/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, reason: 'Manual shift by user' })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to shift schedule')
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Shift Schedule</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={checkShiftStatus}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {shiftInfo?.needsShift ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800">
                    <strong>{shiftInfo.overdueTaskCount}</strong> overdue tasks found. 
                    Shifting will redistribute all {shiftInfo.pendingTaskCount} pending tasks 
                    across the remaining {shiftInfo.daysUntilExam} days.
                  </p>
                </div>

                {shiftInfo.overdueTasks && shiftInfo.overdueTasks.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Overdue Tasks:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shiftInfo.overdueTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{task.name}</span>
                          <span className="text-xs text-red-500">{task.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleShift}
                  disabled={loading}
                  className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Shifting...' : 'Shift Schedule'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">✅</span>
                <p className="text-gray-600">
                  No overdue tasks! Your schedule is up to date.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Cram Mode Modal
function CramModeModal({ 
  scheduleId, 
  onClose, 
  onSuccess 
}: { 
  scheduleId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [cramInfo, setCramInfo] = useState<{
    cramModeEnabled: boolean
    recommendation: {
      shouldActivate: boolean
      reason: string
      daysUntilExam: number
      pendingTasks: number
      estimatedHoursRemaining: number
      requiredDailyHours: number
      completionRate: number
    }
  } | null>(null)
  const [error, setError] = useState('')

  const checkCramStatus = async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/schedule/cram?scheduleId=${scheduleId}`)
      if (!response.ok) throw new Error('Failed to check status')
      const data = await response.json()
      setCramInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkCramStatus()
  }, [scheduleId])

  const handleCramMode = async (action: 'activate' | 'deactivate') => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/schedule/cram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, action })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change cram mode')
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Cram Mode</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={checkCramStatus}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Retry
            </button>
          </div>
        ) : cramInfo?.cramModeEnabled ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <span className="text-3xl block mb-2">🚀</span>
              <p className="text-red-800 font-semibold">Cram Mode is Active</p>
              <p className="text-sm text-red-600 mt-1">
                Your tasks are compressed for intensive study
              </p>
            </div>

            <button
              onClick={() => handleCramMode('deactivate')}
              disabled={loading}
              className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Deactivating...' : 'Deactivate Cram Mode'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${
              cramInfo?.recommendation.shouldActivate 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={cramInfo?.recommendation.shouldActivate ? 'text-red-800' : 'text-green-800'}>
                {cramInfo?.recommendation.reason}
              </p>
            </div>

            {cramInfo?.recommendation && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {cramInfo.recommendation.daysUntilExam}
                  </div>
                  <div className="text-xs text-gray-500">Days Left</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {cramInfo.recommendation.pendingTasks}
                  </div>
                  <div className="text-xs text-gray-500">Tasks Left</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {cramInfo.recommendation.estimatedHoursRemaining}h
                  </div>
                  <div className="text-xs text-gray-500">Study Time</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">
                    {cramInfo.recommendation.requiredDailyHours}h
                  </div>
                  <div className="text-xs text-gray-500">Per Day Needed</div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ <strong>Warning:</strong> Cram mode compresses all tasks into remaining days. 
              This will result in longer daily study sessions.
            </div>

            <button
              onClick={() => handleCramMode('activate')}
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Activating...' : 'Activate Cram Mode'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
