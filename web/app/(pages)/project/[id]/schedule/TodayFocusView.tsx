// app/(pages)/project/[id]/schedule/TodayFocusView.tsx
'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Target, CalendarDays, ChevronRight, Zap, AlertTriangle, BookOpen, RotateCcw, HelpCircle, AlertCircle, FileText } from 'lucide-react'

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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4 h-40 bg-zinc-100 rounded-xl"></div>
            <div className="col-span-12 lg:col-span-8 h-40 bg-zinc-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadTodayData}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!data || data.summary.totalTasks === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 mb-2">All Caught Up!</h3>
        <p className="text-zinc-600">No tasks scheduled for today. Enjoy your rest!</p>
      </div>
    )
  }

  const schedule = data.schedules[0]
  const { summary } = data

  // Determine score color based on percentage
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return { bg: '#dcfce7', text: '#16a34a', ring: '#22c55e' }
    if (percentage >= 60) return { bg: '#fef9c3', text: '#ca8a04', ring: '#eab308' }
    if (percentage >= 40) return { bg: '#fed7aa', text: '#ea580c', ring: '#f97316' }
    return { bg: '#fecaca', text: '#dc2626', ring: '#ef4444' }
  }

  const colors = getScoreColor(summary.percentage)
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (summary.percentage / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Today's Focus</h2>
          <p className="text-zinc-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="px-3 py-1.5 bg-zinc-100 rounded-lg">
          <span className="text-sm font-medium text-zinc-700">
            {schedule?.daysUntilExam || 0} days to exam
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Progress Ring Card */}
        <div 
          className="col-span-12 lg:col-span-4 rounded-xl p-6 border"
          style={{ backgroundColor: colors.bg, borderColor: colors.ring + '30' }}
        >
          <div className="flex flex-col items-center">
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={colors.ring}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: colors.text }}>{summary.percentage}%</span>
                <span className="text-xs" style={{ color: colors.text }}>complete</span>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 w-full text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{summary.completed}</div>
                <div className="text-xs text-zinc-600">Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{summary.pending}</div>
                <div className="text-xs text-zinc-600">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{summary.totalTasks}</div>
                <div className="text-xs text-zinc-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Content */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Time Remaining Card */}
          {schedule && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-zinc-900">Time Progress</span>
                </div>
                <span className="text-sm font-medium text-zinc-600">
                  {Math.round(schedule.time.remainingMinutes / 60 * 10) / 10}h remaining
                </span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((schedule.time.completedMinutes / schedule.time.totalMinutes) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>{Math.round(schedule.time.completedMinutes)} min completed</span>
                <span>{Math.round(schedule.time.totalMinutes)} min total</span>
              </div>
            </div>
          )}

          {/* Next Task Card */}
          {schedule?.nextTask && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-semibold text-zinc-900">Up Next</span>
                </div>
                <span className="text-xs px-2 py-1 bg-zinc-100 rounded-lg text-zinc-600">
                  ~{schedule.nextTask.estimatedMinutes} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900">{schedule.nextTask.name}</h4>
                  <p className="text-sm text-zinc-500">{schedule.nextTask.projectName}</p>
                </div>
                <button
                  onClick={() => onTaskClick?.(schedule.nextTask!.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
                >
                  Start <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm text-indigo-900 font-medium">{data.motivationalMessage}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Lists */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pending Tasks */}
        {schedule?.tasks.pending.length > 0 && (
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="font-semibold text-zinc-900 text-sm">Pending Tasks</span>
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full ml-auto">
                  {schedule.tasks.pending.length}
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
                {schedule.tasks.pending.map(task => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick?.(task.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Need Work Tasks */}
        {schedule?.tasks.needWork.length > 0 && (
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
              <div className="px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="font-semibold text-orange-900 text-sm">Needs Review</span>
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full ml-auto">
                  {schedule.tasks.needWork.length}
                </span>
              </div>
              <div className="divide-y divide-orange-100">
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
          </div>
        )}

        {/* Completed Tasks */}
        {schedule?.tasks.completed.length > 0 && (
          <div className="col-span-12">
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="font-semibold text-emerald-900 text-sm">Completed</span>
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full ml-auto">
                  {schedule.tasks.completed.length}
                </span>
              </div>
              <div className="divide-y divide-emerald-100 max-h-48 overflow-y-auto">
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
      case 'lesson': return <BookOpen className="w-4 h-4" />
      case 'revision': return <RotateCcw className="w-4 h-4" />
      case 'flashcard': return <FileText className="w-4 h-4" />
      case 'qa': return <HelpCircle className="w-4 h-4" />
      case 'revise_mistake': return <AlertTriangle className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const iconBgColors = {
    default: 'bg-zinc-100 text-zinc-600',
    warning: 'bg-orange-100 text-orange-600',
    success: 'bg-emerald-100 text-emerald-600'
  }

  return (
    <div 
      onClick={onClick}
      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgColors[variant]}`}>
          {getTaskIcon(task.type)}
        </div>
        <div>
          <p className={`font-medium text-sm ${variant === 'success' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
            {task.name}
          </p>
          <p className="text-xs text-zinc-500">{task.projectName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-lg ${
          task.priority === 'high' ? 'bg-red-100 text-red-700' :
          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-zinc-100 text-zinc-600'
        }`}>
          {task.priority}
        </span>
        <span className="text-xs text-zinc-400">{task.estimatedMinutes}m</span>
        <ChevronRight className="w-4 h-4 text-zinc-400" />
      </div>
    </div>
  )
}
