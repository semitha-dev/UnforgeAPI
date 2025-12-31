'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Layers,
  BarChart3,
  Settings,
  MessageSquare,
  Plus,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabaseClient'

interface Space {
  id: string
  name: string
  color: string
}

interface MobileNavProps {
  onChatsClick?: () => void
  spaces?: Space[]
}

export default function MobileNav({ onChatsClick, spaces: propSpaces }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showSpacesSheet, setShowSpacesSheet] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [spaces, setSpaces] = useState<Space[]>(propSpaces || [])
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false)
  const supabase = createClient()

  const isOverview = pathname === '/overview'
  const isInsights = pathname === '/insights'
  const isSettings = pathname === '/settings'
  const isSpace = pathname?.startsWith('/project/')

  // Fetch spaces when sheet opens if not provided via props
  useEffect(() => {
    if (showSpacesSheet && spaces.length === 0 && !propSpaces) {
      loadSpaces()
    }
  }, [showSpacesSheet])

  // Update spaces when props change
  useEffect(() => {
    if (propSpaces && propSpaces.length > 0) {
      setSpaces(propSpaces)
    }
  }, [propSpaces])

  const loadSpaces = async () => {
    setIsLoadingSpaces(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (projectsData) {
        setSpaces(projectsData)
      }
    } catch (error) {
      console.error('Error loading spaces:', error)
    } finally {
      setIsLoadingSpaces(false)
    }
  }

  const createSpace = async () => {
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
      if (data && data.id) {
        setNewSpaceName('')
        // Refresh spaces list before navigating
        await loadSpaces()
        router.push(`/project/${data.id}`)
        setShowSpacesSheet(false)
      }
    } catch (error) {
      console.error('Error creating space:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Search */}
          <Link
            href="/overview"
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
              isOverview ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Search</span>
          </Link>

          {/* Chats */}
          <button
            onClick={onChatsClick}
            className="flex flex-col items-center justify-center flex-1 py-2 text-neutral-500 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Chats</span>
          </button>

          {/* Spaces */}
          <button
            onClick={() => setShowSpacesSheet(true)}
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
              isSpace ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Spaces</span>
          </button>

          {/* Insights */}
          <Link
            href="/insights"
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
              isInsights ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Insights</span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
              isSettings ? 'text-emerald-400' : 'text-neutral-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Spaces Bottom Sheet */}
      {showSpacesSheet && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSpacesSheet(false)}
          />
          
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 rounded-t-3xl max-h-[80vh] animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
              <h2 className="text-lg font-bold text-white">Your Spaces</h2>
              <button
                onClick={() => setShowSpacesSheet(false)}
                className="p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Space */}
            <div className="p-4 border-b border-neutral-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createSpace()}
                  placeholder="Create new space..."
                  className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
                />
                <button
                  onClick={createSpace}
                  disabled={isCreating || !newSpaceName.trim()}
                  className="p-3 bg-emerald-500 text-white rounded-xl disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Spaces List */}
            <div className="overflow-y-auto max-h-[50vh] p-4 pb-safe">
              {isLoadingSpaces ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : spaces.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500">No spaces yet</p>
                  <p className="text-neutral-600 text-sm mt-1">Create your first space above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {spaces.map((space) => (
                    <Link
                      key={space.id}
                      href={`/project/${space.id}`}
                      onClick={() => setShowSpacesSheet(false)}
                      className="flex items-center gap-3 p-4 bg-neutral-800 rounded-xl active:bg-neutral-700 transition-colors"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: space.color || '#525252' }}
                      >
                        {space.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium flex-1 truncate">{space.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
