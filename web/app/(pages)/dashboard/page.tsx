'use client'

import type { User as SupabaseUser } from '@supabase/auth-js'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  LayoutDashboard, Settings, ChevronLeft, Menu, Coins, LogOut,
  BookOpen, GraduationCap, FlaskConical, Calculator, Globe, Code, Music, 
  Palette, Camera, Dumbbell, Heart, Star, Lightbulb, Rocket, Trophy,
  Brain, Atom, Languages, PenTool, Microscope, Scale, Briefcase, Coffee,
  MoreVertical, Pencil, Trash2, Leaf
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loading } from '@/components/ui/loading'
import { TokenPurchaseModal } from '@/components/ui/token-purchase-modal'
import { useTokenSync } from '@/lib/useTokenRefresh'

interface Profile {
  name: string
  education_level: string
  tokens_balance?: number
}

interface Project {
  id: string
  name: string
  description: string
  color: string
  icon?: string
  created_at: string
  notes_count?: number
  qa_count?: number
  flashcards_count?: number
}

// Available project icons
const projectIcons = [
  { name: 'book', icon: BookOpen, label: 'Book' },
  { name: 'graduation', icon: GraduationCap, label: 'Education' },
  { name: 'flask', icon: FlaskConical, label: 'Science' },
  { name: 'calculator', icon: Calculator, label: 'Math' },
  { name: 'globe', icon: Globe, label: 'Geography' },
  { name: 'code', icon: Code, label: 'Programming' },
  { name: 'music', icon: Music, label: 'Music' },
  { name: 'palette', icon: Palette, label: 'Art' },
  { name: 'camera', icon: Camera, label: 'Photography' },
  { name: 'dumbbell', icon: Dumbbell, label: 'Fitness' },
  { name: 'heart', icon: Heart, label: 'Health' },
  { name: 'star', icon: Star, label: 'Favorites' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Ideas' },
  { name: 'rocket', icon: Rocket, label: 'Projects' },
  { name: 'trophy', icon: Trophy, label: 'Goals' },
  { name: 'brain', icon: Brain, label: 'Psychology' },
  { name: 'atom', icon: Atom, label: 'Physics' },
  { name: 'languages', icon: Languages, label: 'Languages' },
  { name: 'pen', icon: PenTool, label: 'Writing' },
  { name: 'microscope', icon: Microscope, label: 'Biology' },
  { name: 'scale', icon: Scale, label: 'Law' },
  { name: 'briefcase', icon: Briefcase, label: 'Business' },
  { name: 'coffee', icon: Coffee, label: 'Casual' },
  { name: 'leaf', icon: Leaf, label: 'Nature' },
]

const projectColors = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#6366F1', '#A855F7', '#F43F5E',
  '#14B8A6', '#0EA5E9', '#84CC16', '#FB923C', '#4A7C59'
]

const sidebarItems = [
  { name: 'Projects', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Dashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: projectColors[0],
    icon: 'book'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Project menu states
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Check if returning from checkout and subscribe to realtime token updates
  useTokenSync(user?.id)

  useEffect(() => {
    loadUserAndProjects()
  }, [])

  // Listen for token updates (e.g., after purchase)
  useEffect(() => {
    const handleTokensUpdated = async () => {
      console.log('[Dashboard] Token update event received, fetching fresh balance...')
      try {
        const timestamp = Date.now()
        const subscriptionRes = await fetch(`/api/subscription?_t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          const newBalance = subscriptionData.subscription?.tokens_balance || 0
          console.log('[Dashboard] Fresh token balance:', newBalance)
          setProfile(prev => prev ? {
            ...prev,
            tokens_balance: newBalance
          } : null)
        }
      } catch (err) {
        console.error('Error refreshing token balance:', err)
      }
    }

    window.addEventListener('tokensUpdated', handleTokensUpdated)
    return () => window.removeEventListener('tokensUpdated', handleTokensUpdated)
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

      // Fetch valid token balance
      let validTokenBalance = 0
      try {
        const timestamp = Date.now()
        const subscriptionRes = await fetch(`/api/subscription?_t=${timestamp}`, { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          validTokenBalance = subscriptionData.subscription?.tokens_balance || 0
          console.log('[Dashboard] Initial token balance:', validTokenBalance)
        }
      } catch (err) {
        console.error('Error fetching token balance:', err)
      }

      setProfile({
        ...profile,
        tokens_balance: validTokenBalance
      })

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
          color: newProject.color,
          icon: newProject.icon
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      setProjects(prev => [{ ...data, notes_count: 0, qa_count: 0, flashcards_count: 0 }, ...prev])
      setNewProject({ name: '', description: '', color: projectColors[0], icon: 'book' })
      setShowCreateModal(false)
    } catch (error: any) {
      console.error('Error creating project:', error)
      alert(error.message || 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject({ ...project })
    setShowEditModal(true)
    setMenuOpenFor(null)
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject?.name.trim()) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editingProject.name.trim(),
          description: editingProject.description?.trim() || '',
          color: editingProject.color,
          icon: editingProject.icon
        })
        .eq('id', editingProject.id)

      if (error) throw error

      setProjects(prev => prev.map(p => 
        p.id === editingProject.id 
          ? { ...p, name: editingProject.name.trim(), description: editingProject.description?.trim() || '', color: editingProject.color, icon: editingProject.icon }
          : p
      ))
      setShowEditModal(false)
      setEditingProject(null)
    } catch (error: any) {
      console.error('Error updating project:', error)
      alert(error.message || 'Failed to update project')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!editingProject) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', editingProject.id)

      if (error) throw error

      setProjects(prev => prev.filter(p => p.id !== editingProject.id))
      setShowDeleteModal(false)
      setEditingProject(null)
    } catch (error: any) {
      console.error('Error deleting project:', error)
      alert(error.message || 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteModal = (project: Project) => {
    setEditingProject(project)
    setShowDeleteModal(true)
    setMenuOpenFor(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const isActiveRoute = (href: string) => {
    return pathname === href
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#F5F6FA]">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 bg-white transition-all duration-300 shadow-sm ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex flex-col h-full">
            {/* Logo / Brand */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-gray-100">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className="text-lg font-bold text-emerald-600">LeafLearning</span>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              )}
              <button className="lg:hidden h-8 w-8 text-gray-400" onClick={() => setMobileMenuOpen(false)}>
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 pt-6">
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = isActiveRoute(item.href)
                  const Icon = item.icon

                  return sidebarCollapsed ? (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#3B82F6] rounded-r-full" style={{ marginLeft: '-16px' }} />
                          )}
                          <div className={`flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.name}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#3B82F6] rounded-r-full" style={{ marginLeft: '-16px' }} />
                      )}
                      <div className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-[#3B82F6] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Token Balance Section */}
            <div className="px-4 py-3 border-t border-gray-100">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowTokenModal(true)} className="flex items-center justify-center w-full h-11 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                      <Coins className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{profile?.tokens_balance ?? 0} Tokens</p>
                    <p className="text-xs text-gray-400">Click to buy more</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Tokens</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{profile?.tokens_balance ?? 0}</span>
                  </div>
                  <button onClick={() => setShowTokenModal(true)} className="flex items-center justify-center w-full py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                    Buy Tokens
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="px-4 py-3 border-t border-gray-100">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center w-full h-11 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Log out</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              )}
            </div>

            {/* Collapse button */}
            <div className="px-4 py-4 border-t border-gray-100 hidden lg:block">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center justify-center w-full h-10 rounded-xl text-gray-400 hover:bg-gray-100 transition-all"
              >
                <ChevronLeft className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]'}`}>
          {/* Top Bar */}
          <div className="sticky top-0 z-30 bg-[#F5F6FA]/80 backdrop-blur-sm border-b border-gray-200/50">
            <div className="flex items-center justify-between h-16 px-6">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Centered Search Bar */}
              <div className="flex-1 max-w-2xl mx-auto px-4">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* New Project Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-xl hover:bg-[#2563EB] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Project
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">
            {isLoading ? (
              <Loading message="Loading..." />
            ) : (
              <>
            {/* Header */}
            <div className="mb-8">
              <p className="text-gray-500 text-sm mb-1">{getGreeting()}</p>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.name?.split(' ')[0] || 'Welcome'}
              </h1>
            </div>

            {/* Projects Section Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="sm:hidden flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-xl hover:bg-[#2563EB] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New
              </button>
            </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No projects yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first project to start organizing your study materials.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] text-white text-sm font-medium rounded-xl hover:bg-[#2563EB] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {projects
              .filter(project => 
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((project) => (
              <div
                key={project.id}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col min-h-[280px] hover:-translate-y-1 hover:shadow-xl bg-white border border-gray-200"
              >
                {/* Three-dot menu button */}
                <div className="absolute top-2 right-2 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpenFor(menuOpenFor === project.id ? null : project.id)
                    }}
                    className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {menuOpenFor === project.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenFor(null)
                        }} 
                      />
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEditProject(project)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-none"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openDeleteModal(project)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-none"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <Link
                  href={`/project/${project.id}`}
                  className="flex flex-col flex-1"
                >
                {/* Colored top section - user's designated project color */}
                <div 
                  className="relative h-36 w-full transition-all duration-300 group-hover:h-40 flex items-center justify-center"
                  style={{ backgroundColor: project.color }}
                >
                  {/* Subtle pattern overlay */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{ 
                      backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
                      backgroundSize: '30px 30px'
                    }}
                  />
                  {/* Project Icon */}
                  {(() => {
                    const iconData = projectIcons.find(i => i.name === project.icon) || projectIcons[0]
                    const IconComponent = iconData.icon
                    return (
                      <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                    )
                  })()}
                </div>
                
                {/* Content section */}
                <div className="flex flex-col flex-1 p-4 bg-[#2A2A2A]">
                  {/* Project name as headline */}
                  <h3 className="font-bold text-white text-base mb-1 line-clamp-1">
                    {project.name}
                  </h3>
                  
                  {/* Description as subhead */}
                  <p className="text-gray-300 text-sm mb-2 line-clamp-1">
                    {project.description || 'No description'}
                  </p>
                  
                  {/* Stats/content */}
                  <p className="text-gray-400 text-xs line-clamp-2 mt-auto">
                    {project.notes_count || 0} notes • {project.qa_count || 0} Q&A • {project.flashcards_count || 0} flashcards
                  </p>
                </div>
              </Link>
              </div>
            ))}
            {projects.length > 0 && projects.filter(p => 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="col-span-full text-center py-12">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-sm">No projects found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
              </>
            )}
          </div>
        </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/20">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">New Project</h3>
              <p className="text-sm text-gray-500 mt-1">Create a new project to organize your studies</p>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all"
                  placeholder="e.g., Mathematics 101"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all resize-none"
                  rows={3}
                  placeholder="Brief description (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => setNewProject(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        newProject.color === color 
                          ? 'ring-2 ring-offset-2 ring-[#3B82F6] scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 -m-1 border border-gray-100 rounded-xl">
                  {projectIcons.map((iconItem) => {
                    const IconComponent = iconItem.icon
                    return (
                      <Tooltip key={iconItem.name}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setNewProject(prev => ({ ...prev, icon: iconItem.name }))}
                            className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                              newProject.icon === iconItem.name 
                                ? 'ring-2 ring-offset-2 ring-[#3B82F6] scale-110 bg-gray-100' 
                                : 'hover:scale-105 hover:bg-gray-50'
                            }`}
                          >
                            <IconComponent className="w-4 h-4 text-gray-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {iconItem.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newProject.name.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#3B82F6] rounded-xl hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token Purchase Modal */}
      <TokenPurchaseModal 
        isOpen={showTokenModal} 
        onClose={() => setShowTokenModal(false)}
        currentBalance={profile?.tokens_balance ?? 0}
      />

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/20">
            <button
              onClick={() => {
                setShowEditModal(false)
                setEditingProject(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Project</h3>
              <p className="text-sm text-gray-500 mt-1">Update your project details</p>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-4 py-2.5 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition-all resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {projectColors.map((color, index) => (
                    <button
                      key={`edit-${color}-${index}`}
                      type="button"
                      onClick={() => setEditingProject(prev => prev ? { ...prev, color } : null)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        editingProject.color === color 
                          ? 'ring-2 ring-offset-2 ring-[#3B82F6] scale-110' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="grid grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 -m-1 border border-gray-100 rounded-xl">
                  {projectIcons.map((iconItem) => {
                    const IconComponent = iconItem.icon
                    return (
                      <Tooltip key={`edit-icon-${iconItem.name}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setEditingProject(prev => prev ? { ...prev, icon: iconItem.name } : null)}
                            className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                              editingProject.icon === iconItem.name 
                                ? 'ring-2 ring-offset-2 ring-[#3B82F6] scale-110 bg-gray-100' 
                                : 'hover:scale-105 hover:bg-gray-50'
                            }`}
                          >
                            <IconComponent className="w-4 h-4 text-gray-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {iconItem.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editingProject.name.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#3B82F6] rounded-xl hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && editingProject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{editingProject.name}"</span>? This will permanently remove:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>All notes in this project</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>All Q&A pairs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>All flashcards</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setEditingProject(null)
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Project</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
