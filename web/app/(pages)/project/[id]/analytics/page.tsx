// app/(pages)/project/[id]/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loading } from '@/components/ui/loading'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Brain,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Lightbulb,
  FileText,
  Calendar,
  Award,
  ArrowRight,
  ChevronRight,
  Timer,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalQuizzes: number
    totalQuizAttempts: number
    averageScore: number
    totalQuestionsAnswered: number
    totalCorrect: number
    totalWrong: number
    currentStreak: number
    activeDaysLast30: number
  }
  quizPerformance: {
    recentQuizzes: Array<{
      id: string
      quizTitle: string
      projectName: string
      score: number
      totalQuestions: number
      percentage: number
      date: string
    }>
    totalAttempts: number
    totalCorrect: number
    totalWrong: number
  }
  subjectsNeedingImprovement: Array<{
    projectId: string
    projectName: string
    totalMistakes: number
    pendingMistakes: number
    topics: string[]
  }>
  scheduleProgress: {
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    needWorkTasks: number
    completionRate: number
    tasksByType: {
      lesson: number
      flashcard: number
      qa: number
      revision: number
      revise_mistake: number
    }
    hasSchedule: boolean
  }
  flashcardProgress: {
    total: number
    sets: number
    mastered: number
    learning: number
    new: number
  }
  weeklyActivity: Array<{
    date: string
    quizzes: number
    tasks: number
  }>
}

interface TimeTrackingData {
  totalSessions: number
  totalSeconds: number
  avgSessionSeconds: number
  dailyStats: Array<{
    date: string
    totalSeconds: number
    sessions: number
  }>
  pageStats: Array<{
    page: string
    totalSeconds: number
    sessions: number
  }>
  recentSessions: Array<{
    id: string
    session_start: string
    session_end: string | null
    duration_seconds: number | null
    page_path: string | null
  }>
}

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeTracking, setTimeTracking] = useState<TimeTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'project' | 'all'>('project')

  useEffect(() => {
    loadAnalytics()
    if (viewMode === 'project') {
      loadTimeTracking()
    }
  }, [projectId, viewMode])

  const loadTimeTracking = async () => {
    try {
      const response = await fetch(`/api/project-time?projectId=${projectId}&days=30`)
      if (response.ok) {
        const data = await response.json()
        setTimeTracking(data)
      }
    } catch (err: any) {
      console.error('Failed to load time tracking:', err)
    }
  }

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const url = viewMode === 'project' 
        ? `/api/analytics?projectId=${projectId}`
        : '/api/analytics'
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load analytics')
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getDayName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const formatPageName = (path: string | null) => {
    if (!path) return 'Overview'
    const parts = path.split('/')
    const lastPart = parts[parts.length - 1] || parts[parts.length - 2]
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
  }

  if (loading) {
    return <Loading message="Loading analytics..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const { overview, quizPerformance, subjectsNeedingImprovement, scheduleProgress, flashcardProgress, weeklyActivity } = analytics

  // Generate study tip based on performance
  const getStudyTip = () => {
    if (overview.currentStreak >= 3) {
      return { icon: '🔥', title: 'Amazing Streak!', message: `You're on a ${overview.currentStreak}-day streak. Keep pushing forward!` }
    }
    if (overview.averageScore >= 80 && overview.totalQuestionsAnswered > 0) {
      return { icon: '🌟', title: 'Great Progress!', message: `Your ${overview.averageScore}% average is excellent! Keep it up!` }
    }
    if (overview.averageScore < 60 && overview.totalQuestionsAnswered > 0) {
      return { icon: '📚', title: 'Keep Learning!', message: 'Review your notes before quizzes to boost your score.' }
    }
    if (subjectsNeedingImprovement.length > 0) {
      return { icon: '🎯', title: 'Focus Areas', message: `You have ${subjectsNeedingImprovement.reduce((sum, s) => sum + s.pendingMistakes, 0)} mistakes to review. Practice makes perfect!` }
    }
    return { icon: '💡', title: 'Study Tip', message: 'Consistent daily practice leads to better retention!' }
  }

  const studyTip = getStudyTip()

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 py-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-gray-900">
            Analytics
          </h1>
          <p className="text-sm md:text-base font-normal text-gray-500">
            Track your learning progress and identify areas for improvement
          </p>
        </div>
        <div className="flex h-12 w-fit items-center rounded-xl bg-white border border-gray-200 p-1 shadow-sm">
          <button
            onClick={() => setViewMode('project')}
            className={`h-full px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              viewMode === 'project'
                ? 'bg-blue-50 text-sky-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            This Project
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`h-full px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              viewMode === 'all'
                ? 'bg-blue-50 text-sky-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Projects
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Avg Score"
          value={`${overview.averageScore}%`}
          subtext={overview.totalCorrect > 0 ? `${overview.totalCorrect}/${overview.totalQuestionsAnswered} correct` : 'No data yet'}
          trend={overview.averageScore >= 70 ? 'up' : undefined}
          color="blue"
        />
        <StatCard
          icon={<Brain className="w-5 h-5" />}
          label="Quizzes"
          value={overview.totalQuizzes.toString()}
          subtext={`${overview.totalQuizAttempts || 0} attempts`}
          color="purple"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Answered"
          value={overview.totalQuestionsAnswered.toString()}
          subtext={overview.totalQuestionsAnswered > 0 ? 'Questions total' : 'No questions yet'}
          trend={overview.totalQuestionsAnswered > 10 ? 'up' : undefined}
          color="green"
        />
        {viewMode === 'project' && timeTracking ? (
          <StatCard
            icon={<Timer className="w-5 h-5" />}
            label="Time"
            value={formatTime(timeTracking.totalSeconds)}
            subtext={`${timeTracking.totalSessions} sessions`}
            color="orange"
          />
        ) : (
          <StatCard
            icon={<Timer className="w-5 h-5" />}
            label="Time"
            value="--"
            subtext="Select project"
            color="orange"
          />
        )}
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Streak"
          value={`${overview.currentStreak} Days`}
          subtext={overview.currentStreak > 0 ? 'Keep it up!' : 'Start today!'}
          trend={overview.currentStreak >= 3 ? 'streak' : undefined}
          color="red"
        />
        <StatCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Tasks"
          value={`${scheduleProgress.completionRate}%`}
          subtext={`${scheduleProgress.pendingTasks} pending`}
          color="teal"
        />
      </div>

      {/* Study Tip Banner */}
      <div className="relative w-full overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 p-6 md:p-8 shadow-xl mb-8">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 mix-blend-overlay blur-3xl"></div>
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm shadow-inner border border-white/20">
              <Lightbulb className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">{studyTip.title}</h3>
              <p className="text-sm md:text-base font-medium text-white/90">{studyTip.message}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Needs Improvement */}
          <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 p-5 bg-gray-50/50">
              <h3 className="text-lg md:text-xl font-bold leading-tight text-gray-900">Needs Improvement</h3>
            </div>
            <div className="flex flex-col p-5 gap-4">
              {subjectsNeedingImprovement.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="w-12 h-12 text-green-500 mb-3" />
                  <p className="font-semibold text-gray-900">Great job!</p>
                  <p className="text-sm text-gray-500">No subjects need immediate attention.</p>
                </div>
              ) : (
                subjectsNeedingImprovement.slice(0, 3).map((subject) => (
                  <div
                    key={subject.projectId}
                    className="flex items-start justify-between rounded-xl bg-gray-50 border border-gray-100 p-4 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-gray-900 text-base md:text-lg">{subject.projectName}</p>
                      <div className="flex flex-wrap gap-2">
                        {subject.topics.slice(0, 2).map((topic, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm"
                          >
                            #{topic.length > 15 ? topic.slice(0, 15) + '...' : topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                        subject.pendingMistakes > 5 ? 'bg-red-100 border-red-200 text-red-500' :
                        subject.pendingMistakes > 2 ? 'bg-orange-100 border-orange-200 text-orange-500' :
                        'bg-yellow-100 border-yellow-200 text-yellow-600'
                      }`}>
                        {subject.pendingMistakes} Mistakes
                      </span>
                      <button 
                        onClick={() => router.push(`/project/${subject.projectId}/mistakes`)}
                        className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 ${
                          subject.pendingMistakes > 5 ? 'bg-red-500 shadow-red-500/20 hover:bg-red-600' :
                          subject.pendingMistakes > 2 ? 'bg-orange-500 shadow-orange-500/20 hover:bg-orange-600' :
                          'bg-yellow-500 shadow-yellow-500/20 hover:bg-yellow-600'
                        }`}
                      >
                        Review <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weekly Activity */}
          <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold leading-tight text-gray-900">Weekly Activity</h3>
              <div className="flex gap-4 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-200"></div>
                  <span className="text-xs font-medium text-gray-500">Quizzes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300 shadow-sm"></div>
                  <span className="text-xs font-medium text-gray-500">Tasks</span>
                </div>
              </div>
            </div>
            <div className="flex h-48 md:h-56 w-full items-end justify-between gap-2 md:gap-4 px-2">
              {weeklyActivity.map((day) => {
                // Find max total activity across all days for scaling
                const maxActivity = Math.max(...weeklyActivity.map(d => d.quizzes + d.tasks), 1)
                const totalActivity = day.quizzes + day.tasks
                
                // Calculate height as percentage of max (total bar height)
                const totalHeightPercent = maxActivity > 0 ? (totalActivity / maxActivity) * 100 : 0
                
                // Calculate proportions within the stacked bar
                const quizProportion = totalActivity > 0 ? (day.quizzes / totalActivity) * 100 : 0
                const taskProportion = totalActivity > 0 ? (day.tasks / totalActivity) * 100 : 0
                
                const hasActivity = totalActivity > 0
                const hasOnlyQuizzes = day.quizzes > 0 && day.tasks === 0
                const hasOnlyTasks = day.tasks > 0 && day.quizzes === 0
                const hasBoth = day.quizzes > 0 && day.tasks > 0
                
                return (
                  <div key={day.date} className="group flex h-full w-full flex-col justify-end gap-2 cursor-pointer">
                    <div className="relative flex w-full flex-col items-center h-full justify-end">
                      {hasActivity ? (
                        <div 
                          className="flex flex-col w-full max-w-[28px] overflow-hidden"
                          style={{ height: `${Math.max(totalHeightPercent, 8)}%` }}
                        >
                          {/* Quiz bar (top - blue) */}
                          {day.quizzes > 0 && (
                            <div 
                              className={`w-full bg-sky-500 shadow-[0_4px_10px_-2px_rgba(14,165,233,0.3)] group-hover:bg-sky-600 transition-colors duration-300 ${
                                hasOnlyQuizzes ? 'rounded-md' : hasBoth ? 'rounded-t-md' : ''
                              }`}
                              style={{ height: `${quizProportion}%`, minHeight: '4px' }}
                            />
                          )}
                          {/* Task bar (bottom - slate) */}
                          {day.tasks > 0 && (
                            <div 
                              className={`w-full bg-slate-300 group-hover:bg-slate-400 transition-colors duration-300 ${
                                hasOnlyTasks ? 'rounded-md' : hasBoth ? 'rounded-b-md' : ''
                              }`}
                              style={{ height: `${taskProportion}%`, minHeight: '4px' }}
                            />
                          )}
                        </div>
                      ) : (
                        /* Empty state - small gray indicator */
                        <div className="w-full max-w-[28px] h-1 bg-gray-200 rounded-full" />
                      )}
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none shadow-lg whitespace-nowrap z-10">
                        {getDayName(day.date)}: {day.quizzes} quiz{day.quizzes !== 1 ? 'zes' : ''}, {day.tasks} task{day.tasks !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span className="text-center text-xs font-medium text-gray-500 group-hover:text-sky-500 transition-colors">
                      {getDayName(day.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Recent Quizzes */}
          <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 p-5 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg md:text-xl font-bold leading-tight text-gray-900">Recent Quizzes</h3>
              <button 
                onClick={() => router.push(`/project/${projectId}/quiz`)}
                className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="flex flex-col">
              {quizPerformance.recentQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-900">No quizzes yet</p>
                  <p className="text-sm text-gray-500">Complete a quiz to see your results here</p>
                </div>
              ) : (
                quizPerformance.recentQuizzes.slice(0, 3).map((quiz, index) => (
                  <div
                    key={quiz.id}
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
                      index < quizPerformance.recentQuizzes.slice(0, 3).length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        quiz.percentage >= 80 ? 'bg-green-100 text-green-600 group-hover:bg-green-200' :
                        quiz.percentage >= 60 ? 'bg-orange-100 text-orange-500 group-hover:bg-orange-200' :
                        'bg-red-100 text-red-500 group-hover:bg-red-200'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-sky-600 transition-colors">
                          {quiz.quizTitle}
                        </p>
                        <p className="text-xs text-gray-500">{quiz.projectName} • {formatDate(quiz.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold ${
                        quiz.percentage >= 80 ? 'text-green-500' :
                        quiz.percentage >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {quiz.percentage}%
                      </p>
                      {quiz.percentage >= 60 ? (
                        <TrendingUp className={`w-4 h-4 ${quiz.percentage >= 80 ? 'text-green-500' : 'text-yellow-500'}`} />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Time Breakdown - Only show for project view with time tracking data */}
          {viewMode === 'project' && timeTracking && timeTracking.totalSessions > 0 && (
            <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 p-6 gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold leading-tight text-gray-900">Time Breakdown</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-[11px] font-medium uppercase text-gray-500 tracking-wide">Total Time</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{formatTime(timeTracking.totalSeconds)}</p>
                </div>
                <div className="flex flex-col gap-1 border-l border-gray-200 pl-4 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-[11px] font-medium uppercase text-gray-500 tracking-wide">Sessions</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{timeTracking.totalSessions}</p>
                </div>
                <div className="flex flex-col gap-1 border-l border-gray-200 pl-4 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <p className="text-[11px] font-medium uppercase text-gray-500 tracking-wide">Avg Session</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{formatTime(timeTracking.avgSessionSeconds)}</p>
                </div>
              </div>
              
              {/* Time by Activity */}
              {timeTracking.pageStats.length > 0 && (
                <div className="flex flex-col gap-4">
                  {timeTracking.pageStats
                    .sort((a, b) => b.totalSeconds - a.totalSeconds)
                    .slice(0, 3)
                    .map((stat, index) => {
                      const percentage = Math.round((stat.totalSeconds / timeTracking.totalSeconds) * 100)
                      const colors = ['bg-sky-500', 'bg-violet-500', 'bg-teal-500']
                      return (
                        <div key={index} className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">{formatPageName(stat.page)}</span>
                            <span className="text-gray-900 font-semibold">{percentage}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div 
                              className={`h-full ${colors[index % colors.length]} rounded-full`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Daily Trend */}
              {timeTracking.dailyStats.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Daily Trend (Last 7 Days)</p>
                  <div className="flex h-16 items-end gap-1.5 pt-2 border-t border-dashed border-gray-200">
                    {timeTracking.dailyStats
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(-7)
                      .map((stat, index, arr) => {
                        const maxTime = Math.max(...arr.map(s => s.totalSeconds), 1)
                        const height = (stat.totalSeconds / maxTime) * 100
                        const isLast = index === arr.length - 1
                        return (
                          <div
                            key={stat.date}
                            className={`flex-1 rounded-sm transition-colors ${
                              isLast ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-gray-200 hover:bg-sky-400/70'
                            }`}
                            style={{ height: `${Math.max(height, 10)}%` }}
                            title={`${formatTime(stat.totalSeconds)}`}
                          />
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quiz Performance & Scheduled Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quiz Performance */}
            <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
                <p className="text-sm md:text-base font-bold text-gray-900">Quiz Performance</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>Accuracy</span>
                  <span className="text-gray-900 font-semibold">{overview.averageScore}%</span>
                </div>
                <div className="flex h-3 w-full rounded-full bg-gray-100 overflow-hidden mb-3">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${overview.averageScore}%` }}
                  />
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${100 - overview.averageScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-gray-500 font-medium">{overview.totalCorrect} Correct</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                    <span className="text-gray-500 font-medium">{overview.totalWrong || 0} Wrong</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Tasks */}
            <div className="flex flex-col rounded-xl bg-white shadow-lg border border-gray-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm md:text-base font-bold text-gray-900">Scheduled Tasks</p>
              </div>
              <div className="flex flex-col gap-3 justify-center h-full pb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">{scheduleProgress.pendingTasks} Tasks Remaining</span>
                  <span className="text-sm font-bold text-gray-900">{scheduleProgress.completedTasks}/{scheduleProgress.totalTasks} Done</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${scheduleProgress.completionRate}%` }}
                  />
                </div>
                <button 
                  onClick={() => router.push(`/project/${projectId}/schedule`)}
                  className="flex items-center justify-center gap-1 rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 hover:scale-105 active:scale-95 mt-2"
                >
                  View Tasks <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  subtext, 
  color,
  trend
}: { 
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  color: string
  trend?: 'up' | 'down' | 'streak'
}) {
  const colorConfig: Record<string, { bg: string, iconBg: string, iconBorder: string, text: string }> = {
    blue: { bg: 'bg-white', iconBg: 'bg-blue-100', iconBorder: 'border-blue-200', text: 'text-sky-500' },
    purple: { bg: 'bg-white', iconBg: 'bg-purple-100', iconBorder: 'border-purple-200', text: 'text-violet-500' },
    green: { bg: 'bg-white', iconBg: 'bg-green-100', iconBorder: 'border-green-200', text: 'text-green-500' },
    orange: { bg: 'bg-white', iconBg: 'bg-orange-100', iconBorder: 'border-orange-200', text: 'text-orange-500' },
    red: { bg: 'bg-white', iconBg: 'bg-red-100', iconBorder: 'border-red-200', text: 'text-red-500' },
    teal: { bg: 'bg-white', iconBg: 'bg-teal-100', iconBorder: 'border-teal-200', text: 'text-teal-600' },
  }
  
  const config = colorConfig[color] || colorConfig.blue
  
  return (
    <div className={`flex flex-col gap-3 rounded-xl ${config.bg} p-4 md:p-5 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}>
      <div className="flex items-center gap-2 md:gap-3">
        <div className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full ${config.iconBg} ${config.text} border ${config.iconBorder}`}>
          {icon}
        </div>
        <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl md:text-4xl font-extrabold tracking-tight ${config.text}`}>{value}</p>
      <div className={`flex items-center gap-1 mt-1 text-xs md:text-sm font-medium ${
        trend === 'up' ? 'text-green-600' : 
        trend === 'streak' ? 'text-red-500' : 
        'text-gray-500'
      }`}>
        {trend === 'up' && <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />}
        {trend === 'streak' && <Flame className="w-3 h-3 md:w-4 md:h-4" />}
        <span>{subtext}</span>
      </div>
    </div>
  )
}

function TaskTypeCard({ 
  icon, 
  label, 
  count, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  count: number
  color: string
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50'
  }
  
  return (
    <div className={`${colors[color]} rounded-lg p-2 text-center`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  )
}

// Keep ProgressRow for potential future use
function ProgressRow({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    gray: 'bg-gray-400'
  }
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900">{count} ({percentage}%)</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
