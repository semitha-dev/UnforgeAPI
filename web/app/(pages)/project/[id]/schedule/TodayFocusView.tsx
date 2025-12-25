// app/(pages)/project/[id]/schedule/TodayFocusView.tsx
'use client'

import { useState, useEffect } from 'react'

interface TodayTask {
  id: string
  name: string
  type: string
  status: string
  priority: string
  projectId: string
  projectName: string
  lessonReference: string
  estimatedMinutes: number
  actualMinutes?: number
}

interface TodayData {
  date: string
  isToday: boolean
  summary: {
    totalTasks: number
    completed: number
    pending: number
    percentage: number
  }
  schedules: Array<{
    scheduleId: string
    examDate: string
    daysUntilExam: number
    cramModeEnabled: boolean
    progress: {
      completed: number
      total: number
      percentage: number
    }
    time: {
      totalMinutes: number
      completedMinutes: number
      remainingMinutes: number
    }
    tasks: {
      pending: TodayTask[]
      needWork: TodayTask[]
      completed: TodayTask[]
    }
    nextTask: TodayTask | null
  }>
  motivationalMessage: string
}

interface TodayFocusViewProps {
  scheduleId?: string
  onTaskClick?: (taskId: string) => void
}

export default function TodayFocusView({ scheduleId, onTaskClick }: TodayFocusViewProps) {
  const [data, setData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTodayData()
  }, [scheduleId])

  const loadTodayData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (scheduleId) params.set('scheduleId', scheduleId)
      
      const response = await fetch(`/api/schedule/today?${params}`)
      if (!response.ok) throw new Error('Failed to load today data')
      
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={loadTodayData}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || data.summary.totalTasks === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">🌟</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Tasks Today</h3>
        <p className="text-gray-600">Enjoy your rest day! You've earned it.</p>
      </div>
    )
  }

  const schedule = data.schedules[0]
  const { summary } = data
  const progressAngle = (summary.percentage / 100) * 360

  return (
    <div className="space-y-6">
      {/* Progress Ring Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Today's Focus</h2>
            <p className="text-indigo-200">{data.motivationalMessage}</p>
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="10"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(summary.percentage / 100) * 283} 283`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{summary.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <div className="text-3xl font-bold">{summary.completed}</div>
            <div className="text-sm text-indigo-200">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{summary.pending}</div>
            <div className="text-sm text-indigo-200">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{schedule?.daysUntilExam || '-'}</div>
            <div className="text-sm text-indigo-200">Days to Exam</div>
          </div>
        </div>
      </div>

      {/* Time Remaining */}
      {schedule && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Remaining</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((schedule.time.completedMinutes / schedule.time.totalMinutes) * 100)}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-gray-900">
                {Math.round(schedule.time.remainingMinutes / 60 * 10) / 10}h
              </span>
              <span className="text-sm text-gray-500 ml-1">left</span>
            </div>
          </div>
        </div>
      )}

      {/* Next Task Card */}
      {schedule?.nextTask && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Up Next</span>
            <span className="text-xs text-gray-500">
              ~{schedule.nextTask.estimatedMinutes} min
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{schedule.nextTask.name}</h3>
          <p className="text-sm text-gray-600 mb-4">{schedule.nextTask.projectName}</p>
          <button
            onClick={() => onTaskClick?.(schedule.nextTask!.id)}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Start Task →
          </button>
        </div>
      )}

      {/* Task Lists */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Pending Tasks */}
        {schedule?.tasks.pending.length > 0 && (
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Pending ({schedule.tasks.pending.length})
            </h3>
            <div className="space-y-2">
              {schedule.tasks.pending.map(task => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  onClick={() => onTaskClick?.(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Need Work Tasks */}
        {schedule?.tasks.needWork.length > 0 && (
          <div className="p-6 border-b border-gray-100 bg-orange-50">
            <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Need Review ({schedule.tasks.needWork.length})
            </h3>
            <div className="space-y-2">
              {schedule.tasks.needWork.map(task => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  onClick={() => onTaskClick?.(task.id)}
                  variant="warning"
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {schedule?.tasks.completed.length > 0 && (
          <div className="p-6 bg-green-50">
            <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Completed ({schedule.tasks.completed.length})
            </h3>
            <div className="space-y-2">
              {schedule.tasks.completed.map(task => (
                <TaskRow 
                  key={task.id} 
                  task={task} 
                  onClick={() => onTaskClick?.(task.id)}
                  variant="success"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Task Row Component
function TaskRow({ 
  task, 
  onClick, 
  variant = 'default' 
}: { 
  task: TodayTask
  onClick?: () => void
  variant?: 'default' | 'warning' | 'success'
}) {
  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'lesson': return '📚'
      case 'revision': return '🔄'
      case 'flashcard': return '🎴'
      case 'qa': return '❓'
      case 'revise_mistake': return '⚠️'
      default: return '📝'
    }
  }

  const baseClasses = 'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors'
  const variantClasses = {
    default: 'bg-gray-50 hover:bg-gray-100',
    warning: 'bg-orange-100 hover:bg-orange-200',
    success: 'bg-green-100 hover:bg-green-200 opacity-75'
  }

  return (
    <div 
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{getTaskIcon(task.type)}</span>
        <div>
          <p className={`font-medium ${variant === 'success' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.name}
          </p>
          <p className="text-xs text-gray-500">{task.projectName}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {task.priority}
        </span>
        <span className="text-xs text-gray-500">{task.estimatedMinutes}m</span>
      </div>
    </div>
  )
}
