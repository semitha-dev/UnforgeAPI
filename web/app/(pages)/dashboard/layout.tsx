'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  LayoutDashboard, Settings, Menu, LogOut, Key, FileText, CreditCard, BarChart3,
  ChevronDown, Plus, Building2, Check, Loader2, Sparkles, HelpCircle, ExternalLink
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

type SubscriptionTier = 'free' | 'managed_pro' | 'managed_expert' | 'byok_pro' | 'pro' | 'sandbox'

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
  
  const [profile, setProfile] = useState<{ name: string; subscription_tier?: SubscriptionTier } | null>(null)
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Debug helper
  const debug = (tag: string, data: any) => {
    console.log(`%c[DashboardLayout:${tag}]`, 'color: #F59E0B; font-weight: bold', data)
  }

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      debug('mount', { timestamp: new Date().toISOString() })
      // Load user data first, then workspaces (workspaces API needs auth)
      loadUserData().then(() => {
        debug('mount:userDataLoaded', { loadingWorkspaces: true })
        loadWorkspaces()
      })
    }
  }, [])

  // Close workspace menu and user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debug workspace state changes
  useEffect(() => {
    debug('workspaceState:changed', {
      workspacesCount: workspaces.length,
      workspaces: workspaces.map(w => ({ id: w.id, name: w.name })),
      currentWorkspace: currentWorkspace ? { id: currentWorkspace.id, name: currentWorkspace.name } : null
    })
  }, [workspaces, currentWorkspace])

  const loadUserData = async () => {
    debug('loadUserData:start', {})
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      debug('loadUserData:auth', { hasUser: !!user, userId: user?.id, error: authError?.message })
      
      if (!user) {
        debug('loadUserData:noUser', { redirecting: '/signin' })
        router.push('/signin')
        return
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, subscription_tier')
        .eq('id', user.id)
        .single()
      
      debug('loadUserData:profile', { 
        hasProfile: !!profileData, 
        subscription_tier: profileData?.subscription_tier,
        error: profileError?.message 
      })
      
      if (profileData) {
        setProfile(profileData)
      }
    } catch (error) {
      debug('loadUserData:error', { error })
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWorkspaces = async () => {
    debug('loadWorkspaces:start', {})
    try {
      const response = await fetch('/api/workspaces')
      debug('loadWorkspaces:response', { status: response.status, ok: response.ok })
      const data = await response.json()
      debug('loadWorkspaces:data', { 
        workspaces: data.workspaces?.length || 0, 
        defaultWorkspaceId: data.defaultWorkspaceId,
        rawData: data 
      })
      
      if (response.ok) {
        const workspaceList = data.workspaces || []
        debug('loadWorkspaces:setting', { workspaceCount: workspaceList.length })
        setWorkspaces(workspaceList)
        
        // Set current workspace - prioritize default, then first available
        if (workspaceList.length > 0) {
          if (data.defaultWorkspaceId) {
            const defaultWs = workspaceList.find((w: Workspace) => w.id === data.defaultWorkspaceId)
            debug('loadWorkspaces:defaultWs', { found: !!defaultWs, defaultId: data.defaultWorkspaceId })
            setCurrentWorkspace(defaultWs || workspaceList[0])
          } else {
            debug('loadWorkspaces:noDefault', { usingFirst: workspaceList[0]?.name })
            setCurrentWorkspace(workspaceList[0])
          }
        } else {
          debug('loadWorkspaces:noWorkspaces', { message: 'No workspaces found' })
        }
      } else {
        debug('loadWorkspaces:apiError', { error: data.error })
      }
    } catch (error) {
      debug('loadWorkspaces:error', { error })
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-neutral-800 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-neutral-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/reallogo.png" alt="UnforgeAPI" width={44} height={44} className="object-contain" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 custom-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? 'bg-[#0f0f0f] text-white font-medium' 
                      : 'text-neutral-400 hover:bg-[#1a1a1a] hover:text-gray-200'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Support & Documentation Links */}
          <div className="px-3 pb-4">
            <div className="space-y-0.5 mb-2">
              <a
                href="mailto:support@unforgeapi.com"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 hover:bg-[#1a1a1a] hover:text-gray-200 transition-colors group"
              >
                <HelpCircle className="h-5 w-5 group-hover:text-gray-300" />
                <span className="text-sm font-medium">Support</span>
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 hover:bg-[#1a1a1a] hover:text-gray-200 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:text-gray-300" />
                <span className="text-sm font-medium">Documentation</span>
              </a>
            </div>
          </div>

          {/* Upgrade Button - Show for non-pro users */}
          {(!profile?.subscription_tier || profile.subscription_tier === 'free' || profile.subscription_tier === 'sandbox') && (
            <div className="px-3 pb-2">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-md transition-all font-medium text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* Workspace Selector (Bottom) */}
          <div className="px-3 pb-4 border-t border-neutral-800">
            <div className="relative pt-3" ref={workspaceMenuRef}>
              <button
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#1a1a1a] transition-colors group text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-neutral-800 flex items-center justify-center overflow-hidden">
                  <Building2 className="h-4 w-4 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {currentWorkspace?.name || (workspaces.length > 0 ? workspaces[0].name : 'No Workspace')}
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
                    className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f0f0f] border border-neutral-800 rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {workspaces.map((workspace) => (
                        <button
                          key={workspace.id}
                          onClick={() => switchWorkspace(workspace)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            currentWorkspace?.id === workspace.id
                              ? 'bg-[#1a1a1a] text-white'
                              : 'text-neutral-300 hover:bg-[#1a1a1a]'
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
                    <div className="p-2 border-t border-neutral-800">
                      <button
                        onClick={() => {
                          setWorkspaceMenuOpen(false)
                          setShowNewWorkspaceModal(true)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
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
              className="bg-[#0f0f0f] border border-neutral-800 rounded-xl p-6 w-full max-w-md"
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
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-neutral-800 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
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
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-neutral-800 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] text-neutral-300 rounded-md hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createWorkspace}
                  disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </div>
          
          {/* User Avatar & Name with Dropdown - Right Side */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 transition-colors"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{profile?.name || 'Developer'}</p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                profile?.subscription_tier === 'managed_pro' || profile?.subscription_tier === 'managed_expert' || profile?.subscription_tier === 'pro'
                  ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500'
                  : profile?.subscription_tier === 'byok_pro'
                  ? 'bg-orange-500/20 text-orange-400 ring-2 ring-orange-500'
                  : 'bg-neutral-800 text-gray-300'
              }`}>
                {profile?.name?.[0] || 'U'}
              </div>
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* User Dropdown Menu */}
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[#0f0f0f] border border-neutral-800 rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl w-full">
          {children}
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  )
}
