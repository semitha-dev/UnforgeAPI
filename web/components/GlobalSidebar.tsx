'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Layers,
  BarChart3,
  Plus,
  ChevronRight,
  LogOut,
  Settings,
  Search,
  MessageSquare,
  Crown,
  Sparkles
} from 'lucide-react'
import MorningReportProvider from './MorningReportProvider'


interface Space {
  id: string
  name: string
  color: string
  created_at: string
}

interface GlobalSidebarProps {
  currentSpaceId?: string
  isPro?: boolean
  isAnonymous?: boolean
  onUpgradeClick?: () => void
  onChatsClick?: () => void
  onChatsHover?: () => void
  onChatsClose?: () => void
  activeItem?: 'overview' | 'spaces' | 'chats' | 'insights' | 'settings'
}

export default function GlobalSidebar({ currentSpaceId, isPro = false, isAnonymous = false, onUpgradeClick, onChatsClick, onChatsHover, onChatsClose, activeItem }: GlobalSidebarProps) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [showSpacesFlyout, setShowSpacesFlyout] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Don't load spaces for anonymous users
    if (!isAnonymous) {
      loadSpaces()
    }
  }, [isAnonymous])

  const loadSpaces = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('projects')
      .select('id, name, color, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setSpaces(data)
    }
  }

  const createSpace = async () => {
    // Redirect anonymous users to signup
    if (isAnonymous) {
      router.push('/signup?reason=create-space')
      return
    }
    
    if (!newSpaceName.trim()) return
    setIsCreating(true)

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSpaceName.trim(),
          description: '',
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Space limit reached - show upgrade modal
        if (response.status === 403 && onUpgradeClick) {
          onUpgradeClick()
        } else {
          console.error('Failed to create space:', data.error)
        }
        return
      }

      if (data && data.id) {
        setSpaces([data, ...spaces])
        setNewSpaceName('')
        router.push(`/project/${data.id}`)
        setShowSpacesFlyout(false)
      }
    } catch (error) {
      console.error('Error creating space:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const isOverview = activeItem === 'overview' || pathname === '/overview'
  const isGlobalInsights = pathname === '/insights' || pathname?.includes('/insights')

  return (
    <>
      {/* Morning Report Modal */}
      <MorningReportProvider />
      
      {/* Global Sidebar Rail */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[72px] bg-neutral-950 border-r border-neutral-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center">
          <Link href="/overview" className="w-14 h-14 flex items-center justify-center hover:scale-105 transition-transform">
            <Image src="/new_logo.png" alt="LeafLearning" width={56} height={56} className="object-contain" />
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col items-center py-4 space-y-1">
          {/* Overview - LeafSearch */}
          <Link
            href="/overview"
            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              isOverview
                ? 'text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Search className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Search</span>
          </Link>

          {/* Chats */}
          <button
            onClick={onChatsClick}
            onMouseEnter={() => {
              setShowSpacesFlyout(false)
              onChatsHover?.()
            }}
            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeItem === 'chats'
                ? 'text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <MessageSquare className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Chats</span>
          </button>

          {/* Divider */}
          <div className="w-10 h-px bg-neutral-800 my-2" />

          {/* Spaces Icon with Flyout */}
          <div className="relative w-full">
            <button
              onMouseEnter={() => {
                onChatsClose?.()
                setShowSpacesFlyout(true)
              }}
              onClick={() => setShowSpacesFlyout(!showSpacesFlyout)}
              className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                currentSpaceId || showSpacesFlyout
                  ? 'text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Layers className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Spaces</span>
            </button>
          </div>

          {/* Global Insights */}
          <Link
            href="/insights"
            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              isGlobalInsights
                ? 'text-emerald-400'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Insights</span>
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center py-4 space-y-1 border-t border-neutral-800">
          {/* Pro Status / Upgrade / Login (for anonymous) */}
          {isAnonymous ? (
            <Link
              href="/signin"
              className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
            >
              <LogOut className="h-5 w-5 mb-1 rotate-180" />
              <span className="text-[10px] font-bold">Login</span>
            </Link>
          ) : isPro ? (
            <div className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-amber-400">
              <Crown className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-bold">Pro</span>
            </div>
          ) : (
            <button
              onClick={onUpgradeClick}
              className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all relative group"
            >
              <Sparkles className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-bold">Upgrade</span>
            </button>
          )}

          {/* Settings - only for logged in users */}
          {!isAnonymous && (
            <Link
              href="/settings"
              className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                pathname === '/settings'
                  ? 'text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Settings</span>
            </Link>
          )}

          {/* Logout - only for logged in users */}
          {!isAnonymous && (
            <button
              onClick={handleSignOut}
              className="w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl text-neutral-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <LogOut className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Spaces Flyout Panel */}
      {showSpacesFlyout && (
        <>
          {/* Backdrop - positioned to the right of the panel, closes when mouse enters */}
          <div 
            className="fixed top-0 left-[360px] right-0 bottom-0 z-40" 
            onClick={() => setShowSpacesFlyout(false)}
            onMouseEnter={() => setShowSpacesFlyout(false)}
          />
          <div 
            className="fixed left-[72px] top-0 z-50 h-full w-72 bg-neutral-900 border-r border-neutral-800 shadow-2xl animate-in slide-in-from-left-2 duration-200"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-neutral-800">
                <h2 className="text-lg font-semibold text-white">Spaces</h2>
                <p className="text-xs text-neutral-500 mt-1">Select or create a space</p>
              </div>

              {/* Anonymous user prompt */}
              {isAnonymous ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <Layers className="h-16 w-16 text-neutral-700 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Sign up to create spaces</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Create study spaces to organize your notes, flashcards, and quizzes.
                  </p>
                  <Link
                    href="/signup?reason=create-space"
                    className="w-full px-4 py-3 bg-white text-black font-medium rounded-xl hover:bg-neutral-200 transition-colors text-center"
                  >
                    Sign up for free
                  </Link>
                  <Link
                    href="/signin"
                    className="w-full mt-3 px-4 py-3 text-neutral-400 hover:text-white transition-colors text-center text-sm"
                  >
                    Already have an account? Sign in
                  </Link>
                </div>
              ) : (
                <>
                  {/* Create New Space */}
                  <div className="p-4 border-b border-neutral-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSpaceName}
                        onChange={(e) => setNewSpaceName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createSpace()}
                        placeholder="New space name..."
                        className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
                      />
                      <button
                        onClick={createSpace}
                        disabled={isCreating || !newSpaceName.trim()}
                        className="p-2 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Spaces List */}
                  <div className="flex-1 overflow-y-auto p-2">
                    {spaces.length === 0 ? (
                      <div className="text-center py-8">
                        <Layers className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500 text-sm">No spaces yet</p>
                        <p className="text-neutral-600 text-xs mt-1">Create your first space above</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Group spaces by date */}
                        {(() => {
                          const groups: { [key: string]: typeof spaces } = {
                            'Today': [],
                            'Yesterday': [],
                            'This Week': [],
                            'Older': []
                          }
                          const now = new Date()
                          spaces.forEach(space => {
                            const date = new Date(space.created_at)
                            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                            if (diffDays === 0) groups['Today'].push(space)
                            else if (diffDays === 1) groups['Yesterday'].push(space)
                            else if (diffDays < 7) groups['This Week'].push(space)
                            else groups['Older'].push(space)
                          })
                          return Object.entries(groups).map(([group, groupSpaces]) =>
                            groupSpaces.length > 0 && (
                              <div key={group}>
                                <p className="px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                  {group}
                                </p>
                                <div className="space-y-1">
                                  {groupSpaces.map((space) => (
                                    <Link
                                      key={space.id}
                                      href={`/project/${space.id}`}
                                      onClick={() => setShowSpacesFlyout(false)}
                                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                                        currentSpaceId === space.id
                                          ? 'bg-white text-black'
                                          : 'text-neutral-300 hover:bg-neutral-800'
                                      }`}
                                    >
                                      <div 
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                                          currentSpaceId === space.id
                                            ? 'bg-black text-white'
                                            : 'bg-neutral-700 text-white'
                                        }`}
                                      >
                                        {space.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${currentSpaceId === space.id ? 'text-black' : 'text-white'}`}>
                                          {space.name}
                                        </p>
                                        <p className={`text-xs truncate ${currentSpaceId === space.id ? 'text-neutral-600' : 'text-neutral-500'}`}>
                                          {new Date(space.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                                        currentSpaceId === space.id ? 'text-black' : 'text-neutral-500'
                                      }`} />
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
