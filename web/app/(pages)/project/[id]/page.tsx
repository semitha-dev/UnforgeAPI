'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { FileText, HelpCircle, Layers, Clock, TrendingUp, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Loading } from '@/components/ui/loading'

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

export default function ProjectOverview() {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [counts, setCounts] = useState<ContentCounts>({ notes: 0, qa_pairs: 0, flashcards: 0 })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([])
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      setCounts({
        notes: (notesResult.status === 'fulfilled' ? notesResult.value.count : 0) || 0,
        qa_pairs: (qaResult.status === 'fulfilled' ? qaResult.value.count : 0) || 0,
        flashcards: (flashcardsResult.status === 'fulfilled' ? flashcardsResult.value.count : 0) || 0
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

      // Calculate weekly activity from recent items
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const today = new Date()
      const weekData: WeeklyActivity[] = []
      
      // Get all items with dates for activity calculation
      const allItems: { created_at: string }[] = []
      if (recentNotes.status === 'fulfilled' && recentNotes.value.data) {
        allItems.push(...recentNotes.value.data)
      }
      if (recentQA.status === 'fulfilled' && recentQA.value.data) {
        allItems.push(...recentQA.value.data)
      }
      if (recentFlashcards.status === 'fulfilled' && recentFlashcards.value.data) {
        allItems.push(...recentFlashcards.value.data)
      }
      
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
          activity: dayActivity * 20 + Math.random() * 30 + 20 // Scale and add some variance for visual appeal
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-600">
          {project?.description || 'Track your progress and manage your study materials'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href={`/project/${projectId}/notes`}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-white rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-medium">Notes</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{counts.notes}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/project/${projectId}/qa`}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-white rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-medium">Q&A Pairs</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{counts.qa_pairs}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/project/${projectId}/flashcards`}>
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-white rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 font-medium">Flashcards</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{counts.flashcards}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Layers className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Streak Card */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium">Study Streak</p>
                <p className="text-2xl font-bold text-white mt-1">{streak.currentStreak} days</p>
                <p className="text-xs text-white/60 mt-1">Best: {streak.longestStreak} days</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Flame className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card className="border-0 shadow-lg bg-white rounded-2xl mb-8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800">Weekly Activity</CardTitle>
            <span className="text-sm text-gray-400">This Week</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F8CF7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4F8CF7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#4F8CF7', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ color: 'white', fontWeight: 'bold' }}
                  formatter={(value?: number) => [`${(value ?? 0).toFixed(2)}`, 'Activity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="activity" 
                  stroke="#4F8CF7" 
                  strokeWidth={2}
                  fill="url(#activityGradient)"
                  dot={{ fill: '#4F8CF7', strokeWidth: 2, r: 4, stroke: 'white' }}
                  activeDot={{ fill: '#4F8CF7', strokeWidth: 2, r: 6, stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">No content yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first note, Q&A, or flashcard.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.type === 'note' ? 'bg-blue-100 text-blue-600' :
                      item.type === 'qa' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {getItemIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">{item.type}</span>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                    <Badge className={`${
                      item.type === 'note' ? 'bg-blue-100 text-blue-700' :
                      item.type === 'qa' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'note' ? 'Note' : item.type === 'qa' ? 'Q&A' : 'Flashcard'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}