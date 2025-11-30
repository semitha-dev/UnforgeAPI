'use client'

import type { User as SupabaseUser } from '@supabase/auth-js'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import Navbar from '@/app/components/Navbar'

interface Profile {
  name: string
  education_level: string
}

interface Project {
  id: string
  name: string
  description: string
  color: string
  created_at: string
  notes_count?: number
  qa_count?: number
  flashcards_count?: number
}

const projectColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', 
  '#10b981', '#06b6d4', '#3b82f6', '#0ea5e9', '#a855f7'
]

export default function Dashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: projectColors[0]
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserAndProjects()
  }, [])

  const loadUserAndProjects = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('Supabase getUser failed:', userError)
        router.push('/signin')
        return
      }

      if (!user) {
        router.push('/signin')
        return
      }

      setUser(user)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, education_level')
        .eq('id', user.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          router.push('/profile/setup')
          return
        }
        console.error('Profile fetch error:', profileError)
      }

      if (!profile) {
        router.push('/profile/setup')
        return
      }

      setProfile(profile)

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          notes(count),
          qa_pairs(count),
          flashcards(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Projects fetch error:', projectsError)
        setProjects([])
      } else if (projectsData) {
        const projectsWithCounts = projectsData.map((project: any) => ({
          ...project,
          notes_count: project.notes?.[0]?.count || 0,
          qa_count: project.qa_pairs?.[0]?.count || 0,
          flashcards_count: project.flashcards?.[0]?.count || 0
        }))
        setProjects(projectsWithCounts)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProject.name.trim() || !user) return

    setIsCreating(true)

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProject.name.trim(),
          description: newProject.description.trim(),
          color: newProject.color
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setProjects(prev => [{ ...data, notes_count: 0, qa_count: 0, flashcards_count: 0 }, ...prev])
      setNewProject({ name: '', description: '', color: projectColors[0] })
      setShowCreateModal(false)
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, {profile?.name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="text-lg text-gray-600">
                Continue your learning journey and achieve your goals
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="hidden lg:flex items-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
                <p className="text-sm font-medium text-gray-500">Projects</p>
              </div>
            </div>
            <div className="h-1 bg-linear-to-r from-indigo-500 to-indigo-600 rounded-full"></div>
          </div>

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {projects.reduce((sum, p) => sum + (p.notes_count || 0), 0)}
                </p>
                <p className="text-sm font-medium text-gray-500">Notes</p>
              </div>
            </div>
            <div className="h-1 bg-linear-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
          </div>

          <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {projects.reduce((sum, p) => sum + (p.flashcards_count || 0), 0)}
                </p>
                <p className="text-sm font-medium text-gray-500">Flashcards</p>
              </div>
            </div>
            <div className="h-1 bg-linear-to-r from-purple-500 to-purple-600 rounded-full"></div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
            <p className="text-gray-600 mt-1">Select a project to continue learning</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-linear-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create your first project to start organizing your study materials and track your progress.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatDate(project.created_at)}
                        </p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-10">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-medium">{project.notes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium">{project.qa_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-xs font-medium">{project.flashcards_count || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in">
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Create New Project</h3>
              <p className="text-gray-600 mt-1">Start organizing your learning materials</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="e.g., Mathematics 101"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder="Brief description of your project"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choose Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {projectColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => setNewProject(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-xl transition-all ${
                        newProject.color === color 
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newProject.name.trim()}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}