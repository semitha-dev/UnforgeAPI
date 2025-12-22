// app/(pages)/project/[id]/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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
  Layers,
  HelpCircle,
  AlertTriangle,
  Calendar,
  Award
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your learning progress and identify areas for improvement</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('project')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'project'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            This Project
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Projects
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-indigo-600" />}
          label="Average Score"
          value={`${overview.averageScore}%`}
          subtext={`${overview.totalCorrect}/${overview.totalQuestionsAnswered} correct`}
          color="indigo"
        />
        <StatCard
          icon={<Brain className="w-5 h-5 text-purple-600" />}
          label="Quizzes Created"
          value={overview.totalQuizzes.toString()}
          subtext={`${overview.totalQuizAttempts || 0} attempts`}
          color="purple"
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
          label="Questions Answered"
          value={overview.totalQuestionsAnswered.toString()}
          subtext={`from ${overview.totalQuizAttempts || 0} quiz attempts`}
          color="blue"
        />
        {viewMode === 'project' && timeTracking && (
          <StatCard
            icon={<Clock className="w-5 h-5 text-emerald-600" />}
            label="Time Spent"
            value={formatTime(timeTracking.totalSeconds)}
            subtext={`${timeTracking.totalSessions} sessions`}
            color="emerald"
          />
        )}
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-600" />}
          label="Current Streak"
          value={`${overview.currentStreak} days`}
          subtext={`${overview.activeDaysLast30} active days (30d)`}
          color="orange"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Task Completion"
          value={`${scheduleProgress.completionRate}%`}
          subtext={`${scheduleProgress.completedTasks}/${scheduleProgress.totalTasks} tasks`}
          color="green"
        />
      </div>

      {/* Personalized Study Tips */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Study Tips</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tip based on quiz performance */}
          {overview.averageScore < 60 && overview.totalQuestionsAnswered > 0 && (
            <div className="bg-white/80 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center space-x-2 text-amber-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium text-sm">Review More</span>
              </div>
              <p className="text-sm text-gray-600">Your average score is {overview.averageScore}%. Try reviewing your notes before taking quizzes.</p>
            </div>
          )}
          {overview.averageScore >= 80 && overview.totalQuestionsAnswered > 0 && (
            <div className="bg-white/80 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 text-green-600 mb-2">
                <Award className="w-4 h-4" />
                <span className="font-medium text-sm">Great Progress!</span>
              </div>
              <p className="text-sm text-gray-600">Your {overview.averageScore}% average is excellent! Challenge yourself with harder topics.</p>
            </div>
          )}
          
          {/* Tip based on streak */}
          {overview.currentStreak === 0 && (
            <div className="bg-white/80 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 text-orange-600 mb-2">
                <Flame className="w-4 h-4" />
                <span className="font-medium text-sm">Start a Streak</span>
              </div>
              <p className="text-sm text-gray-600">Complete a quiz or task today to start building your study streak!</p>
            </div>
          )}
          {overview.currentStreak >= 3 && (
            <div className="bg-white/80 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 text-orange-600 mb-2">
                <Flame className="w-4 h-4" />
                <span className="font-medium text-sm">{overview.currentStreak} Day Streak! 🔥</span>
              </div>
              <p className="text-sm text-gray-600">Amazing consistency! Keep it going to maximize retention.</p>
            </div>
          )}
          
          {/* Tip based on mistakes */}
          {subjectsNeedingImprovement.length > 0 && (
            <div className="bg-white/80 rounded-lg p-4 border border-red-200">
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium text-sm">Focus Areas</span>
              </div>
              <p className="text-sm text-gray-600">You have {subjectsNeedingImprovement.reduce((sum, s) => sum + s.pendingMistakes, 0)} mistakes to review. Practice makes perfect!</p>
            </div>
          )}
          
          {/* Tip if no activity */}
          {overview.totalQuizAttempts === 0 && (
            <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <HelpCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Take Your First Quiz</span>
              </div>
              <p className="text-sm text-gray-600">Create a quiz from your notes to test your understanding!</p>
            </div>
          )}
          
          {/* Default encouraging tip */}
          {overview.totalQuestionsAnswered > 0 && overview.averageScore >= 60 && overview.averageScore < 80 && (
            <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                <Target className="w-4 h-4" />
                <span className="font-medium text-sm">Almost There!</span>
              </div>
              <p className="text-sm text-gray-600">You're at {overview.averageScore}%. A bit more practice and you'll hit 80%+!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjects Needing Improvement */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Needs Improvement</h2>
          </div>
          
          {subjectsNeedingImprovement.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Great job! No subjects need immediate attention.</p>
              <p className="text-sm text-gray-500 mt-1">Keep up the good work!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectsNeedingImprovement.map((subject, index) => (
                <div 
                  key={subject.projectId}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          subject.pendingMistakes > 5 ? 'bg-red-500' :
                          subject.pendingMistakes > 2 ? 'bg-amber-500' : 'bg-yellow-500'
                        }`} />
                        <h3 className="font-medium text-gray-900">{subject.projectName}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {subject.pendingMistakes} mistakes to review
                      </p>
                      {subject.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {subject.topics.slice(0, 3).map((topic, i) => (
                            <span 
                              key={i}
                              className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded"
                            >
                              {topic.length > 30 ? topic.slice(0, 30) + '...' : topic}
                            </span>
                          ))}
                          {subject.topics.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{subject.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        subject.pendingMistakes > 5 ? 'text-red-600' :
                        subject.pendingMistakes > 2 ? 'text-amber-600' : 'text-yellow-600'
                      }`}>
                        {subject.totalMistakes}
                      </span>
                      <p className="text-xs text-gray-500">total mistakes</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Quizzes</h2>
          </div>
          
          {quizPerformance.recentQuizzes.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No quizzes taken yet</p>
              <p className="text-sm text-gray-500 mt-1">Complete a quiz to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizPerformance.recentQuizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{quiz.quizTitle}</p>
                    <p className="text-xs text-gray-500">{quiz.projectName} • {formatDate(quiz.date)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className={`text-lg font-bold ${
                        quiz.percentage >= 80 ? 'text-green-600' :
                        quiz.percentage >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {quiz.percentage}%
                      </span>
                      <p className="text-xs text-gray-500">{quiz.score}/{quiz.totalQuestions}</p>
                    </div>
                    {quiz.percentage >= 80 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : quiz.percentage >= 60 ? (
                      <TrendingUp className="w-5 h-5 text-amber-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Activity Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Weekly Activity</h2>
          </div>
          
          <div className="flex items-end justify-between h-40 px-2">
            {weeklyActivity.map((day, index) => {
              const maxActivity = Math.max(...weeklyActivity.map(d => d.quizzes + d.tasks), 1)
              const height = ((day.quizzes + day.tasks) / maxActivity) * 100
              const quizHeight = day.quizzes > 0 ? (day.quizzes / (day.quizzes + day.tasks)) * height : 0
              const taskHeight = day.tasks > 0 ? (day.tasks / (day.quizzes + day.tasks)) * height : 0
              
              return (
                <div key={day.date} className="flex flex-col items-center flex-1">
                  <div className="relative w-full max-w-[40px] h-32 flex flex-col justify-end">
                    {(day.quizzes + day.tasks) > 0 ? (
                      <div className="flex flex-col w-full">
                        <div 
                          className="bg-purple-500 rounded-t"
                          style={{ height: `${quizHeight}%`, minHeight: day.quizzes > 0 ? '4px' : '0' }}
                        />
                        <div 
                          className="bg-indigo-500 rounded-b"
                          style={{ height: `${taskHeight}%`, minHeight: day.tasks > 0 ? '4px' : '0' }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-1 bg-gray-200 rounded" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{getDayName(day.date)}</span>
                </div>
              )
            })}
          </div>
          
          <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span className="text-sm text-gray-600">Quizzes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-500 rounded" />
              <span className="text-sm text-gray-600">Tasks</span>
            </div>
          </div>
        </div>

        {/* Time Tracking Section - Only show for project view */}
        {viewMode === 'project' && timeTracking && timeTracking.totalSessions > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-900">Time Spent on Project</h2>
            </div>

            {/* Time Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-700 text-center">
                  {formatTime(timeTracking.totalSeconds)}
                </p>
                <p className="text-xs text-emerald-600 text-center mt-1">Total Time</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-700 text-center">
                  {timeTracking.totalSessions}
                </p>
                <p className="text-xs text-blue-600 text-center mt-1">Sessions</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-700 text-center">
                  {formatTime(timeTracking.avgSessionSeconds)}
                </p>
                <p className="text-xs text-purple-600 text-center mt-1">Avg Session</p>
              </div>
            </div>

            {/* Time by Page */}
            {timeTracking.pageStats.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Time by Activity</h3>
                <div className="space-y-2">
                  {timeTracking.pageStats
                    .sort((a, b) => b.totalSeconds - a.totalSeconds)
                    .slice(0, 5)
                    .map((stat, index) => {
                      const percentage = (stat.totalSeconds / timeTracking.totalSeconds) * 100
                      return (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{formatPageName(stat.page)}</span>
                            <span className="font-medium text-gray-900">{formatTime(stat.totalSeconds)}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Daily Activity Chart */}
            {timeTracking.dailyStats.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Time Spent (Last 7 Days)</h3>
                <div className="flex items-end justify-between h-32 px-2">
                  {timeTracking.dailyStats
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-7)
                    .map((stat, index) => {
                      const maxTime = Math.max(...timeTracking.dailyStats.map(s => s.totalSeconds), 1)
                      const height = (stat.totalSeconds / maxTime) * 100
                      
                      return (
                        <div key={stat.date} className="flex flex-col items-center flex-1">
                          <div className="relative w-full max-w-[40px] h-24 flex flex-col justify-end">
                            <div 
                              className="bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t w-full"
                              style={{ height: `${height}%`, minHeight: '4px' }}
                              title={`${formatTime(stat.totalSeconds)} (${stat.sessions} sessions)`}
                            />
                          </div>
                          <span className="text-xs text-gray-500 mt-2">
                            {new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(stat.totalSeconds)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedule & Flashcard Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Progress Breakdown</h2>
          </div>

          {/* Quiz Performance Stats */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quiz Performance</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-indigo-50 text-indigo-600 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold">{overview.totalQuizAttempts}</p>
                <p className="text-xs opacity-75">Quizzes Taken</p>
              </div>
              <div className="bg-green-50 text-green-600 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold">{overview.totalCorrect}</p>
                <p className="text-xs opacity-75">Correct</p>
              </div>
              <div className="bg-red-50 text-red-600 rounded-lg p-3 text-center">
                <div className="flex justify-center mb-1">
                  <XCircle className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold">{overview.totalWrong || 0}</p>
                <p className="text-xs opacity-75">Wrong</p>
              </div>
            </div>
            
            {/* Quiz accuracy bar */}
            {overview.totalQuestionsAnswered > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Accuracy</span>
                  <span className="font-medium text-gray-900">{overview.averageScore}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${overview.averageScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Schedule Tasks - only show if user has a schedule */}
          {(scheduleProgress.hasSchedule || scheduleProgress.totalTasks > 0) ? (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule Tasks</h3>
              <div className="grid grid-cols-5 gap-2">
                <TaskTypeCard icon={<BookOpen className="w-4 h-4" />} label="Lessons" count={scheduleProgress.tasksByType.lesson} color="blue" />
                <TaskTypeCard icon={<Layers className="w-4 h-4" />} label="Flashcards" count={scheduleProgress.tasksByType.flashcard} color="purple" />
                <TaskTypeCard icon={<HelpCircle className="w-4 h-4" />} label="Q&A" count={scheduleProgress.tasksByType.qa} color="indigo" />
                <TaskTypeCard icon={<CheckCircle2 className="w-4 h-4" />} label="Revision" count={scheduleProgress.tasksByType.revision} color="green" />
                <TaskTypeCard icon={<XCircle className="w-4 h-4" />} label="Mistakes" count={scheduleProgress.tasksByType.revise_mistake} color="red" />
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Completion</span>
                  <span className="font-medium text-gray-900">{scheduleProgress.completionRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${scheduleProgress.completionRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{scheduleProgress.completedTasks} completed</span>
                  <span>{scheduleProgress.pendingTasks} pending</span>
                  <span>{scheduleProgress.needWorkTasks} need work</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">No study schedule created yet</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Create a schedule to track lessons, flashcards, and revision tasks</p>
            </div>
          )}

          {/* Flashcard Progress */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Flashcard Progress</h3>
            {flashcardProgress.total === 0 ? (
              <p className="text-sm text-gray-500">No flashcards created yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <span className="text-sm text-purple-700">Total Sets</span>
                  <span className="font-medium text-purple-900">{flashcardProgress.sets}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg">
                  <span className="text-sm text-indigo-700">Total Cards</span>
                  <span className="font-medium text-indigo-900">{flashcardProgress.total}</span>
                </div>
              </div>
            )}
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
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  color: string
}) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50'
  }
  
  return (
    <div className={`${bgColors[color] || 'bg-gray-50'} rounded-xl p-4`}>
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtext}</p>
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
