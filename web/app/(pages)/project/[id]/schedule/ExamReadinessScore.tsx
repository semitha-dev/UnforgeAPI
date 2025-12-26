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
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-2xl p-8 h-48"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl h-24"></div>)}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-red-500">
        {error || 'No data available'}
      </div>
    )
  }

  const { readinessScore, progress, time, overdue, streak, daysUntilExam, priority, burnDown } = data

  // Get theme colors based on score
  const getThemeColors = (score: number) => {
    if (score >= 90) return { bg: 'bg-green-50', border: 'border-green-100', accent: '#22c55e', badge: 'bg-green-100 text-green-700' }
    if (score >= 75) return { bg: 'bg-blue-50', border: 'border-blue-100', accent: '#3b82f6', badge: 'bg-blue-100 text-blue-700' }
    if (score >= 50) return { bg: 'bg-amber-50', border: 'border-amber-100', accent: '#f59e0b', badge: 'bg-amber-100 text-amber-700' }
    if (score >= 25) return { bg: 'bg-orange-50', border: 'border-orange-100', accent: '#f97316', badge: 'bg-orange-100 text-orange-700' }
    return { bg: 'bg-red-50', border: 'border-red-100', accent: '#ef4444', badge: 'bg-red-100 text-red-700' }
  }

  const theme = getThemeColors(readinessScore.score)

  // Compact view for sidebar/dashboard
  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Exam Readiness</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{daysUntilExam} days left</span>
        </div>
        
        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={readinessScore.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(readinessScore.score / 100) * 264} 264`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-gray-900">{readinessScore.score}</span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
          </div>
        </div>
        
        <div className={`text-center text-sm font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 w-full justify-center ${theme.badge}`}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: readinessScore.color }}></span>
          {readinessScore.label}
        </div>
      </div>
    )
  }

  // Calculate burn-down chart path
  const burnDownPath = generateBurnDownPath(burnDown, progress.total)

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Performance Overview</h1>
          <p className="text-gray-500 mt-2">Track your study progress and exam readiness metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {daysUntilExam} days until exam ({new Date(data.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Main Readiness & Stats (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Main Readiness Card */}
          <div className={`relative overflow-hidden rounded-2xl ${theme.bg} p-8 border ${theme.border} shadow-sm flex flex-col md:flex-row items-center justify-between gap-8`}>
            <div className="flex flex-col gap-4 max-w-md z-10">
              <div className={`inline-flex items-center gap-2 self-start rounded-full ${theme.badge} px-3 py-1 text-xs font-bold uppercase tracking-wide`}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }}></span>
                {readinessScore.label}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{getMotivationalTitle(readinessScore.score)}</h2>
              <p className="text-gray-600">{getMotivationalDescription(readinessScore.score, priority.high)}</p>
              <button className="mt-2 w-fit text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2" style={{ backgroundColor: theme.accent }}>
                <span>Continue Studying</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Circular Progress */}
            <div className="relative w-40 md:w-48 h-40 md:h-48 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-gray-200" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={theme.accent} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(readinessScore.score / 100) * 264} 264`} />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-black text-gray-900">{readinessScore.score}</span>
                <span className="text-sm font-medium text-gray-400">/ 100</span>
              </div>
            </div>
            
            {/* Abstract bg pattern */}
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${theme.accent} 0%, transparent 70%)` }} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<FireIcon />} label="Current Streak" value={streak.current} unit="Days" />
            <StatCard icon={<CheckCircleIcon />} label="Completed" value={progress.completed} unit={`/${progress.total}`} />
            <StatCard icon={<TimerIcon />} label="Invested" value={Math.round(time.completedMinutes / 60 * 10) / 10} unit="hrs" />
            <StatCard icon={<TrophyIcon />} label="Best Streak" value={streak.longest} unit="Days" />
          </div>

          {/* Progress Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Progress Chart</h3>
                <p className="text-sm text-gray-500">Tasks completed vs. Ideal pace</p>
              </div>
              {burnDownPath.hasData && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-gray-600">Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                    <span className="text-gray-600">Ideal</span>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full h-64 relative">
              {burnDownPath.hasData ? (
                <>
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(y => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f3f4f6" strokeWidth="0.5" />
                    ))}
                    {/* Vertical grid lines */}
                    {[0, 25, 50, 75, 100].map(x => (
                      <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#f3f4f6" strokeWidth="0.5" />
                    ))}
                    {/* Ideal line - diagonal from top-left (0% done) to bottom-right (100% done) */}
                    <path d="M0,0 L100,100" fill="none" stroke="#d1d5db" strokeDasharray="4" strokeWidth="1.5" />
                    {/* Gradient fill under actual line */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {burnDownPath.fillPath && (
                      <path d={burnDownPath.fillPath} fill="url(#chartGradient)" stroke="none" />
                    )}
                    {/* Actual progress line */}
                    {burnDownPath.linePath && (
                      <path d={burnDownPath.linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                    {/* Current point indicator */}
                    {burnDownPath.currentPoint && (
                      <circle cx={burnDownPath.currentPoint.x} cy={burnDownPath.currentPoint.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
                    )}
                  </svg>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 -ml-10 flex flex-col justify-between text-xs text-gray-400 py-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-3 text-xs text-gray-400">
                    <span>Start</span>
                    <span>Today</span>
                    <span>Exam</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm font-medium">No progress data yet</p>
                  <p className="text-xs mt-1">Complete tasks to see your progress</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown & Tips (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Score Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Score Breakdown</h3>
              <p className="text-sm text-gray-500">Weighted factors contributing to your score</p>
            </div>
            <div className="flex flex-col gap-5">
              <BreakdownBar label="Completion" weight="30%" value={readinessScore.breakdown.completion} color="#6366f1" />
              <BreakdownBar label="High Priority" weight="25%" value={readinessScore.breakdown.highPriority} color="#ef4444" />
              <BreakdownBar label="Adherence" weight="20%" value={readinessScore.breakdown.adherence} color="#f59e0b" />
              <BreakdownBar label="Time Comfort" weight="15%" value={readinessScore.breakdown.timeComfort} color="#22c55e" />
              <BreakdownBar label="Consistency" weight="10%" value={readinessScore.breakdown.consistency} color="#a855f7" />
            </div>
          </div>

          {/* Priority Progress */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
            <h3 className="text-lg font-bold text-gray-900">Priority Focus</h3>
            <PriorityRow level="HIGH" completed={priority.high.completed} total={priority.high.total} color="red" label="Critical" />
            <PriorityRow level="MED" completed={priority.medium.completed} total={priority.medium.total} color="blue" label="Standard" />
            <PriorityRow level="LOW" completed={priority.low.completed} total={priority.low.total} color="gray" label="Optional" />
          </div>

          {/* Smart Tips Widget */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
            <div className="flex items-start gap-3 relative z-10">
              <span className="text-yellow-300 text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-lg mb-2">Smart Tip</h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  {getStudyTip(readinessScore.score, daysUntilExam, overdue.count, priority.high)}
                </p>
                {overdue.count > 0 && (
                  <span className="inline-flex items-center text-xs font-bold text-yellow-300 hover:text-yellow-200 tracking-wide uppercase cursor-pointer">
                    View Overdue Tasks
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overdue Warning */}
          {overdue.count > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">⚠️</span>
                <h3 className="text-base font-bold text-red-800">{overdue.count} Overdue Tasks</h3>
              </div>
              <div className="space-y-2">
                {overdue.tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg text-sm">
                    <span className="font-medium text-gray-700 truncate">{task.name}</span>
                    <span className="text-xs text-red-500 ml-2">{task.date}</span>
                  </div>
                ))}
                {overdue.count > 3 && <p className="text-xs text-red-500 text-center pt-1">+{overdue.count - 3} more</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Icons
function FireIcon() {
  return <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
}
function CheckCircleIcon() {
  return <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
}
function TimerIcon() {
  return <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
}
function TrophyIcon() {
  return <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-1a1 1 0 01-1-1v-.17A3.001 3.001 0 0114 10a3 3 0 11-5.83 1H7a1 1 0 01-1 1H4a2 2 0 110-4h1.17A3.001 3.001 0 015 6V5zm5 3a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: number; unit: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}<span className="text-base text-gray-400 font-normal ml-1">{unit}</span></p>
    </div>
  )
}

function BreakdownBar({ label, weight, value, color }: { label: string; weight: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-700">{label} ({weight})</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function PriorityRow({ level, completed, total, color, label }: { level: string; completed: number; total: number; color: string; label: string }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const colorMap: Record<string, { bg: string; icon: string; bar: string }> = {
    red: { bg: 'bg-red-50', icon: 'text-red-500', bar: 'bg-red-500' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', bar: 'bg-blue-500' },
    gray: { bg: 'bg-gray-50', icon: 'text-gray-400', bar: 'bg-gray-400' }
  }
  const colors = colorMap[color] || colorMap.gray
  const isHigh = level === 'HIGH'
  
  return (
    <div className="flex items-center gap-4">
      <div className={`flex flex-col items-center justify-center p-2.5 ${colors.bg} rounded-lg min-w-[60px] ${!isHigh ? 'opacity-80' : ''}`}>
        {level === 'HIGH' && <span className={`text-lg ${colors.icon}`}>⚡</span>}
        {level === 'MED' && <span className={`text-lg ${colors.icon}`}>—</span>}
        {level === 'LOW' && <span className={`text-lg ${colors.icon}`}>↓</span>}
        <span className={`text-[10px] font-bold ${colors.icon}`}>{level}</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs font-medium text-gray-500">
          <span>{completed}/{total} Tasks</span>
          <span>{label}</span>
        </div>
        <div className={`${isHigh ? 'h-3' : 'h-2'} w-full bg-gray-100 rounded-full overflow-hidden`}>
          <div className={`h-full ${colors.bar} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  )
}

function generateBurnDownPath(burnDown: ReadinessData['burnDown'], totalTasks: number): { linePath: string; fillPath: string; currentPoint: { x: number; y: number } | null; hasData: boolean } {
  if (!burnDown || burnDown.length === 0 || totalTasks === 0) {
    return { linePath: '', fillPath: '', currentPoint: null, hasData: false }
  }
  
  const points: { x: number; y: number }[] = []
  const validPoints = burnDown.filter(d => d.actual !== null)
  
  if (validPoints.length === 0) {
    return { linePath: '', fillPath: '', currentPoint: null, hasData: false }
  }
  
  const totalDataPoints = burnDown.length
  
  validPoints.forEach((d, i) => {
    // Find the index of this point in the full burnDown array for correct x positioning
    const fullIndex = burnDown.findIndex(b => b.date === d.date)
    const x = totalDataPoints > 1 ? (fullIndex / (totalDataPoints - 1)) * 100 : 50
    // y = percentage of tasks completed (0% at top, 100% at bottom)
    const y = (d.completed / totalTasks) * 100
    points.push({ x, y })
  })
  
  if (points.length === 0) {
    return { linePath: '', fillPath: '', currentPoint: null, hasData: false }
  }
  
  // For single point, just show a dot
  if (points.length === 1) {
    const p = points[0]
    return { 
      linePath: `M${p.x},${p.y}`, 
      fillPath: '', 
      currentPoint: p,
      hasData: true 
    }
  }
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const fillPath = `${linePath} L${lastPoint.x.toFixed(2)},100 L${firstPoint.x.toFixed(2)},100 Z`
  
  return { linePath, fillPath, currentPoint: lastPoint, hasData: true }
}

function getMotivationalTitle(score: number): string {
  if (score >= 90) return "Outstanding progress! You're exam-ready!"
  if (score >= 75) return "You're doing great! Keep pushing."
  if (score >= 50) return "Good momentum! Stay consistent."
  if (score >= 25) return "Time to pick up the pace!"
  return "Let's get started! Every step counts."
}

function getMotivationalDescription(score: number, highPriority: { total: number; completed: number }): string {
  const highPriorityRemaining = highPriority.total - highPriority.completed
  if (score >= 90) return "Your dedication is paying off! Focus on reviewing challenging topics and take time to rest before the exam."
  if (score >= 75) return `Your readiness score is calculated based on completion, consistency, and comprehension. ${highPriorityRemaining > 0 ? `You need just a bit more focus on ${highPriorityRemaining} High Priority tasks to reach the "Ready!" zone.` : 'Keep up the great work!'}`
  if (score >= 50) return `You're making progress! ${highPriorityRemaining > 0 ? `Focus on completing your ${highPriorityRemaining} remaining high-priority tasks first.` : 'Try to maintain your current study rhythm.'}`
  if (score >= 25) return `There's still time to improve! ${highPriorityRemaining > 0 ? `Prioritize the ${highPriorityRemaining} high-priority tasks that need attention.` : 'Start with the most important topics.'}`
  return "Don't worry, everyone starts somewhere. Create a study plan and tackle one task at a time. You've got this!"
}

function getStudyTip(score: number, daysLeft: number, overdueCount: number, highPriority: { total: number; completed: number }): string {
  const highPriorityPercentage = highPriority.total > 0 ? Math.round((highPriority.completed / highPriority.total) * 100) : 0
  if (overdueCount > 3) return `You have ${overdueCount} overdue tasks piling up. Use the 'Shift Schedule' feature in Actions to redistribute your workload.`
  if (highPriorityPercentage < 50 && highPriority.total > 0) return `You're falling behind on High Priority tasks (${highPriorityPercentage}% done). Try using the Pomodoro technique for 2 hours today to clear the backlog.`
  if (score >= 85) return "Excellent progress! Remember to take short breaks to maintain your focus and retention. You're almost there!"
  if (score >= 70) return "Great consistency! Focus on completing your remaining high-priority tasks to maximize your exam readiness."
  if (score >= 50 && daysLeft > 7) return "You're on track. Try studying at the same time each day to build a strong routine and boost retention."
  if (score >= 50 && daysLeft <= 7) return "The exam is approaching! Prioritize reviewing high-priority topics and use flashcards for quick revision."
  if (score < 50 && daysLeft > 3) return "Consider activating Cram Mode from Actions to compress your remaining tasks into a more intensive schedule."
  return "Focus on the most important topics first. Even brief review sessions are better than nothing. You can do this!"
}
