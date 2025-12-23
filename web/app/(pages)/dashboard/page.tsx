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
  MoreVertical, Pencil, Trash2, Leaf, Search, Plus, Calendar, FileText, HelpCircle, Layers
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loading } from '@/components/ui/loading'
import { useTokenSync } from '@/lib/useTokenRefresh'
import { TokenPurchaseModal } from '@/components/ui/token-purchase-modal'

// --- Types ---
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

// --- Constants ---
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
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', 
  '#F59E0B', '#06B6D4', '#6366F1', '#A855F7', '#F43F5E',
  '#14B8A6', '#0EA5E9', '#84CC16', '#FB923C', '#4A7C59'
]

const sidebarItems = [
  { name: 'Projects', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function Dashboard() {
  // --- State ---
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form State
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: projectColors[0],
    icon: 'book'
  })
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Project Menu State
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useTokenSync(user?.id)

  // --- Effects ---
  useEffect(() => {
    loadUserAndProjects()
  }, [])

  useEffect(() => {
    const handleTokensUpdated = async () => {
      try {
        const timestamp = Date.now()
        const subscriptionRes = await fetch(`/api/subscription?_t=${timestamp}`, { cache: 'no-store' })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          setProfile(prev => prev ? { ...prev, tokens_balance: subscriptionData.subscription?.tokens_balance || 0 } : null)
        }
      } catch (err) {
        console.error('Error refreshing token balance:', err)
      }
    }
    window.addEventListener('tokensUpdated', handleTokensUpdated)
    return () => window.removeEventListener('tokensUpdated', handleTokensUpdated)
  }, [])

  // --- Data Loading ---
  const loadUserAndProjects = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/signin')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, education_level')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Fetch tokens
        let validTokenBalance = 0
        try {
          const res = await fetch(`/api/subscription?_t=${Date.now()}`)
          if (res.ok) {
            const data = await res.json()
            validTokenBalance = data.subscription?.tokens_balance || 0
          }
        } catch (e) {}
        
        setProfile({ ...profile, tokens_balance: validTokenBalance })
      } else {
         router.push('/profile/setup')
         return
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select(`*, notes(count), qa_pairs(count), flashcards(count)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (projectsData) {
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

  // --- Handlers ---
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.name.trim() || !user) return
    setIsCreating(true)
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setProjects(prev => [{ ...data, notes_count: 0, qa_count: 0, flashcards_count: 0 }, ...prev])
      setNewProject({ name: '', description: '', color: projectColors[0], icon: 'book' })
      setShowCreateModal(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject?.name.trim()) return
    setIsUpdating(true)
    try {
      const { error } = await supabase.from('projects').update({
        name: editingProject.name.trim(),
        description: editingProject.description?.trim() || '',
        color: editingProject.color,
        icon: editingProject.icon
      }).eq('id', editingProject.id)
      if (error) throw error
      setProjects(prev => prev.map(p => p.id === editingProject.id ? editingProject : p))
      setShowEditModal(false)
      setEditingProject(null)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!editingProject) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('projects').delete().eq('id', editingProject.id)
      if (error) throw error
      setProjects(prev => prev.filter(p => p.id !== editingProject.id))
      setShowDeleteModal(false)
      setEditingProject(null)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // --- Render Helpers ---
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/50">
        
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[80px]' : 'w-[260px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex flex-col h-full py-6 px-4">
            
            {/* Logo */}
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-2'} mb-10`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <span className="ml-3 text-xl font-bold text-gray-800 tracking-tight">LeafLearning</span>
              )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link 
                    key={item.name} 
                    href={item.href} 
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-4'} py-3.5 rounded-2xl transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-emerald-50 text-emerald-600 font-medium' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon className={`h-[22px] w-[22px] ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
                    {isActive && !sidebarCollapsed && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              {/* Token Balance */}
              <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-lg">{profile?.tokens_balance ?? 0}</span>
                </div>
                <div className="text-xs text-blue-100 mb-3 font-medium">Available Tokens</div>
                <button onClick={() => setShowTokenModal(true)} className="w-full py-2 bg-white text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors">
                  Get More
                </button>
              </div>

              {/* Collapsed Token Icon */}
              {sidebarCollapsed && (
                <button onClick={() => setShowTokenModal(true)} className="w-full flex justify-center p-3 text-blue-600 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors">
                  <Coins className="h-6 w-6" />
                </button>
              )}

              {/* Logout */}
              <button onClick={handleLogout} className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} w-full py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all`}>
                <LogOut className="h-5 w-5" />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Log out</span>}
              </button>
              
              {/* Collapse Toggle */}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex items-center justify-center w-full py-2 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[80px]' : 'lg:ml-[260px]'}`}>
          
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:hidden">
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600">
                <Menu className="h-6 w-6" />
              </button>
              <Leaf className="h-6 w-6 text-emerald-500" />
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl relative hidden md:block group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search your projects..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{profile?.name || 'Student'}</p>
                <p className="text-xs text-gray-500">{profile?.education_level || 'Lifelong Learner'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                {profile?.name?.[0] || 'U'}
              </div>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{getGreeting()}, {profile?.name?.split(' ')[0]}</h1>
                <p className="text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 font-medium"
              >
                <Plus className="h-5 w-5" />
                <span>New Project</span>
              </button>
            </div>

            {/* Content Grid */}
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[60vh]"><Loading message="Loading dashboard..." fullScreen={false} /></div>
            ) : filteredProjects.length === 0 ? (
              
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-100 border-dashed">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <Layers className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-500 max-w-md mb-8">
                  {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : "Get started by creating your first project to organize your notes and flashcards."}
                </p>
                {!searchQuery && (
                  <button onClick={() => setShowCreateModal(true)} className="text-emerald-600 font-medium hover:underline">
                    Create a project now
                  </button>
                )}
              </div>

            ) : (
              
              /* Projects Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id}
                    className="group relative bg-white rounded-3xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* Card Actions */}
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === project.id ? null : project.id) }}
                        className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-gray-900"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {/* Context Menu */}
                      {menuOpenFor === project.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenFor(null)} />
                          <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-20">
                            <button onClick={() => { setEditingProject(project); setShowEditModal(true); setMenuOpenFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                              <Pencil className="h-4 w-4" /> Edit
                            </button>
                            <button onClick={() => { setEditingProject(project); setShowDeleteModal(true); setMenuOpenFor(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <Link href={`/project/${project.id}`} className="flex-1 p-6 flex flex-col h-full">
                      {/* Icon & Decor */}
                      <div className="flex justify-between items-start mb-6">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
                          style={{ backgroundColor: project.color }}
                        >
                          {(() => {
                            const IconComp = projectIcons.find(i => i.name === project.icon)?.icon || BookOpen
                            return <IconComp className="h-7 w-7" />
                          })()}
                        </div>
                      </div>

                      {/* Text Content */}
                      <div className="mb-6">
                        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 h-10">
                          {project.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Stats Footer */}
                      <div className="mt-auto pt-4 border-t border-gray-50 grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-xl bg-gray-50 group-hover:bg-emerald-50/50 transition-colors">
                          <div className="text-xs text-gray-400 mb-1 flex justify-center"><FileText className="h-3 w-3" /></div>
                          <div className="font-bold text-gray-700">{project.notes_count}</div>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-gray-50 group-hover:bg-emerald-50/50 transition-colors">
                          <div className="text-xs text-gray-400 mb-1 flex justify-center"><HelpCircle className="h-3 w-3" /></div>
                          <div className="font-bold text-gray-700">{project.qa_count}</div>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-gray-50 group-hover:bg-emerald-50/50 transition-colors">
                          <div className="text-xs text-gray-400 mb-1 flex justify-center"><Layers className="h-3 w-3" /></div>
                          <div className="font-bold text-gray-700">{project.flashcards_count}</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* --- MODALS --- */}
        
        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {showEditModal ? 'Edit Project' : 'Create New Project'}
                </h2>
                <button 
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"
                >
                  <Plus className="h-6 w-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={showEditModal ? handleUpdateProject : handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                  <input
                    type="text"
                    required
                    value={showEditModal ? editingProject?.name : newProject.name}
                    onChange={(e) => showEditModal 
                      ? setEditingProject(prev => prev ? {...prev, name: e.target.value} : null)
                      : setNewProject(prev => ({...prev, name: e.target.value}))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="e.g., Biology 101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={showEditModal ? editingProject?.description : newProject.description}
                    onChange={(e) => showEditModal 
                      ? setEditingProject(prev => prev ? {...prev, description: e.target.value} : null)
                      : setNewProject(prev => ({...prev, description: e.target.value}))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none h-24"
                    placeholder="What is this project about?"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Color Code</label>
                  <div className="flex flex-wrap gap-3">
                    {projectColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => showEditModal 
                          ? setEditingProject(prev => prev ? {...prev, color} : null)
                          : setNewProject(prev => ({...prev, color}))
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          (showEditModal ? editingProject?.color : newProject.color) === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Icon</label>
                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-xl custom-scrollbar">
                    {projectIcons.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => showEditModal 
                          ? setEditingProject(prev => prev ? {...prev, icon: name} : null)
                          : setNewProject(prev => ({...prev, icon: name}))
                        }
                        className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                          (showEditModal ? editingProject?.icon : newProject.icon) === name
                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isCreating || isUpdating ? <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin" /> : (showEditModal ? 'Save Changes' : 'Create Project')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Project?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900">"{editingProject?.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token Purchase Modal (Keep your existing component) */}
        {showTokenModal && (
          <TokenPurchaseModal 
            isOpen={showTokenModal} 
            onClose={() => setShowTokenModal(false)} 
            currentBalance={profile?.tokens_balance || 0}
          />
        )}

      </div>
    </TooltipProvider>
  )
}