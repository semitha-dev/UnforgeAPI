// app/project/[id]/schedule/ScheduleCalendar.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

interface Schedule {
  id: string
  exam_date: string
  difficulty: string
}

interface ScheduleTask {
  id: string
  schedule_id: string
  task_date: string
  task_type: 'lesson' | 'revision' | 'flashcard' | 'qa' | 'revise_mistake'
  task_name: string
  project_id: string
  project_name: string
  priority: string
  status: 'pending' | 'understood' | 'need_work'
  lesson_reference: string
}

interface TaskModalData {
  task: ScheduleTask
  date: Date
}

export default function ScheduleCalendar({ schedule, onUpdate }: { schedule: Schedule, onUpdate: () => void }) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<TaskModalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [schedule.id, currentMonth])

  const loadTasks = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', schedule.id)
        .gte('task_date', startOfMonth.toISOString().split('T')[0])
        .lte('task_date', endOfMonth.toISOString().split('T')[0])
        .order('task_date')

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getTasksForDate = (date: Date | null) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => task.task_date === dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    const examDate = new Date(schedule.exam_date)
    if (currentMonth.getMonth() < examDate.getMonth() || currentMonth.getFullYear() < examDate.getFullYear()) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }
  }

  const getTaskColor = (task: ScheduleTask) => {
    if (task.status === 'understood') return 'bg-green-100 text-green-800 border-green-200'
    if (task.status === 'need_work') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    
    switch (task.task_type) {
      case 'lesson':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'revision':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'flashcard':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'qa':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'revise_mistake':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'lesson':
        return '📚'
      case 'revision':
        return '🔄'
      case 'flashcard':
        return '🎴'
      case 'qa':
        return '❓'
      case 'revise_mistake':
        return '⚠️'
      default:
        return '📝'
    }
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const days = getDaysInMonth()
  const examDate = new Date(schedule.exam_date)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={handleNextMonth}
            disabled={currentMonth.getMonth() >= examDate.getMonth() && currentMonth.getFullYear() >= examDate.getFullYear()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span>Lesson</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span>Revision</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
            <span>Flashcard</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
            <span>QA</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span>Revise Mistake</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span>Understood</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date)
            const isExamDay = date && date.toDateString() === examDate.toDateString()
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 ${
                  !date ? 'bg-gray-50' : ''
                } ${isToday(date) ? 'bg-indigo-50' : ''} ${
                  isPastDate(date) ? 'opacity-60' : ''
                }`}
              >
                {date && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${
                        isToday(date) ? 'text-indigo-600' : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </span>
                      {isExamDay && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold">
                          EXAM
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask({ task, date })}
                          className={`w-full text-left text-xs p-1.5 rounded border ${getTaskColor(task)} hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{getTaskIcon(task.task_type)}</span>
                            <span className="truncate font-medium">{task.task_name}</span>
                          </div>
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskStatusModal
          task={selectedTask.task}
          date={selectedTask.date}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            setSelectedTask(null)
            loadTasks()
            onUpdate()
          }}
        />
      )}
    </div>
  )
}

// Task Status Modal
interface TaskStatusModalProps {
  task: ScheduleTask
  date: Date
  onClose: () => void
  onUpdate: () => void
}

function TaskStatusModal({ task, date, onClose, onUpdate }: TaskStatusModalProps) {
  const supabase = createClient()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  const handleStatusUpdate = async (status: 'understood' | 'need_work') => {
    setIsUpdating(true)
    setError('')

    try {
      const response = await fetch('/api/schedule/task/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          status,
          scheduleId: task.schedule_id
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update task')
      }

      onUpdate()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{task.task_name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-gray-700">Subject:</span>
            <span className="text-gray-600">{task.project_name}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-gray-700">Type:</span>
            <span className="text-gray-600 capitalize">{task.task_type.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-gray-700">Priority:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              task.priority === 'high' ? 'bg-red-100 text-red-800' :
              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {task.priority}
            </span>
          </div>
          {task.status !== 'pending' && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                task.status === 'understood' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {task.status === 'understood' ? 'Understood' : 'Need Work'}
              </span>
            </div>
          )}
        </div>

        {task.status === 'pending' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Mark your progress on this task:
            </p>
            <button
              onClick={() => handleStatusUpdate('understood')}
              disabled={isUpdating}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Understood</span>
            </button>
            <button
              onClick={() => handleStatusUpdate('need_work')}
              disabled={isUpdating}
              className="w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Need Work</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}