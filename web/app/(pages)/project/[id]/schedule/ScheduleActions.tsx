// app/(pages)/project/[id]/schedule/ScheduleActions.tsx
'use client'

import { useState, useEffect } from 'react'

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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Actions</h3>
      
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="space-y-3">
        {/* Shift Schedule */}
        <button
          onClick={() => setShowShiftModal(true)}
          className="w-full flex items-center justify-between p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔄</span>
            <div className="text-left">
              <p className="font-medium text-gray-900">Shift Schedule</p>
              <p className="text-xs text-gray-500">Redistribute tasks after missed days</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Cram Mode */}
        <button
          onClick={() => setShowCramModal(true)}
          className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚀</span>
            <div className="text-left">
              <p className="font-medium text-gray-900">Cram Mode</p>
              <p className="text-xs text-gray-500">Emergency schedule compression</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Export to Calendar */}
        <button
          onClick={handleExportICS}
          disabled={loading === 'export'}
          className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group disabled:opacity-50"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📅</span>
            <div className="text-left">
              <p className="font-medium text-gray-900">Export to Calendar</p>
              <p className="text-xs text-gray-500">Download ICS for Google/Apple Calendar</p>
            </div>
          </div>
          {loading === 'export' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
        </button>
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

  useState(() => {
    checkShiftStatus()
  })

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
