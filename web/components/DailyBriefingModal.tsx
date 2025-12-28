'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Brain,
  Clock,
  AlertTriangle,
  Lightbulb,
  X,
  Sparkles,
  BookOpen,
  Layers,
  Calendar,
  ArrowRight,
  CheckCircle,
  Info,
  AlertCircle,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Insight {
  id: string
  insight_type: string
  category: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  related_project_id?: string
  metadata: InsightMetadata
  is_actionable: boolean
  action_type?: string
  action_data?: Record<string, unknown>
  is_dismissed: boolean
}

interface InsightMetadata {
  periodsAnalyzed?: Array<{ name: string; accuracy: number }>
  estimatedRetention?: number
  daysSinceReview?: number | null
  setTitle?: string
  projectName?: string
  noteTitle?: string
  [key: string]: unknown
}

interface DailyBriefingModalProps {
  isOpen: boolean
  onClose: () => void
  insights: Insight[]
  userName: string
}

const insightTypeIcons: Record<string, React.ElementType> = {
  knowledge_heatmap: Brain,
  biological_rhythm: Clock,
  forgetting_curve: AlertTriangle,
  content_gap: Lightbulb,
  factual_accuracy: AlertCircle,
}

const insightTypeColors: Record<string, string> = {
  knowledge_heatmap: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  biological_rhythm: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  forgetting_curve: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  content_gap: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  factual_accuracy: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const severityStyles: Record<string, { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: 'text-blue-400' },
  warning: { icon: AlertCircle, color: 'text-yellow-400' },
  critical: { icon: AlertTriangle, color: 'text-red-400' },
  success: { icon: CheckCircle, color: 'text-green-400' },
}

const periodIcons: Record<string, React.ElementType> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
  night: Moon,
}

export default function DailyBriefingModal({ isOpen, onClose, insights, userName }: DailyBriefingModalProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    if (hour < 21) return 'Good Evening'
    return 'Good Night'
  }

  const getTimeBasedMessage = () => {
    const hour = new Date().getHours()
    const biologicalInsight = insights.find(i => i.insight_type === 'biological_rhythm')
    if (biologicalInsight?.metadata?.bestPeriod) {
      const bestPeriod = biologicalInsight.metadata.bestPeriod as string
      if ((bestPeriod === 'morning' && hour >= 6 && hour < 12) ||
          (bestPeriod === 'afternoon' && hour >= 12 && hour < 17)) {
        return "Your brain works best right now! 🧠"
      }
    }
    if (hour >= 6 && hour < 12) return "Morning is a great time to tackle difficult topics."
    if (hour >= 22 || hour < 6) return "Late night? Focus on light review, not new material."
    return "Ready to learn something new?"
  }

  const criticalInsights = insights.filter(i => i.severity === 'critical')
  const warningInsights = insights.filter(i => i.severity === 'warning')
  const infoInsights = insights.filter(i => i.severity === 'info')

  const handleAction = (insight: Insight) => {
    const actionData = insight.action_data as Record<string, string> | undefined
    
    switch (insight.action_type) {
      case 'create_flashcard':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/flashcards?noteId=${actionData.noteId}`)
          onClose()
        }
        break
      case 'review_flashcards':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/flashcards/${actionData.setId}`)
          onClose()
        }
        break
      case 'generate_content':
        if (actionData?.projectId) {
          router.push(`/project/${actionData.projectId}/notes`)
          onClose()
        }
        break
      default:
        break
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }

  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'knowledge_heatmap': return 'Knowledge'
      case 'biological_rhythm': return 'Rhythm'
      case 'forgetting_curve': return 'Memory'
      case 'content_gap': return 'Gap'
      case 'factual_accuracy': return 'Fact Check'
      default: return type
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-[#0A0A0A] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                👋 {getGreeting()}, {userName}!
              </h2>
              <p className="text-white/50 text-sm mt-0.5">{getTimeBasedMessage()}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 mt-4">
            {criticalInsights.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalInsights.length} Urgent
              </Badge>
            )}
            {warningInsights.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
                <AlertCircle className="h-3 w-3 mr-1" />
                {warningInsights.length} Warning
              </Badge>
            )}
            <Badge className="bg-white/10 text-white/60 border-white/10 border">
              {insights.length} Total Insights
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh] space-y-3">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-white/50">No insights for today yet.</p>
              <p className="text-white/30 text-sm">Keep studying and we&apos;ll analyze your patterns!</p>
            </div>
          ) : (
            insights.map((insight) => {
              const TypeIcon = insightTypeIcons[insight.insight_type] || Lightbulb
              const { icon: SeverityIcon, color: severityColor } = severityStyles[insight.severity] || severityStyles.info

              return (
                <div
                  key={insight.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${insightTypeColors[insight.insight_type]}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white/40">
                          {getInsightTypeLabel(insight.insight_type)}
                        </span>
                        <SeverityIcon className={`h-3.5 w-3.5 ${severityColor}`} />
                      </div>
                      <h4 className="text-white font-medium text-sm mb-1">{insight.title}</h4>
                      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{insight.message}</p>
                      
                      {/* Retention meter for forgetting curve */}
                      {insight.insight_type === 'forgetting_curve' && typeof insight.metadata.estimatedRetention === 'number' && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  insight.metadata.estimatedRetention >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${insight.metadata.estimatedRetention}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40">~{insight.metadata.estimatedRetention}%</span>
                          </div>
                        </div>
                      )}

                      {/* Action button */}
                      {insight.is_actionable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(insight)}
                          className="mt-2 h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2"
                        >
                          {insight.action_type === 'create_flashcard' && 'Create Flashcards'}
                          {insight.action_type === 'review_flashcards' && 'Review Now'}
                          {insight.action_type === 'generate_content' && 'Generate Content'}
                          {!['create_flashcard', 'review_flashcards', 'generate_content'].includes(insight.action_type || '') && 'Take Action'}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => { router.push('/insights'); onClose(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              View All Insights
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
