'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Brain,
  Clock,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Layers,
  Target,
  Zap,
  X,
  ArrowRight,
  CheckCircle,
  Info,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  History
} from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import GlobalSidebar from '@/components/GlobalSidebar'
import ChatsPanel from '@/components/ChatsPanel'
import MobileNav from '@/components/MobileNav'

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
  errors?: Array<{ claim: string; correction: string; severity: string }>
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

interface Profile {
  name: string | null
  email: string
  subscription_tier?: string
}

interface ChatConversation {
  id: string
  title: string
  messages: any[]
  created_at: string
  updated_at: string
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<GroupedInsights>({})
  const [userName, setUserName] = useState('there')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showChatsPanel, setShowChatsPanel] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)
  const [totalInsightsCount, setTotalInsightsCount] = useState(0)
  const [limitApplied, setLimitApplied] = useState(false)
  const [limitBannerDismissed, setLimitBannerDismissed] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  
  // Free users get limited insights (50%)
  const isPro = profile?.subscription_tier === 'pro'
  const FREE_INSIGHT_LIMIT = 6 // Max insights shown to free users

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/signin')
      return
    }
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    
    // Fetch subscription tier
    let subscriptionTier = 'free'
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data = await res.json()
        subscriptionTier = data.subscription?.subscription_tier || 'free'
      }
    } catch (e) {}

    setProfile({ 
      name: profileData?.name || null, 
      email: user.email || '',
      subscription_tier: subscriptionTier
    })
    setUserName(profileData?.name || user.email?.split('@')[0] || 'there')
    
    await loadInsights()
  }

  const loadInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/insights?days=7')
      if (!response.ok) throw new Error('Failed to fetch insights')
      
      const data = await response.json()
      setInsights(data.insights || {})
      if (data.userName) setUserName(data.userName)
      if (data.lastGeneratedAt) setLastGeneratedAt(data.lastGeneratedAt)
      if (data.totalCount) setTotalInsightsCount(data.totalCount)
      if (data.limitApplied !== undefined) setLimitApplied(data.limitApplied)
    } catch (err) {
      console.error('Error loading insights:', err)
      setError('Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async (forceRegenerate = false) => {
    // Free users can only regenerate once per day
    if (!isPro && forceRegenerate && lastGeneratedAt) {
      const lastGen = new Date(lastGeneratedAt)
      const now = new Date()
      const hoursSinceLastGen = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastGen < 24) {
        setShowUpgradeModal(true)
        return
      }
    }
    
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

  /**
   * Delete insight and navigate to action
   * This removes the insight from the database when user takes action
   */
  const handleAction = async (insight: Insight) => {
    const actionData = insight.action_data as Record<string, string> | undefined
    
    // Delete the insight from database
    try {
      await fetch('/api/insights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId: insight.id })
      })
      
      // Remove from local state
      setInsights(prev => {
        const updated = { ...prev }
        for (const date in updated) {
          updated[date] = updated[date].filter(i => i.id !== insight.id)
          if (updated[date].length === 0) delete updated[date]
        }
        return updated
      })
    } catch (err) {
      console.error('Error deleting insight:', err)
    }
    
    // Navigate to appropriate page
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

  const loadConversation = (chat: ChatConversation) => {
    router.push('/overview')
  }

  const startNewChat = () => {
    router.push('/overview')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    if (hour < 21) return 'Good Evening'
    return 'Good Night'
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-[#283933] bg-[#1c2723] hover:border-[#13eca4]/50'
      case 'warning':
        return 'border-[#283933] bg-[#1c2723] hover:border-[#f97316]/50'
      case 'success':
        return 'border-[#283933] bg-[#1c2723] hover:border-[#13eca4]/50'
      default:
        return 'border-[#283933] bg-[#1c2723] hover:border-[#283933]'
    }
  }
  
  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'forgetting_curve':
        return { dot: 'bg-[#f97316]', text: 'text-[#f97316]', border: 'border-[#f97316]/50' }
      case 'biological_rhythm':
        return { dot: 'bg-[#7c3aed]', text: 'text-[#7c3aed]', border: 'border-[#7c3aed]/50' }
      case 'content_gap':
        return { dot: 'bg-[#3b82f6]', text: 'text-[#3b82f6]', border: 'border-[#3b82f6]/50' }
      case 'factual_accuracy':
        return { dot: 'bg-[#f97316]', text: 'text-[#f97316]', border: 'border-[#f97316]/50' }
      case 'knowledge_heatmap':
        return { dot: 'bg-[#13eca4]', text: 'text-[#13eca4]', border: 'border-[#13eca4]/50' }
      default:
        return { dot: 'bg-[#13eca4]', text: 'text-[#13eca4]', border: 'border-[#13eca4]/50' }
    }
  }
  
  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'forgetting_curve': return 'Memory'
      case 'biological_rhythm': return 'Rhythm'
      case 'content_gap': return 'Gaps'
      case 'factual_accuracy': return 'Accuracy'
      case 'knowledge_heatmap': return 'Knowledge'
      default: return type.replace('_', ' ')
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      default:
        return <Info className="h-5 w-5 text-blue-400" />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'knowledge_heatmap':
        return <Brain className="h-5 w-5" />
      case 'biological_rhythm':
        return <Clock className="h-5 w-5" />
      case 'forgetting_curve':
        return <TrendingUp className="h-5 w-5" />
      case 'content_gap':
        return <Layers className="h-5 w-5" />
      case 'factual_accuracy':
        return <Target className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
    }
  }

  // Get all active insights
  const allInsights = Object.values(insights).flat().filter(i => !i.is_dismissed)
  const totalInsights = allInsights.length
  const criticalCount = allInsights.filter(i => i.severity === 'critical' || i.severity === 'warning').length

  // Get insight counts by type
  const insightCounts: Record<string, number> = {}
  allInsights.forEach(i => {
    insightCounts[i.insight_type] = (insightCounts[i.insight_type] || 0) + 1
  })

  // Filter insights - on 'all' tab, show max 1 from each important category (total max 6)
  // Free users only see limited insights
  const getFilteredInsights = () => {
    let filtered: Insight[] = []
    
    if (activeFilter !== 'all') {
      filtered = allInsights.filter(i => i.insight_type === activeFilter)
    } else {
      // For 'All' tab, show a curated selection - 1 most important from each category
      const categories = ['forgetting_curve', 'factual_accuracy', 'content_gap', 'knowledge_heatmap', 'biological_rhythm']
      const curated: Insight[] = []
      
      categories.forEach(category => {
        const categoryInsights = allInsights.filter(i => i.insight_type === category)
        // Sort by severity (critical first) and recency
        categoryInsights.sort((a, b) => {
          const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 }
          const aSev = severityOrder[a.severity] ?? 2
          const bSev = severityOrder[b.severity] ?? 2
          if (aSev !== bSev) return aSev - bSev
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        // Take only the first one from each category
        if (categoryInsights.length > 0) {
          curated.push(categoryInsights[0])
        }
      })
      
      // Sort curated by severity and return max 6
      curated.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 }
        return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
      })
      
      filtered = curated.slice(0, 6)
    }
    
    // Free users see limited insights
    if (!isPro && filtered.length > FREE_INSIGHT_LIMIT) {
      filtered = filtered.slice(0, FREE_INSIGHT_LIMIT)
    }
    
    return filtered
  }
  
  // Check if there are more insights available (for upgrade prompt)
  const hasMoreInsights = !isPro && (
    (activeFilter === 'all' && allInsights.length > FREE_INSIGHT_LIMIT) ||
    (activeFilter !== 'all' && allInsights.filter(i => i.insight_type === activeFilter).length > FREE_INSIGHT_LIMIT)
  )
  
  // Check if specific categories are locked for free users
  const isFactCheckLocked = !isPro && (insightCounts['factual_accuracy'] || 0) > 2
  const isKnowledgeGapLocked = !isPro && (insightCounts['content_gap'] || 0) > 2

  const filteredInsights = getFilteredInsights()

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#111816]">
        {/* Global Sidebar */}
        <div className="hidden lg:block">
          <GlobalSidebar
            isPro={profile?.subscription_tier === 'pro'}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onChatsClick={() => setShowChatsPanel(!showChatsPanel)}
            onChatsHover={() => setShowChatsPanel(true)}
            onChatsClose={() => setShowChatsPanel(false)}
            activeItem="insights"
          />
        </div>

        {/* Chats Panel */}
        <ChatsPanel
          isOpen={showChatsPanel}
          onClose={() => setShowChatsPanel(false)}
          onSelectChat={loadConversation}
          onNewChat={startNewChat}
          currentChatId={null}
        />

        {/* Main Content */}
        <main className="lg:ml-[72px] min-h-screen pb-20 lg:pb-0">
          <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-6 md:py-10">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start sm:items-end gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex flex-col gap-1.5 sm:gap-2 max-w-2xl">
                <h1 className="text-white text-2xl sm:text-3xl md:text-5xl font-black leading-tight tracking-[-0.033em]">
                  All Insights
                </h1>
                <p className="text-[#9db9b0] text-sm sm:text-base md:text-lg font-normal leading-normal flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#13eca4]" />
                  {totalInsights === 0 ? (
                    "No insights yet. Generate some to see your study patterns."
                  ) : (
                    <>
                      Digital Coach: You have <span className="text-white font-semibold">{criticalCount > 0 ? criticalCount : totalInsights}</span> {criticalCount > 0 ? 'critical insights requiring attention' : 'insights to review'}.
                      {!isPro && totalInsightsCount > FREE_INSIGHT_LIMIT && (
                        <span className="text-[#f97316]"> ({totalInsightsCount - FREE_INSIGHT_LIMIT} more locked)</span>
                      )}
                    </>
                  )}
                </p>
                {/* Last generated info */}
                {lastGeneratedAt && (
                  <p className="text-[#9db9b0]/60 text-xs flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Last updated: {new Date(lastGeneratedAt).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                {isPro ? (
                  /* Pro users get refresh button */
                  <button
                    onClick={() => generateInsights(true)}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl border border-[#283933] bg-[#1c2723] text-white text-xs sm:text-sm font-medium hover:bg-[#283933] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Analyzing...' : 'Refresh'}
                  </button>
                ) : (
                  /* Free users get generate button only if not generated today */
                  totalInsights === 0 ? (
                    <button
                      onClick={() => generateInsights(false)}
                      disabled={isGenerating}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-4 sm:px-5 rounded-lg sm:rounded-xl bg-[#13eca4] text-[#111816] text-xs sm:text-sm font-bold hover:bg-[#0ebf84] transition-colors disabled:opacity-50"
                    >
                      <Zap className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                      {isGenerating ? 'Generating...' : 'Morning Report'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl border border-[#13eca4]/30 bg-[#13eca4]/10 text-[#13eca4] text-xs sm:text-sm font-medium hover:bg-[#13eca4]/20 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Upgrade
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 sm:mb-10 overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0 scrollbar-hide">
              <div className="flex border-b border-[#283933] min-w-max gap-4 sm:gap-8">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`group flex flex-col items-center justify-center border-b-[3px] pb-2 sm:pb-3 pt-1.5 sm:pt-2 transition-colors ${
                    activeFilter === 'all'
                      ? 'border-[#13eca4] text-white'
                      : 'border-transparent text-[#9db9b0] hover:border-[#283933]'
                  }`}
                >
                  <p className={`text-xs sm:text-sm font-bold leading-normal tracking-wide transition-colors ${
                    activeFilter === 'all' ? 'text-white' : 'text-[#9db9b0] group-hover:text-white'
                  }`}>
                    All ({totalInsights})
                  </p>
                </button>
                
                {[
                  { type: 'knowledge_heatmap', label: 'Knowledge', color: '#13eca4' },
                  { type: 'biological_rhythm', label: 'Rhythm', color: '#7c3aed' },
                  { type: 'forgetting_curve', label: 'Memory', color: '#f97316' },
                  { type: 'content_gap', label: 'Gaps', color: '#3b82f6' },
                  { type: 'factual_accuracy', label: 'Accuracy', color: '#f97316' },
                ].map(({ type, label, color }) => {
                  const count = insightCounts[type] || 0
                  if (count === 0) return null
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={`group flex flex-col items-center justify-center border-b-[3px] pb-2 sm:pb-3 pt-1.5 sm:pt-2 transition-colors ${
                        activeFilter === type
                          ? `text-white`
                          : 'border-transparent text-[#9db9b0] hover:border-[#283933]'
                      }`}
                      style={activeFilter === type ? { borderColor: color } : {}}
                    >
                      <p className={`text-xs sm:text-sm font-bold leading-normal tracking-wide transition-colors ${
                        activeFilter === type ? 'text-white' : 'text-[#9db9b0] group-hover:text-white'
                      }`}>
                        {label} ({count})
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                {error}
              </div>
            )}

            {/* Free user limit banner */}
            {!isPro && limitApplied && !limitBannerDismissed && (
              <div className="mb-6 p-4 bg-[#13eca4]/10 border border-[#13eca4]/30 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-[#13eca4] flex-shrink-0" />
                  <p className="text-[#9db9b0] text-sm">
                    <span className="text-white font-medium">Showing 50% of insights.</span>{' '}
                    Upgrade to Pro to see all insights and historical data.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-4 py-2 bg-[#13eca4] text-[#111816] rounded-lg text-sm font-bold hover:bg-[#0ebf84] transition-colors whitespace-nowrap"
                  >
                    Upgrade
                  </button>
                  <button
                    onClick={() => setLimitBannerDismissed(true)}
                    className="p-2 text-[#9db9b0] hover:text-white hover:bg-[#283933] rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Insights Grid */}
            {filteredInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#13eca4]/20 to-[#7c3aed]/20 flex items-center justify-center mb-4 sm:mb-6">
                  <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-[#13eca4]" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">
                  {isPro ? 'No Insights Yet' : '🌅 Morning Report'}
                </h3>
                <p className="text-[#9db9b0] text-sm sm:text-base max-w-md mb-4 sm:mb-6">
                  {isPro 
                    ? 'Generate insights to analyze your study patterns, identify knowledge gaps, and optimize your learning.'
                    : 'Start your day with AI-powered insights about your study patterns and memory retention.'}
                </p>
                <button
                  onClick={() => generateInsights(false)}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#13eca4] text-[#111816] rounded-lg sm:rounded-xl text-sm font-bold hover:bg-[#0ebf84] transition-colors disabled:opacity-50"
                >
                  <Zap className={`h-4 w-4 sm:h-5 sm:w-5 ${isGenerating ? 'animate-pulse' : ''}`} />
                  {isGenerating ? 'Analyzing...' : isPro ? 'Generate Insights' : 'Generate Report'}
                </button>
                {!isPro && (
                  <p className="mt-3 sm:mt-4 text-[#9db9b0]/60 text-[10px] sm:text-xs">
                    Free: 1 report/day • Pro: Unlimited
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredInsights.map((insight, index) => {
                  const categoryColor = getCategoryColor(insight.insight_type)
                  const categoryLabel = getCategoryLabel(insight.insight_type)
                  const isFirstCard = index === 0
                  const isCritical = insight.severity === 'critical'
                  
                  // Large featured card with image (for first critical or memory insights)
                  if ((isFirstCard && isCritical) || (insight.insight_type === 'forgetting_curve' && insight.severity === 'critical')) {
                    return (
                      <div key={insight.id} className="sm:col-span-2 xl:col-span-2 group relative flex flex-col md:flex-row items-stretch bg-[#1c2723] rounded-xl sm:rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:border-[#13eca4]/50 transition-all duration-300">
                        {/* Image Section */}
                        <div 
                          className="w-full md:w-2/5 min-h-[200px] md:min-h-full bg-cover bg-center relative"
                          style={{ backgroundImage: 'url(/mito.png)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1c2723] via-transparent to-transparent opacity-90"></div>
                          {isCritical && (
                            <div className="absolute top-4 left-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-[#f97316] tracking-wider uppercase">
                                <AlertCircle className="w-4 h-4" />
                                Critical
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Content Section */}
                        <div className="flex-1 flex flex-col justify-between p-6 md:p-8 gap-4">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                              <p className={`${categoryColor.text} text-xs font-bold tracking-widest uppercase flex items-center gap-1`}>
                                <span className={`size-2 rounded-full ${categoryColor.dot}`}></span>
                                {categoryLabel} • {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                              <h3 className="text-white text-2xl font-bold leading-tight">{insight.title}</h3>
                            </div>
                            <button onClick={() => dismissInsight(insight.id)} className="text-[#9db9b0] hover:text-white transition-colors">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <p className="text-[#9db9b0] text-base leading-relaxed">{insight.message}</p>
                            {insight.metadata?.projectName && (
                              <div className="flex items-center gap-2 text-sm text-[#9db9b0] bg-[#111816]/50 p-2.5 rounded-lg border border-white/5 w-fit">
                                <span>📁</span>
                                <span>Source: {insight.metadata.projectName}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => handleAction(insight)}
                              className="flex-1 md:flex-none md:min-w-[140px] flex items-center justify-center rounded-xl h-10 px-6 bg-[#13eca4] hover:bg-[#0ebf84] transition-colors text-[#111816] text-sm font-bold leading-normal"
                            >
                              Take Action
                            </button>
                            <button
                              onClick={() => dismissInsight(insight.id)}
                              className="md:flex-none flex items-center justify-center rounded-xl h-10 px-4 border border-[#283933] hover:bg-[#283933] transition-colors text-white text-sm font-medium"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Rhythm card with large time display
                  if (insight.insight_type === 'biological_rhythm') {
                    return (
                      <div key={insight.id} className="group flex flex-col bg-[#1c2723] rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:border-[#7c3aed]/50 transition-all duration-300">
                        <div className="p-6 flex flex-col h-full gap-5">
                          <div className="flex justify-between items-start">
                            <p className="text-[#7c3aed] text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                              <span className="size-2 rounded-full bg-[#7c3aed]"></span>
                              Rhythm • Just now
                            </p>
                            <Clock className="w-5 h-5 text-[#7c3aed]" />
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <h3 className="text-white text-xl font-bold leading-tight">{insight.title}</h3>
                            {insight.metadata?.bestPeriod && (
                              <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-white tracking-tighter">{insight.metadata.bestPeriod}</span>
                                <span className="text-xl font-medium text-[#9db9b0] mb-1.5">Peak Time</span>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-[#9db9b0] text-sm leading-relaxed">{insight.message}</p>
                          
                          <div className="mt-auto pt-2">
                            <button
                              onClick={() => handleAction(insight)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#7c3aed]/10 border border-[#7c3aed]/20 hover:bg-[#7c3aed] hover:text-white transition-all text-[#7c3aed] text-sm font-bold leading-normal"
                            >
                              <Calendar className="w-4 h-4" />
                              Schedule Session
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Gaps card with image overlay
                  if (insight.insight_type === 'content_gap') {
                    return (
                      <div key={insight.id} className="group relative flex flex-col justify-end min-h-[320px] bg-[#1c2723] rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:shadow-[#13eca4]/5 transition-all duration-300">
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: 'url(/knowledgegap.png)' }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111816] via-[#111816]/80 to-transparent"></div>
                        
                        <div className="relative z-10 p-6 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <p className="text-[#3b82f6] text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                              <span className="size-2 rounded-full bg-[#3b82f6]"></span>
                              Gaps • {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <h3 className="text-white text-xl font-bold leading-tight">{insight.title}</h3>
                            <p className="text-white/90 text-sm font-medium">{insight.message.split('.')[0]}</p>
                          </div>
                          
                          <p className="text-[#9db9b0] text-xs leading-relaxed line-clamp-2">{insight.message}</p>
                          
                          <button
                            onClick={() => handleAction(insight)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#3b82f6] text-white hover:bg-blue-600 transition-colors text-sm font-bold leading-normal"
                          >
                            <Lightbulb className="w-4 h-4" />
                            Learn Topic
                          </button>
                        </div>
                      </div>
                    )
                  }
                  
                  // Accuracy card with error display
                  if (insight.insight_type === 'factual_accuracy') {
                    return (
                      <div key={insight.id} className="group flex flex-col bg-[#1c2723] rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:border-[#f97316]/50 transition-all duration-300">
                        <div className="p-6 flex flex-col h-full gap-4">
                          <div className="flex justify-between items-start">
                            <p className="text-[#f97316] text-xs font-bold tracking-widest uppercase flex items-center gap-1">
                              <span className="size-2 rounded-full bg-[#f97316]"></span>
                              Accuracy • {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <div className="size-8 rounded-full bg-[#f97316]/10 flex items-center justify-center text-[#f97316]">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-white text-lg font-bold leading-tight mb-2">{insight.title}</h3>
                            <div className="p-3 rounded-lg bg-[#111816] border border-[#283933]">
                              <div className="flex gap-2 items-start text-sm">
                                <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <span className="text-[#9db9b0]">{insight.message}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1"></div>
                          
                          <div className="flex flex-col gap-1">
                            {insight.metadata?.projectName && (
                              <p className="text-[#9db9b0] text-xs mb-2">📁 {insight.metadata.projectName}</p>
                            )}
                            <button
                              onClick={() => handleAction(insight)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-transparent border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-white transition-all text-sm font-bold leading-normal"
                            >
                              <Target className="w-4 h-4" />
                              Fix Error
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Knowledge card with header image
                  if (insight.insight_type === 'knowledge_heatmap') {
                    return (
                      <div key={insight.id} className="group flex flex-col bg-[#1c2723] rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:border-[#13eca4]/50 transition-all duration-300">
                        <div 
                          className="h-32 bg-cover bg-center relative"
                          style={{ backgroundImage: 'url(/testedknowledge.png)' }}
                        >
                          <div className="absolute inset-0 bg-[#1c2723]/60"></div>
                        </div>
                        
                        <div className="p-6 flex flex-col flex-1 gap-4 -mt-8 relative z-10">
                          <div className="flex justify-between items-end">
                            <div className="size-14 rounded-xl bg-[#1c2723] border border-[#283933] flex items-center justify-center shadow-lg">
                              <Brain className="w-8 h-8 text-[#13eca4]" />
                            </div>
                            <p className="text-[#13eca4] text-xs font-bold tracking-widest uppercase mb-1">Knowledge</p>
                          </div>
                          
                          <div>
                            <h3 className="text-white text-lg font-bold leading-tight mb-1">{insight.title}</h3>
                            <p className="text-[#9db9b0] text-sm">{insight.message}</p>
                          </div>
                          
                          {insight.metadata?.estimatedRetention !== undefined && (
                            <>
                              <div className="w-full bg-[#111816] rounded-full h-1.5 mt-2">
                                <div className="bg-[#13eca4] h-1.5 rounded-full" style={{ width: `${insight.metadata.estimatedRetention}%` }}></div>
                              </div>
                              <p className="text-right text-xs text-[#9db9b0]">{insight.metadata.estimatedRetention}% Complete</p>
                            </>
                          )}
                          
                          <button
                            onClick={() => handleAction(insight)}
                            className="mt-auto w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#13eca4] text-[#111816] hover:bg-[#0ebf84] transition-colors text-sm font-bold leading-normal"
                          >
                            Start Module
                          </button>
                        </div>
                      </div>
                    )
                  }
                  
                  // Default card for any other types
                  return (
                    <div key={insight.id} className="group flex flex-col bg-[#1c2723] rounded-2xl overflow-hidden border border-[#283933] shadow-lg hover:border-[#13eca4]/50 transition-all duration-300">
                      <div className="p-6 flex flex-col h-full gap-4">
                        <div className="flex justify-between items-start">
                          <p className={`${categoryColor.text} text-xs font-bold tracking-widest uppercase flex items-center gap-1`}>
                            <span className={`size-2 rounded-full ${categoryColor.dot}`}></span>
                            {categoryLabel} • {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <button onClick={() => dismissInsight(insight.id)} className="text-[#9db9b0] hover:text-white transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div>
                          <h3 className="text-white text-lg font-bold leading-tight mb-2">{insight.title}</h3>
                          <p className="text-[#9db9b0] text-sm leading-relaxed">{insight.message}</p>
                        </div>
                        
                        {insight.metadata && (insight.metadata.projectName || insight.metadata.setTitle) && (
                          <div className="flex items-center gap-2 text-sm text-[#9db9b0] bg-[#111816]/50 p-2.5 rounded-lg border border-white/5 w-fit">
                            <span>📁</span>
                            <span>{insight.metadata.projectName || insight.metadata.setTitle}</span>
                          </div>
                        )}
                        
                        <div className="flex-1"></div>
                        
                        {insight.is_actionable && (
                          <button
                            onClick={() => handleAction(insight)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#13eca4] text-[#111816] hover:bg-[#0ebf84] transition-colors text-sm font-bold leading-normal"
                          >
                            Take Action
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* View More Message - only on 'All' tab when there are more insights */}
            {activeFilter === 'all' && totalInsights > filteredInsights.length && (
              <div className="mt-10 text-center">
                <div className="inline-flex flex-col items-center gap-3 p-6 bg-[#1c2723]/50 rounded-2xl border border-[#283933]">
                  <p className="text-[#9db9b0] text-sm">
                    Showing <span className="text-white font-semibold">{filteredInsights.length}</span> of <span className="text-white font-semibold">{totalInsights}</span> insights
                  </p>
                  <p className="text-[#9db9b0] text-xs">
                    Click on individual categories above to see all insights for each type
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {Object.entries(insightCounts).map(([type, count]) => {
                      const colors = getCategoryColor(type)
                      const label = getCategoryLabel(type)
                      return (
                        <button
                          key={type}
                          onClick={() => setActiveFilter(type)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colors.border} ${colors.text} text-xs font-medium hover:bg-white/5 transition-colors`}
                        >
                          <span className={`size-1.5 rounded-full ${colors.dot}`}></span>
                          {label} ({count})
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Upgrade Card for Free Users - Shows when there are more insights locked */}
                {hasMoreInsights && (
                  <div className="group flex flex-col bg-gradient-to-br from-[#13eca4]/10 to-[#7c3aed]/10 rounded-2xl overflow-hidden border border-[#13eca4]/30 shadow-lg hover:border-[#13eca4]/50 transition-all duration-300">
                    <div className="p-6 flex flex-col h-full gap-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#13eca4]/20 rounded-xl">
                          <Sparkles className="w-6 h-6 text-[#13eca4]" />
                        </div>
                        <div>
                          <p className="text-white font-bold">More Insights Available</p>
                          <p className="text-[#9db9b0] text-sm">
                            {allInsights.length - FREE_INSIGHT_LIMIT}+ insights locked
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-[#9db9b0] text-sm leading-relaxed">
                        Upgrade to Pro to unlock all your insights, including advanced fact-checking, knowledge gap analysis, and unlimited refreshes.
                      </p>
                      
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl h-10 px-4 bg-[#13eca4] hover:bg-[#0ebf84] transition-all text-[#111816] text-sm font-bold leading-normal mt-auto"
                      >
                        <Zap className="w-4 h-4" />
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upgrade Banner for Fact Check / Knowledge Gap */}
            {!isPro && (activeFilter === 'factual_accuracy' || activeFilter === 'content_gap') && (
              <div className="mt-8 p-6 bg-gradient-to-r from-[#f97316]/10 to-[#13eca4]/10 border border-[#f97316]/30 rounded-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#f97316]/20 rounded-xl">
                      {activeFilter === 'factual_accuracy' ? (
                        <Target className="w-6 h-6 text-[#f97316]" />
                      ) : (
                        <Layers className="w-6 h-6 text-[#3b82f6]" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold">
                        {activeFilter === 'factual_accuracy' ? 'Unlock All Fact Checks' : 'Unlock All Knowledge Gaps'}
                      </p>
                      <p className="text-[#9db9b0] text-sm">
                        {activeFilter === 'factual_accuracy' 
                          ? 'Pro users get unlimited AI-powered fact verification for all their notes.'
                          : 'Pro users get complete knowledge gap analysis across all subjects.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#13eca4] hover:bg-[#0ebf84] rounded-xl text-[#111816] font-bold text-sm transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    Upgrade to Unlock
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Message */}
            {filteredInsights.length > 0 && (
              <div className="mt-10 sm:mt-16 text-center pb-6 sm:pb-10">
                <p className="text-[#9db9b0] text-xs sm:text-sm">
                  {!isPro ? (
                    <>Viewing {filteredInsights.length} of {allInsights.length} insights. <span className="text-[#13eca4] cursor-pointer hover:underline" onClick={() => setShowUpgradeModal(true)}>Upgrade</span>.</>
                  ) : activeFilter === 'all' 
                    ? "You've viewed all critical insights for today."
                    : `Showing all ${getCategoryLabel(activeFilter)} insights.`
                  }
                </p>
                {isPro && (
                  <button className="mt-3 sm:mt-4 text-[#13eca4] hover:text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 mx-auto">
                    <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    View Past Insights
                  </button>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Mobile Navigation */}
        <MobileNav onChatsClick={() => setShowChatsPanel(!showChatsPanel)} />

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </TooltipProvider>
  )
}
