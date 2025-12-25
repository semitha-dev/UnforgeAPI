// app/(pages)/project/[id]/schedule/ExamReadinessScore.tsx
'use client'

import { useState, useEffect } from 'react'

interface ReadinessData {
  scheduleId: string
  examDate: string
  daysUntilExam: number
  readinessScore: {
    score: number
    label: string
    color: string
    breakdown: {
      completion: number
      highPriority: number
      adherence: number
      timeComfort: number
      consistency: number
    }
  }
  progress: {
    completed: number
    pending: number
    needWork: number
    total: number
    percentage: number
  }
  time: {
    totalEstimatedMinutes: number
    completedMinutes: number
    remainingMinutes: number
    averageMinutesPerDay: number
  }
  overdue: {
    count: number
    tasks: Array<{ id: string; name: string; date: string; priority: string }>
  }
  priority: {
    high: { total: number; completed: number }
    medium: { total: number; completed: number }
    low: { total: number; completed: number }
  }
  streak: {
    current: number
    longest: number
  }
  burnDown: Array<{
    date: string
    ideal: number
    actual: number | null
    completed: number
  }>
}

interface ExamReadinessScoreProps {
  scheduleId: string
  compact?: boolean
}

export default function ExamReadinessScore({ scheduleId, compact = false }: ExamReadinessScoreProps) {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
  }, [scheduleId])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/schedule/analytics?scheduleId=${scheduleId}`)
      if (!response.ok) throw new Error('Failed to load analytics')
      
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
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 text-center text-red-500">
        {error || 'No data available'}
      </div>
    )
  }

  const { readinessScore, progress, time, overdue, streak, daysUntilExam, priority } = data

  // Compact view for sidebar/dashboard
  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Exam Readiness</h3>
          <span className="text-xs text-gray-500">{daysUntilExam} days left</span>
        </div>
        
        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-3">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={readinessScore.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(readinessScore.score / 100) * 251} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: readinessScore.color }}>
                {readinessScore.score}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-center text-sm font-medium" style={{ color: readinessScore.color }}>
          {readinessScore.label}
        </p>
      </div>
    )
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Main Readiness Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div 
          className="p-6"
          style={{ backgroundColor: `${readinessScore.color}15` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Exam Readiness</h2>
              <p className="text-gray-600">
                {daysUntilExam} days until {new Date(data.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {/* Big Score Circle */}
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={readinessScore.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(readinessScore.score / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: readinessScore.color }}>
                  {readinessScore.score}
                </span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
            </div>
          </div>
          
          <div 
            className="mt-4 px-4 py-2 rounded-full inline-block text-sm font-semibold"
            style={{ 
              backgroundColor: readinessScore.color,
              color: 'white'
            }}
          >
            {readinessScore.label}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="p-6 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Breakdown</h3>
          <div className="space-y-3">
            <BreakdownBar 
              label="Completion" 
              value={readinessScore.breakdown.completion}
              color="#6366f1"
            />
            <BreakdownBar 
              label="High Priority" 
              value={readinessScore.breakdown.highPriority}
              color="#ef4444"
            />
            <BreakdownBar 
              label="Schedule Adherence" 
              value={readinessScore.breakdown.adherence}
              color="#f59e0b"
            />
            <BreakdownBar 
              label="Time Comfort" 
              value={readinessScore.breakdown.timeComfort}
              color="#10b981"
            />
            <BreakdownBar 
              label="Consistency" 
              value={readinessScore.breakdown.consistency}
              color="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon="🔥"
          label="Current Streak"
          value={streak.current}
          subtext="days"
          color="orange"
        />
        <StatCard 
          icon="🏆"
          label="Longest Streak"
          value={streak.longest}
          subtext="days"
          color="yellow"
        />
        <StatCard 
          icon="✅"
          label="Completed"
          value={progress.completed}
          subtext={`of ${progress.total}`}
          color="green"
        />
        <StatCard 
          icon="⏱️"
          label="Time Left"
          value={Math.round(time.remainingMinutes / 60)}
          subtext="hours"
          color="blue"
        />
      </div>

      {/* Priority Progress */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Progress</h3>
        <div className="space-y-4">
          <PriorityProgress 
            label="High Priority"
            completed={priority.high.completed}
            total={priority.high.total}
            color="#ef4444"
          />
          <PriorityProgress 
            label="Medium Priority"
            completed={priority.medium.completed}
            total={priority.medium.total}
            color="#f59e0b"
          />
          <PriorityProgress 
            label="Low Priority"
            completed={priority.low.completed}
            total={priority.low.total}
            color="#22c55e"
          />
        </div>
      </div>

      {/* Overdue Warning */}
      {overdue.count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-semibold text-red-800">
              {overdue.count} Overdue Tasks
            </h3>
          </div>
          <p className="text-sm text-red-600 mb-4">
            These tasks were scheduled for past dates and haven't been completed yet.
          </p>
          <div className="space-y-2">
            {overdue.tasks.slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{task.name}</span>
                <span className="text-xs text-red-500">{task.date}</span>
              </div>
            ))}
            {overdue.count > 3 && (
              <p className="text-xs text-red-500 text-center">
                +{overdue.count - 3} more overdue tasks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Study Tip */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-start space-x-4">
          <span className="text-3xl">💡</span>
          <div>
            <h3 className="font-semibold mb-1">Study Tip</h3>
            <p className="text-sm text-indigo-100">
              {getStudyTip(readinessScore.score, daysUntilExam, overdue.count)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Breakdown Bar Component
function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  subtext, 
  color 
}: { 
  icon: string
  label: string
  value: number
  subtext: string
  color: string
}) {
  const bgColors: Record<string, string> = {
    orange: 'bg-orange-50',
    yellow: 'bg-yellow-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50'
  }
  
  return (
    <div className={`${bgColors[color] || 'bg-gray-50'} rounded-xl p-4`}>
      <span className="text-2xl">{icon}</span>
      <div className="mt-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500 ml-1">{subtext}</span>
      </div>
      <p className="text-xs text-gray-600 mt-1">{label}</p>
    </div>
  )
}

// Priority Progress Component
function PriorityProgress({ 
  label, 
  completed, 
  total, 
  color 
}: { 
  label: string
  completed: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// Get contextual study tip
function getStudyTip(score: number, daysLeft: number, overdueCount: number): string {
  if (overdueCount > 3) {
    return "You have several overdue tasks. Consider using the 'Shift Schedule' feature to redistribute your workload more evenly."
  }
  
  if (score >= 85) {
    return "Excellent progress! Keep up the great work. Remember to take short breaks to maintain your focus and retention."
  }
  
  if (score >= 70) {
    return "You're doing well! Focus on completing your high-priority tasks first to maximize your exam readiness."
  }
  
  if (score >= 50 && daysLeft > 7) {
    return "You're on track. Try to maintain consistency by studying at the same time each day to build a strong routine."
  }
  
  if (score >= 50 && daysLeft <= 7) {
    return "The exam is approaching! Prioritize reviewing your high-priority topics and use flashcards for quick revision."
  }
  
  if (score < 50 && daysLeft > 3) {
    return "You might be falling behind. Consider activating Cram Mode to compress your remaining tasks into a more intensive schedule."
  }
  
  return "Focus on the most important topics. Even reviewing key concepts briefly is better than not studying at all!"
}
