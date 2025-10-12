'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient' // Adjust path as needed
import ProjectLayout from './layout'

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

export default function ProjectOverview() {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [counts, setCounts] = useState<ContentCounts>({ notes: 0, qa_pairs: 0, flashcards: 0 })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
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
        supabase.from('qa_pairs').select('id', { count: 'exact' }).eq('project_id', projectId),
        supabase.from('flashcards').select('id', { count: 'exact' }).eq('project_id', projectId)
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
          .from('qa_pairs')
          .select('id, question, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('flashcards')
          .select('id, front, created_at')
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

      // Add Q&A pairs
      if (recentQA.status === 'fulfilled' && recentQA.value.data) {
        recent.push(...recentQA.value.data.map(item => ({
          id: item.id,
          title: item.question || 'Untitled Question',
          type: 'qa' as const,
          created_at: item.created_at
        })))
      }

      // Add flashcards
      if (recentFlashcards.status === 'fulfilled' && recentFlashcards.value.data) {
        recent.push(...recentFlashcards.value.data.map(item => ({
          id: item.id,
          title: item.front || 'Untitled Flashcard',
          type: 'flashcard' as const,
          created_at: item.created_at
        })))
      }

      // Sort by creation date and take most recent 6
      recent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentItems(recent.slice(0, 6))

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
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'qa':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'flashcard':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project overview...</p>
          </div>
        </div>
      </ProjectLayout>
    )
  }

  if (error) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadProjectData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </ProjectLayout>
    )
  }

  return (
    <ProjectLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Overview</h1>
          <p className="text-gray-600">
            {project?.description || 'Track your progress and manage your study materials'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href={`/project/${projectId}/notes`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="text-2xl font-bold text-gray-900">{counts.notes}</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/project/${projectId}/qa`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Q&A Pairs</p>
                <p className="text-2xl font-bold text-gray-900">{counts.qa_pairs}</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/project/${projectId}/flashcards`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Flashcards</p>
                <p className="text-2xl font-bold text-gray-900">{counts.flashcards}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/project/${projectId}/notes`}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Create Note</span>
              </Link>

              <Link
                href={`/project/${projectId}/qa`}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-6 h-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Add Q&A</span>
              </Link>

              <Link
                href={`/project/${projectId}/flashcards`}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <svg className="w-6 h-6 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-gray-900">Create Flashcard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            {recentItems.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No content yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first note, Q&A, or flashcard.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.type === 'note' ? 'bg-blue-100 text-blue-600' :
                        item.type === 'qa' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {getItemIcon(item.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.type} • {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProjectLayout>
  )
}