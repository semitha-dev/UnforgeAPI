'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  LayoutDashboard, Settings, Menu, LogOut, Key, FileText, CreditCard, BarChart3,
  ChevronDown, Plus, Building2, Check, Loader2
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Workspace {
  id: string
  name: string
  slug: string
  owner_id: string
  description?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<{ name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fetchedRef = useRef(false)
  
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      loadUserData()
      loadWorkspaces()
    }
  }, [])

  // Close workspace menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadUserData = async () => {
    try {
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
      
      if (profileData) {
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces')
      const data = await response.json()
      
      if (response.ok) {
        setWorkspaces(data.workspaces || [])
        
        // Set current workspace
        if (data.defaultWorkspaceId) {
          const defaultWs = data.workspaces?.find((w: Workspace) => w.id === data.defaultWorkspaceId)
          if (defaultWs) {
            setCurrentWorkspace(defaultWs)
          } else if (data.workspaces?.length > 0) {
            setCurrentWorkspace(data.workspaces[0])
          }
        } else if (data.workspaces?.length > 0) {
          setCurrentWorkspace(data.workspaces[0])
        }
      }
    } catch (error) {
      console.error('Error loading workspaces:', error)
    }
  }

  const switchWorkspace = async (workspace: Workspace) => {
    try {
      // Update default workspace in backend
      await fetch('/api/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id, setDefault: true })
      })
      
      setCurrentWorkspace(workspace)
      setWorkspaceMenuOpen(false)
      
      // Refresh the page to load new workspace data
      router.refresh()
    } catch (error) {
      console.error('Error switching workspace:', error)
    }
  }

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return
    
    setIsCreatingWorkspace(true)
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDescription
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Add new workspace to list and switch to it
        setWorkspaces(prev => [data.workspace, ...prev])
        setCurrentWorkspace(data.workspace)
        setShowNewWorkspaceModal(false)
        setNewWorkspaceName('')
        setNewWorkspaceDescription('')
        setWorkspaceMenuOpen(false)
        
        // Set as default
        await fetch('/api/workspaces', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: data.workspace.id, setDefault: true })
        })
        
        router.refresh()
      } else {
        alert(data.error || 'Failed to create workspace')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      alert('Failed to create workspace')
    } finally {
      setIsCreatingWorkspace(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/keys', icon: Key, label: 'API Keys' },
    { href: '/dashboard/usage', icon: BarChart3, label: 'Usage' },
    { href: '/docs', icon: FileText, label: 'Documentation' },
    { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-neutral-800">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/new_logo.png" alt="UnforgeAPI" width={32} height={32} className="object-contain" />
              <span className="text-xl font-bold text-white">UnforgeAPI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Workspace Switcher */}
          <div className="p-4 border-t border-neutral-800" ref={workspaceMenuRef}>
            <div className="relative">
              <button
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {currentWorkspace?.name || 'Select Workspace'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {currentWorkspace?.slug || 'No workspace'}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Workspace Dropdown */}
              <AnimatePresence>
                {workspaceMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {workspaces.map((workspace) => (
                        <button
                          key={workspace.id}
                          onClick={() => switchWorkspace(workspace)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            currentWorkspace?.id === workspace.id
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 truncate text-sm">{workspace.name}</span>
                          {currentWorkspace?.id === workspace.id && (
                            <Check className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-neutral-700">
                      <button
                        onClick={() => {
                          setWorkspaceMenuOpen(false)
                          setShowNewWorkspaceModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-violet-400 hover:bg-violet-500/10 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">New Workspace</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-neutral-800">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                {profile?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile?.name || 'Developer'}</p>
              </div>
              <button onClick={handleSignOut} className="p-2 text-neutral-400 hover:text-white transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* New Workspace Modal */}
      <AnimatePresence>
        {showNewWorkspaceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowNewWorkspaceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-white mb-4">Create New Workspace</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Workspaces help you organize API keys and usage for different projects or teams.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g., Production, Staging, My App"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    placeholder="Brief description of this workspace..."
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="flex-1 px-4 py-3 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkspace}
                  disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                  className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingWorkspace ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Workspace
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-neutral-400 lg:hidden">
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-white">
              {navItems.find(item => pathname === item.href)?.label || 'Dashboard'}
            </h1>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
