'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Brain,
  Clock,
  AlertTriangle,
  Lightbulb,
  ChevronLeft,
  RefreshCw,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  X,
  Sparkles,
  BookOpen,
  Layers,
  Calendar,
  ArrowRight,
  CheckCircle,
  Info,
  AlertCircle,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'

interface InsightMetadata {
  periodsAnalyzed?: Array<{ name: string; accuracy: number; total: number; correct: number }>
  estimatedRetention?: number
  daysSinceReview?: number | null
  setTitle?: string
  projectName?: string
  noteTitle?: string
  contentLength?: number
  bestPeriod?: string
  bestAccuracy?: number
  worstPeriod?: string
  worstAccuracy?: number
  existingNotes?: string[]
  missingTopics?: Array<{ topic: string; reason: string }>
  [key: string]: unknown
}

interface Insight {
  id: string
  insight_type: string
  category: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  related_project_id?: string
  related_note_id?: string
  related_flashcard_set_id?: string
  metadata: InsightMetadata
  is_actionable: boolean
  action_type?: string
  action_data?: Record<string, unknown>
  is_dismissed: boolean
  insight_date: string
  created_at: string
}

interface GroupedInsights {
  [date: string]: Insight[]
}

const insightTypeIcons: Record<string, React.ElementType> = {
  knowledge_heatmap: Brain,
  biological_rhythm: Clock,
  forgetting_curve: AlertTriangle,
  content_gap: Lightbulb,
  factual_accuracy: AlertCircle,
}

const insightTypeColors: Record<string, string> = {
  knowledge_heatmap: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  biological_rhythm: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  forgetting_curve: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  content_gap: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  factual_accuracy: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

const severityStyles: Record<string, { bg: string; icon: React.ElementType; iconColor: string }> = {
  info: { bg: 'border-blue-500/30 bg-blue-500/5', icon: Info, iconColor: 'text-blue-500' },
  warning: { bg: 'border-yellow-500/30 bg-yellow-500/5', icon: AlertCircle, iconColor: 'text-yellow-500' },
  critical: { bg: 'border-red-500/30 bg-red-500/5', icon: AlertTriangle, iconColor: 'text-red-500' },
  success: { bg: 'border-green-500/30 bg-green-500/5', icon: CheckCircle, iconColor: 'text-green-500' },
}

const periodIcons: Record<string, React.ElementType> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<GroupedInsights>({})
  const [userName, setUserName] = useState('there')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/signin')
      return
    }
    await loadInsights()
  }

  const loadInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/insights?days=2')
      if (!response.ok) throw new Error('Failed to fetch insights')
      
      const data = await response.json()
      setInsights(data.insights || {})
      setUserName(data.userName || 'there')
    } catch (err) {
      console.error('Error loading insights:', err)
      setError('Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async (forceRegenerate = false) => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate })
      })
      
      if (!response.ok) throw new Error('Failed to generate insights')
      
      await loadInsights()
    } catch (err) {
      console.error('Error generating insights:', err)
      setError('Failed to generate insights')
    } finally {
      setIsGenerating(false)
    }
  }

  const dismissInsight = async (insightId: string) => {
    try {
      await fetch('/api/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, action: 'dismiss' })
      })
      
      // Remove from local state
      setInsights(prev => {
        const updated = { ...prev }
        for (const date in updated) {
          updated[date] = updated[date].filter(i => i.id !== insightId)
          if (updated[date].length === 0) delete updated[date]
        }
        return updated
      })
    } catch (err) {
      console.error('Error dismissing insight:', err)
    }
  }

  const handleAction = (insight: Insight) => {
    const actionData = insight.action_data as Record<string, string> | undefined
    
    switch (insight.action_type) {
      case 'create_flashcard':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/flashcards?noteId=${actionData.noteId}`)
        }
        break
      case 'review_flashcards':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/flashcards/${actionData.setId}`)
        }
        break
      case 'review_note':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/notes`)
        }
        break
      case 'reschedule':
        router.push('/dashboard/settings')
        break
      case 'generate_content':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/notes`)
        }
        break
      default:
        break
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    if (hour < 21) return 'Good Evening'
    return 'Good Night'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today'
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'knowledge_heatmap': return 'Knowledge Check'
      case 'biological_rhythm': return 'Study Pattern'
      case 'forgetting_curve': return 'Memory Alert'
      case 'content_gap': return 'Content Gap'
      case 'factual_accuracy': return 'Fact Check'
      default: return type
    }
  }

  const totalInsights = Object.values(insights).flat().filter(i => !i.is_dismissed).length
  const criticalCount = Object.values(insights).flat().filter(i => i.severity === 'critical' && !i.is_dismissed).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Daily Insights
              </h1>
              <p className="text-sm text-white/50">Your personalized learning briefing</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => generateInsights(true)}
            disabled={isGenerating}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  👋 {getGreeting()}, {userName}!
                </h2>
                <p className="text-white/60 max-w-xl">
                  {totalInsights === 0 
                    ? "No insights yet. Click 'Refresh' to analyze your study patterns and get personalized recommendations."
                    : `You have ${totalInsights} insight${totalInsights !== 1 ? 's' : ''} to review${criticalCount > 0 ? `, including ${criticalCount} requiring attention` : ''}.`
                  }
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                    {criticalCount} Critical
                  </Badge>
                )}
                <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10">
                  {totalInsights} Total
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            {totalInsights > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
                {[
                  { type: 'knowledge_heatmap', label: 'Knowledge', icon: Brain },
                  { type: 'biological_rhythm', label: 'Rhythm', icon: Clock },
                  { type: 'forgetting_curve', label: 'Memory', icon: AlertTriangle },
                  { type: 'content_gap', label: 'Gaps', icon: Lightbulb },
                  { type: 'factual_accuracy', label: 'Fact Check', icon: AlertCircle },
                ].map(({ type, label, icon: Icon }) => {
                  const count = Object.values(insights).flat().filter(i => i.insight_type === type && !i.is_dismissed).length
                  return (
                    <div key={type} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${insightTypeColors[type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">{count}</p>
                        <p className="text-xs text-white/50">{label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Insights by Date */}
        {Object.keys(insights).length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-emerald-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Insights Yet</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                Start by adding notes, creating flashcards, or taking quizzes. 
                We&apos;ll analyze your learning patterns and provide personalized insights.
              </p>
              <Button 
                onClick={() => generateInsights(false)}
                disabled={isGenerating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(insights)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dateInsights]) => {
                const activeInsights = dateInsights.filter(i => !i.is_dismissed)
                if (activeInsights.length === 0) return null
                
                return (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-white">{formatDate(date)}</h3>
                      <div className="flex-1 h-px bg-white/10" />
                      <Badge variant="outline" className="text-white/50 border-white/10">
                        {activeInsights.length} insight{activeInsights.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-4">
                      {activeInsights.map((insight) => {
                        const TypeIcon = insightTypeIcons[insight.insight_type] || Lightbulb
                        const { bg, icon: SeverityIcon, iconColor } = severityStyles[insight.severity] || severityStyles.info
                        
                        return (
                          <Card 
                            key={insight.id} 
                            className={`bg-white/5 border ${bg} transition-all hover:bg-white/[0.07]`}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`p-3 rounded-xl ${insightTypeColors[insight.insight_type]} shrink-0`}>
                                  <TypeIcon className="h-5 w-5" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${insightTypeColors[insight.insight_type]} border`}
                                    >
                                      {getInsightTypeLabel(insight.insight_type)}
                                    </Badge>
                                    <SeverityIcon className={`h-4 w-4 ${iconColor}`} />
                                  </div>
                                  
                                  <h4 className="text-white font-medium mb-2">{insight.title}</h4>
                                  <p className="text-white/60 text-sm leading-relaxed">{insight.message}</p>
                                  
                                  {/* Metadata Display */}
                                  {insight.insight_type === 'biological_rhythm' && insight.metadata.periodsAnalyzed && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {insight.metadata.periodsAnalyzed.map(period => {
                                        const PeriodIcon = periodIcons[period.name] || Clock
                                        return (
                                          <div 
                                            key={period.name}
                                            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5"
                                          >
                                            <PeriodIcon className="h-4 w-4 text-white/40" />
                                            <span className="text-xs text-white/60 capitalize">{period.name}</span>
                                            <span className={`text-xs font-medium ${
                                              period.accuracy >= 80 ? 'text-green-400' : 
                                              period.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                              {period.accuracy}%
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  
                                  {insight.insight_type === 'forgetting_curve' && typeof insight.metadata.estimatedRetention === 'number' && (
                                    <div className="mt-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-white/50">Memory Retention</span>
                                        <span className={`text-xs font-medium ${
                                          insight.metadata.estimatedRetention >= 50 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                          ~{String(insight.metadata.estimatedRetention)}%
                                        </span>
                                      </div>
                                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${
                                            insight.metadata.estimatedRetention >= 50 
                                              ? 'bg-yellow-500' 
                                              : 'bg-red-500'
                                          }`}
                                          style={{ width: `${insight.metadata.estimatedRetention}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 mt-4">
                                    {insight.is_actionable && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleAction(insight)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                      >
                                        {insight.action_type === 'create_flashcard' && (
                                          <>
                                            <Layers className="h-4 w-4 mr-2" />
                                            Create Flashcards
                                          </>
                                        )}
                                        {insight.action_type === 'review_flashcards' && (
                                          <>
                                            <BookOpen className="h-4 w-4 mr-2" />
                                            Review Now
                                          </>
                                        )}
                                        {insight.action_type === 'reschedule' && (
                                          <>
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Adjust Schedule
                                          </>
                                        )}
                                        {insight.action_type === 'generate_content' && (
                                          <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Generate Summary
                                          </>
                                        )}
                                        {!['create_flashcard', 'review_flashcards', 'reschedule', 'generate_content'].includes(insight.action_type || '') && (
                                          <>
                                            <ArrowRight className="h-4 w-4 mr-2" />
                                            Take Action
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => dismissInsight(insight.id)}
                                      className="text-white/40 hover:text-white hover:bg-white/10"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Dismiss
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* How Insights Work */}
        <Card className="bg-white/5 border-white/10 mt-12">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              How Insights Work
            </CardTitle>
            <CardDescription className="text-white/50">
              We analyze your study data to provide personalized recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Brain className="h-4 w-4 text-purple-500" />
                  </div>
                  <h4 className="font-medium text-white">Knowledge Heatmap</h4>
                </div>
                <p className="text-sm text-white/50">
                  Connects your notes with flashcards to find blind spots and areas where you might have false confidence.
                </p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <h4 className="font-medium text-white">Biological Rhythm</h4>
                </div>
                <p className="text-sm text-white/50">
                  Analyzes when you study best by tracking your accuracy at different times of day.
                </p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                  <h4 className="font-medium text-white">Forgetting Curve</h4>
                </div>
                <p className="text-sm text-white/50">
                  Predicts when you&apos;re likely to forget material based on the Ebbinghaus forgetting curve.
                </p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                  </div>
                  <h4 className="font-medium text-white">Content Gap</h4>
                </div>
                <p className="text-sm text-white/50">
                  Uses AI to compare your notes against typical curriculum and identify missing topics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
