'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Brain, 
  Clock, 
  TrendingDown, 
  TrendingUp,
  BookOpen,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  RefreshCw,
  Lightbulb,
  Target,
  Zap,
  Calendar,
  Download,
  Award,
  Play,
  ArrowRight,
  ChevronRight,
  BarChart3
} from 'lucide-react'

interface InsightMetadata {
  // Knowledge Heatmap
  masteredTopics?: string[]
  strugglingTopics?: string[]
  improvingTopics?: string[]
  topicStats?: Array<{ topic: string; accuracy: number; attempts: number }>
  
  // Biological Rhythm
  bestHours?: number[]
  worstHours?: number[]
  averageAccuracyByHour?: Record<number, number>
  recommendedStudyTime?: string
  dailyAverage?: string
  weeklyChange?: number
  peakFocusTime?: string
  weeklyData?: number[]
  
  // Forgetting Curve / Retention
  dueForReview?: string[]
  urgentReview?: string[]
  retentionRates?: Record<string, number>
  nextReviewDates?: Record<string, string>
  overallRetention?: number
  topRetainedTopics?: Array<{ topic: string; retention: string; lastReview: string }>
  
  // Content Gap
  suggestions?: string[]
  relatedTopics?: string[]
  confidence?: number
  missingTopics?: Array<{ topic: string; reason: string }>
  projectName?: string
  existingNotes?: string[]
  
  // Factual Accuracy
  noteId?: string
  noteTitle?: string
  errors?: Array<{ claim: string; correction: string; severity: string }>
  
  // Common
  totalCards?: number
  reviewedCards?: number
  accuracy?: number
  engagementPeak?: string
  [key: string]: unknown
}

interface Insight {
  id: string
  insight_type: string
  category: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  metadata: InsightMetadata
  is_actionable: boolean
  action_type?: string
  action_data?: Record<string, unknown>
  is_dismissed: boolean
  created_at: string
  related_project_id?: string
}

interface InsightsResponse {
  insights: {
    [date: string]: Insight[]
  }
}

interface StudySession {
  studied_at: string
  is_correct: boolean
  flashcard_set_id: string
}

// Generate heatmap data from actual study sessions - Atlas Intelligence Algorithm
const generateHeatmapFromStudySessions = (
  studySessions: StudySession[],
  days: number = 30
): { level: number; tooltip: string; date: string; sessions: number; accuracy: number }[] => {
  const cells: { level: number; tooltip: string; date: string; sessions: number; accuracy: number }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Create a map of date -> sessions
  const sessionsByDate = new Map<string, { total: number; correct: number }>()
  
  studySessions.forEach(session => {
    const date = new Date(session.studied_at).toISOString().split('T')[0]
    const existing = sessionsByDate.get(date) || { total: 0, correct: 0 }
    existing.total++
    if (session.is_correct) existing.correct++
    sessionsByDate.set(date, existing)
  })
  
  // Find max sessions for normalization
  let maxSessions = 0
  sessionsByDate.forEach(data => {
    if (data.total > maxSessions) maxSessions = data.total
  })
  
  // Generate cells for each day (going back 'days' days)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const data = sessionsByDate.get(dateStr) || { total: 0, correct: 0 }
    const sessions = data.total
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    
    // Calculate level (0-4) based on activity
    let level = 0
    if (maxSessions > 0 && sessions > 0) {
      const normalized = sessions / maxSessions
      if (normalized > 0.75) level = 4
      else if (normalized > 0.5) level = 3
      else if (normalized > 0.25) level = 2
      else level = 1
    }
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const tooltip = sessions > 0 
      ? `${dayName}: ${sessions} sessions, ${accuracy}% accuracy`
      : `${dayName}: No activity`
    
    cells.push({ level, tooltip, date: dateStr, sessions, accuracy })
  }
  
  return cells
}

// Get heatmap cell color
const getHeatmapColor = (level: number) => {
  const colors = [
    'bg-slate-100 border border-slate-200',
    'bg-blue-200',
    'bg-blue-400',
    'bg-blue-600',
    'bg-blue-800'
  ]
  return colors[level] || colors[0]
}

export default function ProjectInsightsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string
  const supabase = createClient()
  
  const [insights, setInsights] = useState<InsightsResponse['insights']>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false)
  const [project, setProject] = useState<{ name: string; color: string } | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [heatmapData, setHeatmapData] = useState<{ level: number; tooltip: string; date: string; sessions: number; accuracy: number }[]>([])
  const [studyStats, setStudyStats] = useState<{ totalSessions: number; avgAccuracy: number; activeDays: number; streak: number }>({ totalSessions: 0, avgAccuracy: 0, activeDays: 0, streak: 0 })
  const [heatmapDays, setHeatmapDays] = useState<number>(30)

  const loadProjectAndInsights = async () => {
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name, color')
        .eq('id', projectId)
        .single()
      
      if (projectData) {
        setProject(projectData)
      }

      // Fetch real study sessions for this project (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: studySessions } = await supabase
        .from('flashcard_study_sessions')
        .select('studied_at, is_correct, flashcard_set_id')
        .eq('project_id', projectId)
        .gte('studied_at', thirtyDaysAgo.toISOString())
        .order('studied_at', { ascending: true })
      
      // Generate heatmap from real study data - Atlas Intelligence Algorithm
      const heatmap = generateHeatmapFromStudySessions(studySessions || [], 30)
      setHeatmapData(heatmap)
      
      // Calculate study stats
      const totalSessions = studySessions?.length || 0
      const correctSessions = studySessions?.filter(s => s.is_correct).length || 0
      const avgAccuracy = totalSessions > 0 ? Math.round((correctSessions / totalSessions) * 100) : 0
      const activeDays = heatmap.filter(d => d.sessions > 0).length
      
      // Calculate streak (consecutive days from today going back)
      let streak = 0
      const today = new Date().toISOString().split('T')[0]
      for (let i = heatmap.length - 1; i >= 0; i--) {
        if (heatmap[i].sessions > 0 || heatmap[i].date === today) {
          if (heatmap[i].sessions > 0) streak++
          else if (i === heatmap.length - 1) continue // Skip today if no activity yet
        } else {
          break
        }
      }
      
      setStudyStats({ totalSessions, avgAccuracy, activeDays, streak })

      const response = await fetch(`/api/insights?projectId=${projectId}&days=7`)
      if (response.ok) {
        const data: InsightsResponse = await response.json()
        setInsights(data.insights || {})
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadProjectAndInsights()
    }
  }, [projectId])

  // Reload heatmap when days filter changes
  const loadHeatmapData = async (days: number) => {
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - days)
      
      const { data: studySessions } = await supabase
        .from('flashcard_study_sessions')
        .select('studied_at, is_correct, flashcard_set_id')
        .eq('project_id', projectId)
        .gte('studied_at', daysAgo.toISOString())
        .order('studied_at', { ascending: true })
      
      const heatmap = generateHeatmapFromStudySessions(studySessions || [], days)
      setHeatmapData(heatmap)
      
      // Recalculate stats for filtered period
      const totalSessions = studySessions?.length || 0
      const correctSessions = studySessions?.filter(s => s.is_correct).length || 0
      const avgAccuracy = totalSessions > 0 ? Math.round((correctSessions / totalSessions) * 100) : 0
      const activeDays = heatmap.filter(d => d.sessions > 0).length
      
      let streak = 0
      const today = new Date().toISOString().split('T')[0]
      for (let i = heatmap.length - 1; i >= 0; i--) {
        if (heatmap[i].sessions > 0 || heatmap[i].date === today) {
          if (heatmap[i].sessions > 0) streak++
          else if (i === heatmap.length - 1) continue
        } else {
          break
        }
      }
      
      setStudyStats({ totalSessions, avgAccuracy, activeDays, streak })
    } catch (error) {
      console.error('Failed to load heatmap data:', error)
    }
  }

  const handleHeatmapDaysChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value)
    setHeatmapDays(days)
    loadHeatmapData(days)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: true })
      })
      
      if (response.ok) {
        await loadProjectAndInsights()
      }
    } catch (error) {
      console.error('Failed to refresh insights:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleGenerateAISummary = async () => {
    setIsGeneratingAISummary(true)
    try {
      // Call the AI to generate a summary of learning gaps
      const allInsights = Object.values(insights).flat().filter(i => !i.is_dismissed)
      const contentGapInsight = allInsights.find(i => i.insight_type === 'content_gap')
      
      const response = await fetch('/api/leafai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          userMessage: `Based on my learning progress, analyze my content gaps and provide actionable recommendations. Focus on: ${contentGapInsight?.metadata?.missingTopics?.map(t => t.topic).join(', ') || contentGapInsight?.metadata?.suggestions?.join(', ') || 'general improvement areas'}`,
          mode: 'light',
          isGlobal: true
        })
      })
      
      if (response.ok) {
        await loadProjectAndInsights()
      }
    } catch (error) {
      console.error('Failed to generate AI summary:', error)
    } finally {
      setIsGeneratingAISummary(false)
    }
  }

  const handleDismiss = async (insightId: string) => {
    try {
      const response = await fetch('/api/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, action: 'dismiss' })
      })
      
      if (response.ok) {
        setInsights(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(date => {
            updated[date] = updated[date].map(insight => 
              insight.id === insightId ? { ...insight, is_dismissed: true } : insight
            )
          })
          return updated
        })
        setSelectedInsight(null)
      }
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Get insights by type
  const allInsights = Object.values(insights).flat().filter(i => !i.is_dismissed)
  const knowledgeHeatmapInsight = allInsights.find(i => i.insight_type === 'knowledge_heatmap')
  const studyRhythmInsight = allInsights.find(i => i.insight_type === 'biological_rhythm')
  const retentionInsight = allInsights.find(i => i.insight_type === 'forgetting_curve')
  const contentGapInsight = allInsights.find(i => i.insight_type === 'content_gap')
  const factualAccuracyInsight = allInsights.find(i => i.insight_type === 'factual_accuracy')

  // Check if we have real Atlas Intelligence data
  const hasAtlasData = allInsights.length > 0

  // Weekly data for study rhythm chart - use real data or show empty state
  const weeklyData = studyRhythmInsight?.metadata?.weeklyData || []
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxValue = weeklyData.length > 0 ? Math.max(...weeklyData) : 100

  // Retention data - use real data or show empty state
  const overallRetention = retentionInsight?.metadata?.overallRetention || 
    (retentionInsight?.metadata?.accuracy ? Math.round(retentionInsight.metadata.accuracy * 100) : null)
  
  const topRetainedTopics = retentionInsight?.metadata?.topRetainedTopics || 
    retentionInsight?.metadata?.dueForReview?.slice(0, 2).map((topic, i) => ({
      topic,
      retention: i === 0 ? 'High' : 'Med',
      lastReview: `${(i + 1) * 2}d ago`
    })) || []

  // Content gap / missing topics - use real data from API
  const missingTopics = contentGapInsight?.metadata?.missingTopics || []

  // Factual accuracy errors - use real data from API
  const factualErrors = factualAccuracyInsight?.metadata?.errors || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500">Loading insights...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-slate-600 -m-6 p-6 min-h-[calc(100vh-4rem)]"
      style={{
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.08) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.05) 0px, transparent 50%)
        `
      }}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(new Date().toISOString())}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Insights</h1>
            <p className="text-slate-500 mt-1">
              AI-driven analysis of your learning progress in {project?.name || 'this project'}.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition-colors flex items-center gap-2 bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Knowledge Heatmap - Spans 2 columns */}
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-6 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Knowledge Heatmap</h2>
              </div>
              <select 
                value={heatmapDays}
                onChange={handleHeatmapDaysChange}
                className="bg-white border border-slate-200 rounded-lg text-xs text-slate-600 px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
              >
                <option value={30}>Last 30 Days</option>
                <option value={7}>Last 7 Days</option>
              </select>
            </div>
            
            {/* Heatmap Legend */}
            <div className="flex gap-1 mb-2 text-xs text-slate-500 justify-end">
              <span>Less</span>
              <div className="flex gap-1 mx-1">
                <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-200"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
                <div className="w-3 h-3 rounded-sm bg-blue-800"></div>
              </div>
              <span>More</span>
            </div>
            
            {/* Heatmap Grid */}
            <div className="grid grid-cols-12 gap-1.5 h-40">
              {heatmapData.length > 0 ? heatmapData.map((cell, i) => (
                <div 
                  key={i}
                  className={`h-full rounded-sm ${getHeatmapColor(cell.level)} transition-all hover:scale-110 hover:z-10 hover:shadow-md cursor-pointer group relative`}
                  title={cell.tooltip}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                    {cell.date}: {cell.sessions} sessions {cell.sessions > 0 && `(${cell.accuracy}% accuracy)`}
                  </div>
                </div>
              )) : (
                <div className="col-span-12 flex items-center justify-center text-slate-400 text-sm">
                  No study sessions in the last 30 days. Start reviewing flashcards to build your heatmap!
                </div>
              )}
            </div>
            
            {/* Stats Row */}
            <div className="mt-4 grid grid-cols-4 gap-3 text-center border-t border-slate-100 pt-4">
              <div>
                <p className="text-xl font-bold text-slate-900">{studyStats.totalSessions}</p>
                <p className="text-xs text-slate-500">Total Sessions</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{studyStats.avgAccuracy}%</p>
                <p className="text-xs text-slate-500">Avg Accuracy</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{studyStats.activeDays}</p>
                <p className="text-xs text-slate-500">Active Days</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-600">{studyStats.streak} 🔥</p>
                <p className="text-xs text-slate-500">Day Streak</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {studyStats.totalSessions > 0 
                  ? <>Your study activity is tracked through <span className="text-slate-900 font-medium">Atlas Intelligence</span>.</>
                  : <>Start studying flashcards to see your learning patterns here.</>
                }
              </p>
              <button 
                onClick={() => knowledgeHeatmapInsight && setSelectedInsight(knowledgeHeatmapInsight)}
                className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center"
              >
                View Detailed Report <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Study Rhythm */}
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Study Rhythm</h2>
            </div>
            
            {studyRhythmInsight ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {studyRhythmInsight.metadata?.dailyAverage || '--'}
                  </p>
                  <p className="text-xs text-slate-500">Daily Average</p>
                </div>
                {studyRhythmInsight.metadata?.weeklyChange !== undefined && (
                <div className={`flex items-center text-xs px-2 py-1 rounded-full border ${
                  studyRhythmInsight.metadata.weeklyChange >= 0 
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                    : 'text-red-600 bg-red-50 border-red-100'
                }`}>
                  {studyRhythmInsight.metadata.weeklyChange >= 0 
                    ? <TrendingUp className="w-3 h-3 mr-1" />
                    : <TrendingDown className="w-3 h-3 mr-1" />
                  }
                  {studyRhythmInsight.metadata.weeklyChange >= 0 ? '+' : ''}{studyRhythmInsight.metadata.weeklyChange}% vs last week
                </div>
                )}
              </div>
              
              {/* Bar Chart */}
              <div className="h-24 flex items-end justify-between gap-2 mt-2">
                {weeklyData.length > 0 ? weeklyData.map((value, i) => {
                  const height = (value / maxValue) * 100
                  const isHighest = value === maxValue
                  return (
                    <div 
                      key={i}
                      className={`w-full rounded-t-sm relative group transition-all cursor-pointer ${
                        isHighest 
                          ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        {days[i]}
                      </div>
                    </div>
                  )
                }) : (
                  <div className="w-full flex items-center justify-center text-slate-400 text-sm">
                    No weekly data available
                  </div>
                )}
              </div>
              
              <p className="text-xs text-slate-400 mt-2 text-center">
                Peak focus time: {studyRhythmInsight.metadata?.peakFocusTime || 'Analyzing...'}
              </p>
            </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Clock className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">No study rhythm data yet</p>
              <p className="text-slate-300 text-xs mt-1">Complete more study sessions to unlock Atlas Intelligence insights</p>
            </div>
            )}
          </div>

          {/* Retention */}
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Brain className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Retention</h2>
              </div>
              {overallRetention !== null && (
                <span className="text-2xl font-bold text-slate-900">{overallRetention}%</span>
              )}
            </div>
            
            {retentionInsight ? (
            <>
            {/* Progress Bar */}
            <div className="relative pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Short-term</span>
                <span>Long-term</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${overallRetention || 0}%` }}
                />
              </div>
            </div>
            
            {/* Topic Cards */}
            <div className="mt-6 space-y-3">
              {topRetainedTopics.length > 0 ? (
                topRetainedTopics.slice(0, 2).map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => retentionInsight && setSelectedInsight(retentionInsight)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.topic}</p>
                        <p className="text-[10px] text-slate-500">Last review: {item.lastReview}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${
                      item.retention === 'High' ? 'text-emerald-600' : 'text-amber-500'
                    }`}>
                      {item.retention}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  No topics to review yet
                </p>
              )}
            </div>
            </>
            ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Brain className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">No retention data yet</p>
              <p className="text-slate-300 text-xs mt-1">Atlas Intelligence needs more study data</p>
            </div>
            )}
          </div>

          {/* Learning Gaps - Full width */}
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-0 lg:col-span-3 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-400 to-teal-600 z-10"></div>
            
            {/* Top Section - Info */}
            <div className="p-6 border-b border-slate-200 bg-teal-50/50 relative">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <BookOpen className="w-20 h-20 text-teal-500" />
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-500 shadow-sm">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Learning Gaps</h2>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    {contentGapInsight?.message || "Atlas Intelligence will analyze your notes and quizzes to find topics you might be missing. Keep studying to unlock this insight!"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom Section - Missing Topics */}
            <div className="p-6">
              <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4">
                {contentGapInsight ? 'Detected Missing Topics' : 'Awaiting Analysis'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {missingTopics.length > 0 ? (
                  missingTopics.map((item, i) => (
                    <div 
                      key={i}
                      className="group flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 transition-all cursor-pointer shadow-sm hover:border-teal-200 hover:bg-teal-50/30"
                      onClick={() => contentGapInsight && setSelectedInsight(contentGapInsight)}
                    >
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800 transition-colors group-hover:text-teal-600 truncate">
                          {item.topic}
                        </h4>
                        {item.reason && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.reason}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                    <BookOpen className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-slate-400 text-sm">
                      {contentGapInsight ? 'No learning gaps detected. Keep up the great work!' : 'Add more notes and take quizzes to unlock gap analysis'}
                    </p>
                    <p className="text-slate-300 text-xs mt-1">Powered by Atlas Intelligence</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fact Check - Full width */}
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-0 lg:col-span-3 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600 z-10"></div>
            
            {/* Top Section - Info */}
            <div className="p-6 border-b border-slate-200 bg-rose-50/50 relative">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <AlertCircle className="w-20 h-20 text-rose-500" />
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-500 shadow-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Fact Check</h2>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    {factualAccuracyInsight?.message || "Atlas Intelligence scans your notes for potential factual errors or misconceptions to help ensure your learning materials are accurate."}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom Section - Factual Errors */}
            <div className="p-6">
              <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-4">
                {factualAccuracyInsight ? 'Detected Issues' : 'Awaiting Analysis'}
              </h3>
              <div className="space-y-3">
                {factualErrors.length > 0 ? (
                  factualErrors.map((error, i) => (
                    <div 
                      key={i}
                      className="group p-4 rounded-xl bg-white border border-slate-200 transition-all cursor-pointer shadow-sm hover:border-rose-200 hover:bg-rose-50/30"
                      onClick={() => factualAccuracyInsight && setSelectedInsight(factualAccuracyInsight)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${error.severity === 'high' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 mb-2">
                            <span className="line-through text-rose-600/80">{error.claim}</span>
                          </p>
                          <p className="text-sm text-green-700 flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            <span>{error.correction}</span>
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-xs flex-shrink-0 ${error.severity === 'high' ? 'border-red-200 text-red-600' : 'border-amber-200 text-amber-600'}`}>
                          {error.severity === 'high' ? 'Important' : 'Minor'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="w-10 h-10 text-green-200 mb-3" />
                    <p className="text-slate-400 text-sm">
                      {factualAccuracyInsight ? 'No factual errors detected. Your notes look accurate!' : 'Add notes with content to enable fact-checking'}
                    </p>
                    <p className="text-slate-300 text-xs mt-1">Powered by Atlas Intelligence</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Insights Section - For any insights not covered by the main cards */}
        {allInsights.filter(i => !['knowledge_heatmap', 'biological_rhythm', 'forgetting_curve', 'content_gap', 'factual_accuracy'].includes(i.insight_type)).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Additional Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allInsights
                .filter(i => !['knowledge_heatmap', 'biological_rhythm', 'forgetting_curve', 'content_gap', 'factual_accuracy'].includes(i.insight_type))
                .map((insight) => (
                  <div
                    key={insight.id}
                    onClick={() => setSelectedInsight(insight)}
                    className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{insight.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{insight.message}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allInsights.length === 0 && (
          <div className="bg-white/75 backdrop-blur-sm border border-slate-200/60 shadow-sm rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Insights Yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start studying with flashcards and adding notes to generate personalized insights for this project.
            </p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Generate Insights
            </button>
          </div>
        )}
      </main>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className={`p-6 ${
              selectedInsight.insight_type === 'knowledge_heatmap' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
              selectedInsight.insight_type === 'biological_rhythm' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
              selectedInsight.insight_type === 'forgetting_curve' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
              selectedInsight.insight_type === 'content_gap' ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
              selectedInsight.insight_type === 'factual_accuracy' ? 'bg-gradient-to-br from-rose-500 to-rose-600' :
              'bg-gradient-to-br from-indigo-500 to-indigo-600'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    {selectedInsight.insight_type === 'knowledge_heatmap' && <BarChart3 className="w-7 h-7 text-white" />}
                    {selectedInsight.insight_type === 'biological_rhythm' && <Clock className="w-7 h-7 text-white" />}
                    {selectedInsight.insight_type === 'forgetting_curve' && <Brain className="w-7 h-7 text-white" />}
                    {selectedInsight.insight_type === 'content_gap' && <BookOpen className="w-7 h-7 text-white" />}
                    {selectedInsight.insight_type === 'factual_accuracy' && <AlertCircle className="w-7 h-7 text-white" />}
                    {!['knowledge_heatmap', 'biological_rhythm', 'forgetting_curve', 'content_gap', 'factual_accuracy'].includes(selectedInsight.insight_type) && (
                      <Sparkles className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-white/70 capitalize">
                      {selectedInsight.insight_type.replace(/_/g, ' ')}
                    </span>
                    <h2 className="text-xl font-bold text-white">{selectedInsight.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-slate-600 mb-6">{selectedInsight.message}</p>
              
              {/* Metadata Details */}
              {selectedInsight.insight_type === 'knowledge_heatmap' && (
                <div className="space-y-4">
                  {selectedInsight.metadata.masteredTopics && selectedInsight.metadata.masteredTopics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Mastered Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.masteredTopics.map((topic, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedInsight.metadata.strugglingTopics && selectedInsight.metadata.strugglingTopics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-rose-600 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Needs Practice
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.strugglingTopics.map((topic, i) => (
                          <span key={i} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedInsight.insight_type === 'biological_rhythm' && (
                <div className="space-y-4">
                  {selectedInsight.metadata.bestHours && selectedInsight.metadata.bestHours.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-purple-600 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Peak Performance Hours
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.bestHours.map((hour, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs">
                            {hour}:00 - {hour + 1}:00
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedInsight.metadata.recommendedStudyTime && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Recommendation:</span> {selectedInsight.metadata.recommendedStudyTime}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedInsight.insight_type === 'forgetting_curve' && (
                <div className="space-y-4">
                  {selectedInsight.metadata.urgentReview && selectedInsight.metadata.urgentReview.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-rose-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Urgent Review Needed
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.urgentReview.slice(0, 5).map((topic, i) => (
                          <span key={i} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedInsight.metadata.dueForReview && selectedInsight.metadata.dueForReview.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Due for Review
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.dueForReview.slice(0, 5).map((topic, i) => (
                          <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedInsight.insight_type === 'content_gap' && (
                <div className="space-y-4">
                  {/* Missing Topics Pills */}
                  {selectedInsight.metadata.missingTopics && selectedInsight.metadata.missingTopics.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-3">
                        Missing Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInsight.metadata.missingTopics.map((item: { topic: string; reason: string }, i: number) => (
                          <span 
                            key={i} 
                            className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200"
                            title={item.reason}
                          >
                            <span className="size-1.5 rounded-full bg-red-500"></span>
                            {item.topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy suggestions support */}
                  {selectedInsight.metadata.suggestions && selectedInsight.metadata.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Suggested Topics to Explore
                      </h4>
                      <ul className="space-y-2">
                        {selectedInsight.metadata.suggestions.map((suggestion: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-emerald-500 mt-1">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {selectedInsight.insight_type === 'factual_accuracy' && (
                <div className="space-y-4">
                  {/* Note Reference */}
                  {selectedInsight.metadata.noteTitle && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <BookOpen className="w-4 h-4" />
                      <span>From note: <span className="font-medium text-slate-700">{selectedInsight.metadata.noteTitle}</span></span>
                    </div>
                  )}

                  {/* Errors List */}
                  {selectedInsight.metadata.errors && selectedInsight.metadata.errors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                        Issues Found
                      </h4>
                      {selectedInsight.metadata.errors.map((error, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${error.severity === 'high' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Incorrect</span>
                                <p className="text-sm text-rose-600 line-through">{error.claim}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Correct</span>
                                <p className="text-sm text-green-700 flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                  {error.correction}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Atlas AI Suggestion Box */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-rose-700 mb-1">Recommendation</h4>
                      <p className="text-sm text-rose-600">
                        Review and correct these items in your notes to ensure accurate learning material.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 flex gap-3 bg-slate-50">
              <button
                onClick={() => handleDismiss(selectedInsight.id)}
                className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-medium transition-colors text-slate-700"
              >
                Dismiss
              </button>
              {selectedInsight.insight_type === 'factual_accuracy' && selectedInsight.metadata.noteId ? (
                <button
                  onClick={() => {
                    router.push(`/project/${params.id}/notes`);
                    setSelectedInsight(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl font-medium transition-all text-white shadow-[0_4px_14px_0_rgba(244,63,94,0.39)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.23)]"
                >
                  Review Notes
                </button>
              ) : (
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors text-white"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
