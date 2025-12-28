'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { FileText, HelpCircle, Layers, Clock, TrendingUp, TrendingDown, Flame, Minus, Trophy, ChevronRight, Calendar, Plus, X, History } from 'lucide-react'
import { Loading } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'

interface ProjectData {
  id: string
  name: string
  description: string
  color: string
  created_at: string
}

interface ContentCounts {
  notes: number
  qa_pairs: number
  flashcards: number
}

interface RecentItem {
  id: string
  title: string
  type: 'note' | 'qa' | 'flashcard'
  created_at: string
}

interface WeeklyActivity {
  day: string
  activity: number
}

interface StreakData {
  currentStreak: number
  longestStreak: number
}

interface ContentChange {
  notes: number
  qa_pairs: number
  flashcards: number
}

export default function ProjectOverview() {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [counts, setCounts] = useState<ContentCounts>({ notes: 0, qa_pairs: 0, flashcards: 0 })
  const [changes, setChanges] = useState<ContentChange>({ notes: 0, qa_pairs: 0, flashcards: 0 })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [allHistoryItems, setAllHistoryItems] = useState<RecentItem[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const projectId = params.id as string

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setError(null)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('User authentication error:', userError)
        router.push('/signin')
        return
      }

      if (!user) {
        router.push('/signin')
        return
      }

      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          // Project not found
          console.error('Project not found:', projectError)
          router.push('/dashboard')
          return
        }
        console.error('Project fetch error:', projectError)
        setError('Failed to load project data')
        return
      }

      if (!projectData) {
        router.push('/dashboard')
        return
      }

      setProject(projectData)

      // Load counts with better error handling
      const [notesResult, qaResult, flashcardsResult] = await Promise.allSettled([
        supabase.from('notes').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('quizzes').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('flashcard_sets').select('id', { count: 'exact' }).eq('project_id', projectId)
      ])

      const notesCount = (notesResult.status === 'fulfilled' ? notesResult.value.count : 0) || 0
      const qaCount = (qaResult.status === 'fulfilled' ? qaResult.value.count : 0) || 0
      const flashcardsCount = (flashcardsResult.status === 'fulfilled' ? flashcardsResult.value.count : 0) || 0

      setCounts({
        notes: notesCount,
        qa_pairs: qaCount,
        flashcards: flashcardsCount
      })

      // Calculate changes from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoISO = sevenDaysAgo.toISOString()

      const [recentNotesCount, recentQaCount, recentFlashcardsCount] = await Promise.allSettled([
        supabase.from('notes').select('id', { count: 'exact' }).eq('project_id', projectId).gte('created_at', sevenDaysAgoISO),
        supabase.from('quizzes').select('id', { count: 'exact' }).eq('project_id', projectId).gte('created_at', sevenDaysAgoISO),
        supabase.from('flashcard_sets').select('id', { count: 'exact' }).eq('project_id', projectId).gte('created_at', sevenDaysAgoISO)
      ])

      setChanges({
        notes: (recentNotesCount.status === 'fulfilled' ? recentNotesCount.value.count : 0) || 0,
        qa_pairs: (recentQaCount.status === 'fulfilled' ? recentQaCount.value.count : 0) || 0,
        flashcards: (recentFlashcardsCount.status === 'fulfilled' ? recentFlashcardsCount.value.count : 0) || 0
      })

      // Load recent items with better error handling
      const [recentNotes, recentQA, recentFlashcards] = await Promise.allSettled([
        supabase
          .from('notes')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('quizzes')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('flashcard_sets')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(3)
      ])

      const recent: RecentItem[] = []

      // Add notes
      if (recentNotes.status === 'fulfilled' && recentNotes.value.data) {
        recent.push(...recentNotes.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Note',
          type: 'note' as const,
          created_at: item.created_at
        })))
      }

      // Add Q&A (quizzes)
      if (recentQA.status === 'fulfilled' && recentQA.value.data) {
        recent.push(...recentQA.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Quiz',
          type: 'qa' as const,
          created_at: item.created_at
        })))
      }

      // Add flashcards (sets)
      if (recentFlashcards.status === 'fulfilled' && recentFlashcards.value.data) {
        recent.push(...recentFlashcards.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Flashcard Set',
          type: 'flashcard' as const,
          created_at: item.created_at
        })))
      }

      // Sort by creation date and take most recent 6
      recent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentItems(recent.slice(0, 6))

      // Calculate weekly activity - fetch all items from last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const today = new Date()
      
      // Fetch all activity from last 7 days for accurate chart (reuse sevenDaysAgoISO from above)
      const [weekNotes, weekQuizzes, weekFlashcards] = await Promise.allSettled([
        supabase
          .from('notes')
          .select('created_at')
          .eq('project_id', projectId)
          .gte('created_at', sevenDaysAgoISO),
        supabase
          .from('quizzes')
          .select('created_at')
          .eq('project_id', projectId)
          .gte('created_at', sevenDaysAgoISO),
        supabase
          .from('flashcard_sets')
          .select('created_at')
          .eq('project_id', projectId)
          .gte('created_at', sevenDaysAgoISO)
      ])
      
      // Get all items with dates for activity calculation
      const allItems: { created_at: string }[] = []
      if (weekNotes.status === 'fulfilled' && weekNotes.value.data) {
        allItems.push(...weekNotes.value.data)
      }
      if (weekQuizzes.status === 'fulfilled' && weekQuizzes.value.data) {
        allItems.push(...weekQuizzes.value.data)
      }
      if (weekFlashcards.status === 'fulfilled' && weekFlashcards.value.data) {
        allItems.push(...weekFlashcards.value.data)
      }
      
      const weekData: WeeklyActivity[] = []
      
      // Calculate activity for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dayStart = new Date(date.setHours(0, 0, 0, 0))
        const dayEnd = new Date(date.setHours(23, 59, 59, 999))
        
        const dayActivity = allItems.filter(item => {
          const itemDate = new Date(item.created_at)
          return itemDate >= dayStart && itemDate <= dayEnd
        }).length
        
        weekData.push({
          day: days[dayStart.getDay()],
          activity: dayActivity
        })
      }
      
      setWeeklyActivity(weekData)

      // Calculate streak for this project
      const allItemDates = allItems.map(item => {
        const d = new Date(item.created_at)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      })
      const uniqueDates = [...new Set(allItemDates)].sort().reverse()
      
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0
      
      // Check if today or yesterday has activity (to start counting streak)
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
      
      if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
        // Count consecutive days backwards from today
        for (let i = 0; i <= 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
          
          if (uniqueDates.includes(checkStr)) {
            currentStreak++
          } else if (i > 0) {
            // Allow skipping today if no activity yet today
            break
          }
        }
      }
      
      // Calculate longest streak
      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i])
        const nextDate = i + 1 < uniqueDates.length ? new Date(uniqueDates[i + 1]) : null
        
        tempStreak++
        
        if (nextDate) {
          const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays !== 1) {
            longestStreak = Math.max(longestStreak, tempStreak)
            tempStreak = 0
          }
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
        }
      }
      
      setStreak({ currentStreak, longestStreak: Math.max(longestStreak, currentStreak) })

    } catch (error) {
      console.error('Error loading project data:', error)
      setError('An unexpected error occurred while loading project data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllHistory = async () => {
    if (allHistoryItems.length > 0) {
      setShowHistoryModal(true)
      return
    }

    setIsLoadingHistory(true)
    try {
      const [allNotes, allQA, allFlashcards] = await Promise.allSettled([
        supabase
          .from('notes')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('quizzes')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('flashcard_sets')
          .select('id, title, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      ])

      const history: RecentItem[] = []

      if (allNotes.status === 'fulfilled' && allNotes.value.data) {
        history.push(...allNotes.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Note',
          type: 'note' as const,
          created_at: item.created_at
        })))
      }

      if (allQA.status === 'fulfilled' && allQA.value.data) {
        history.push(...allQA.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Quiz',
          type: 'qa' as const,
          created_at: item.created_at
        })))
      }

      if (allFlashcards.status === 'fulfilled' && allFlashcards.value.data) {
        history.push(...allFlashcards.value.data.map(item => ({
          id: item.id,
          title: item.title || 'Untitled Flashcard Set',
          type: 'flashcard' as const,
          created_at: item.created_at
        })))
      }

      history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setAllHistoryItems(history)
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="h-4 w-4" />
      case 'qa':
        return <HelpCircle className="h-4 w-4" />
      case 'flashcard':
        return <Layers className="h-4 w-4" />
      default:
        return null
    }
  }

  if (isLoading) {
    return <Loading message="Loading project overview..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadProjectData} className="bg-indigo-500 hover:bg-indigo-600">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const totalContent = counts.notes + counts.qa_pairs + counts.flashcards

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return formatDate(dateString)
  }

  return (
    <div className="flex-1 overflow-y-auto -m-6 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
            <p className="text-slate-500 mt-1">
              Track your learning progress and bridge knowledge gaps.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes Card */}
          <Link href={`/project/${projectId}/notes`}>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-yellow-50 rounded-xl text-yellow-600 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-5 h-5" />
                </div>
                <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${
                  changes.notes > 0 
                    ? 'text-green-600 bg-green-50 border-green-100' 
                    : 'text-slate-500 bg-slate-50 border-slate-100'
                }`}>
                  {changes.notes > 0 ? (
                    <><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{changes.notes}</>
                  ) : (
                    <><Minus className="w-3.5 h-3.5 mr-0.5" /> 0</>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-sm font-medium">Total Notes</p>
                <p className="text-3xl font-bold text-slate-900">{counts.notes}</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                <div 
                  className="bg-yellow-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalContent > 0 ? Math.min((counts.notes / totalContent) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Q&A Card */}
          <Link href={`/project/${projectId}/qa`}>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${
                  changes.qa_pairs > 0 
                    ? 'text-green-600 bg-green-50 border-green-100' 
                    : 'text-slate-500 bg-slate-50 border-slate-100'
                }`}>
                  {changes.qa_pairs > 0 ? (
                    <><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{changes.qa_pairs}</>
                  ) : (
                    <><Minus className="w-3.5 h-3.5 mr-0.5" /> 0</>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-sm font-medium">Q&A Pairs</p>
                <p className="text-3xl font-bold text-slate-900">{counts.qa_pairs}</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalContent > 0 ? Math.min((counts.qa_pairs / totalContent) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </Link>

          {/* Flashcards Card */}
          <Link href={`/project/${projectId}/flashcards`}>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-110 transition-transform duration-300">
                  <Layers className="w-5 h-5" />
                </div>
                <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${
                  changes.flashcards > 0 
                    ? 'text-green-600 bg-green-50 border-green-100' 
                    : 'text-slate-500 bg-slate-50 border-slate-100'
                }`}>
                  {changes.flashcards > 0 ? (
                    <><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{changes.flashcards}</>
                  ) : (
                    <><Minus className="w-3.5 h-3.5 mr-0.5" /> 0</>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-sm font-medium">Flashcards</p>
                <p className="text-3xl font-bold text-slate-900">{counts.flashcards}</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totalContent > 0 ? Math.min((counts.flashcards / totalContent) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Study Streak & Weekly Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Streak Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
              <Flame className="w-28 h-28 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Study Streak</h3>
            <div className="flex items-center gap-5 mb-8">
              <div className="size-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center ring-4 ring-white shadow-lg">
                <Flame className="w-9 h-9 text-orange-500 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{streak.currentStreak}</span>
                  <span className="text-lg font-medium text-slate-500">days</span>
                </div>
                <p className="text-sm font-medium text-orange-500">
                  {streak.currentStreak > 0 ? "You're on fire! 🔥" : "Start your streak today!"}
                </p>
              </div>
            </div>
            <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Best Streak</span>
              </div>
              <span className="text-base font-bold text-slate-900">{streak.longestStreak} days</span>
            </div>
          </div>

          {/* Weekly Activity Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Weekly Activity</h3>
                <p className="text-sm text-slate-500">Daily content created</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-teal-500"></span>
                <span className="text-xs font-medium text-slate-500">Current Week</span>
              </div>
            </div>
            <div className="flex-1 w-full h-[180px] relative">
              {/* Grid lines */}
              <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full h-px bg-slate-100" />
                ))}
              </div>
              
              {/* SVG Chart */}
              <svg 
                className="absolute inset-x-0 top-0 w-full h-[calc(100%-24px)]" 
                preserveAspectRatio="none" 
                viewBox="0 0 700 150"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {weeklyActivity.length > 0 && (() => {
                  const width = 700
                  const height = 150
                  const paddingX = 50
                  const paddingY = 20
                  const chartHeight = height - paddingY * 2
                  const chartWidth = width - paddingX * 2
                  const max = Math.max(...weeklyActivity.map(d => d.activity), 1)
                  
                  const pts = weeklyActivity.map((d, i) => ({
                    x: paddingX + (i / (weeklyActivity.length - 1 || 1)) * chartWidth,
                    y: paddingY + chartHeight - (d.activity / max) * chartHeight,
                    value: d.activity
                  }))

                  let line = `M${pts[0].x},${pts[0].y}`
                  for (let i = 1; i < pts.length; i++) {
                    line += ` L${pts[i].x},${pts[i].y}`
                  }
                  const area = `${line} L${pts[pts.length - 1].x},${height - paddingY} L${pts[0].x},${height - paddingY} Z`

                  return (
                    <>
                      <path d={area} fill="url(#chartGradient)" stroke="none" />
                      <path 
                        d={line} 
                        fill="none" 
                        stroke="#14b8a6" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="3" 
                        vectorEffect="non-scaling-stroke"
                      />
                      {pts.map((point, i) => (
                        <g key={i}>
                          <circle cx={point.x} cy={point.y} fill="white" r="6" stroke="#14b8a6" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                          {i === weeklyActivity.length - 1 && point.value > 0 && (
                            <>
                              <circle cx={point.x} cy={point.y} fill="rgba(20, 184, 166, 0.2)" r="12">
                                <animate attributeName="r" dur="2s" repeatCount="indefinite" values="8;14;8" />
                              </circle>
                            </>
                          )}
                        </g>
                      ))}
                    </>
                  )
                })()}
              </svg>
              
              {/* Day labels */}
              <div className="absolute bottom-0 w-full flex justify-between text-xs font-medium text-slate-400 px-2">
                {weeklyActivity.map((d, i) => (
                  <span 
                    key={i} 
                    className={`text-center ${i === weeklyActivity.length - 1 ? 'text-slate-900 font-bold' : ''}`}
                  >
                    {d.day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            <button 
              onClick={loadAllHistory}
              disabled={isLoadingHistory}
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingHistory ? 'Loading...' : 'View Full History'}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Layers className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No content yet</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by creating your first note, Q&A, or flashcard.</p>
              </div>
            ) : (
              recentItems.map((item) => (
                <Link 
                  key={`${item.type}-${item.id}`}
                  href={`/project/${projectId}/${item.type === 'note' ? 'notes' : item.type === 'qa' ? 'qa' : 'flashcards'}`}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`size-12 rounded-xl flex items-center justify-center border group-hover:scale-105 transition-transform ${
                        item.type === 'note' 
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-100' 
                          : item.type === 'qa' 
                          ? 'bg-blue-50 text-blue-600 border-blue-100' 
                          : 'bg-purple-50 text-purple-600 border-purple-100'
                      }`}>
                        {item.type === 'note' && <FileText className="w-5 h-5" />}
                        {item.type === 'qa' && <HelpCircle className="w-5 h-5" />}
                        {item.type === 'flashcard' && <Layers className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-0.5 group-hover:text-teal-600 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {project?.name} • {item.type === 'note' ? 'Notes' : item.type === 'qa' ? 'Q&A' : 'Flashcards'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        item.type === 'note' 
                          ? 'bg-slate-100 text-slate-600 border-slate-200' 
                          : item.type === 'qa' 
                          ? 'bg-slate-100 text-slate-600 border-slate-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`size-1.5 rounded-full ${
                          item.type === 'note' ? 'bg-yellow-500' : item.type === 'qa' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />
                        {item.type === 'note' ? 'Note' : item.type === 'qa' ? 'Quiz' : 'Flashcard'}
                      </span>
                      <span className="text-sm text-slate-400 font-medium">{getRelativeTime(item.created_at)}</span>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 hidden sm:block" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-500 to-teal-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Full Activity History</h2>
                  <p className="text-sm text-white/70">{allHistoryItems.length} items in {project?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {allHistoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Layers className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">No history yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Start creating content to see your activity history.</p>
                </div>
              ) : (
                allHistoryItems.map((item) => (
                  <Link 
                    key={`history-${item.type}-${item.id}`}
                    href={`/project/${projectId}/${item.type === 'note' ? 'notes' : item.type === 'qa' ? 'qa' : 'flashcards'}`}
                    onClick={() => setShowHistoryModal(false)}
                  >
                    <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center border ${
                          item.type === 'note' 
                            ? 'bg-yellow-50 text-yellow-600 border-yellow-100' 
                            : item.type === 'qa' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-purple-50 text-purple-600 border-purple-100'
                        }`}>
                          {item.type === 'note' && <FileText className="w-4 h-4" />}
                          {item.type === 'qa' && <HelpCircle className="w-4 h-4" />}
                          {item.type === 'flashcard' && <Layers className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {item.type === 'note' ? 'Note' : item.type === 'qa' ? 'Quiz' : 'Flashcard Set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}