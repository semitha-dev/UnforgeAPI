'use client'

import { useState, useEffect, ReactNode, useRef } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Layers,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  Coins,
  Plus,
  BarChart3,
  Sparkles,
  Send,
  Music,
  Youtube,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loading } from '@/components/ui/loading'
import { TokenPurchaseModal } from '@/components/ui/token-purchase-modal'
import { useTokenSync } from '@/lib/useTokenRefresh'
import { useProjectTimeTracking } from '@/lib/useProjectTimeTracking'

// YouTube URL helpers
function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null
  let videoId = ''
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1])
    videoId = urlParams.get('v') || ''
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || ''
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    videoId = url
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null
}

function getSpotifyEmbedUrl(url: string): string | null {
  if (!url) return null
  if (url.includes('open.spotify.com')) {
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
  }
  return null
}

interface SavedUrl {
  url: string
  title: string
  savedAt: number
}

// Global Music Player Component
function GlobalMusicPlayer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [youtubeHistory, setYoutubeHistory] = useState<SavedUrl[]>([])
  const [spotifyHistory, setSpotifyHistory] = useState<SavedUrl[]>([])

  // Load history from localStorage
  useEffect(() => {
    const savedYoutube = localStorage.getItem('leaflearning_youtube_history')
    const savedSpotify = localStorage.getItem('leaflearning_spotify_history')
    if (savedYoutube) setYoutubeHistory(JSON.parse(savedYoutube))
    if (savedSpotify) setSpotifyHistory(JSON.parse(savedSpotify))
  }, [])

  const saveToYoutubeHistory = (url: string) => {
    const title = url.length > 30 ? url.substring(0, 30) + '...' : url
    const newEntry: SavedUrl = { url, title, savedAt: Date.now() }
    const updated = [newEntry, ...youtubeHistory.filter(h => h.url !== url)].slice(0, 5)
    setYoutubeHistory(updated)
    localStorage.setItem('leaflearning_youtube_history', JSON.stringify(updated))
  }

  const saveToSpotifyHistory = (url: string) => {
    const title = url.length > 30 ? url.substring(0, 30) + '...' : url
    const newEntry: SavedUrl = { url, title, savedAt: Date.now() }
    const updated = [newEntry, ...spotifyHistory.filter(h => h.url !== url)].slice(0, 5)
    setSpotifyHistory(updated)
    localStorage.setItem('leaflearning_spotify_history', JSON.stringify(updated))
  }

  const removeFromYoutubeHistory = (index: number) => {
    const updated = youtubeHistory.filter((_, i) => i !== index)
    setYoutubeHistory(updated)
    localStorage.setItem('leaflearning_youtube_history', JSON.stringify(updated))
  }

  const removeFromSpotifyHistory = (index: number) => {
    const updated = spotifyHistory.filter((_, i) => i !== index)
    setSpotifyHistory(updated)
    localStorage.setItem('leaflearning_spotify_history', JSON.stringify(updated))
  }

  const handleYoutubeChange = (url: string) => {
    setYoutubeUrl(url)
    if (getYoutubeEmbedUrl(url)) saveToYoutubeHistory(url)
  }

  const handleSpotifyChange = (url: string) => {
    setSpotifyUrl(url)
    if (getSpotifyEmbedUrl(url)) saveToSpotifyHistory(url)
  }

  if (!isOpen) return null

  const youtubeEmbedUrl = getYoutubeEmbedUrl(youtubeUrl)
  const spotifyEmbedUrl = getSpotifyEmbedUrl(spotifyUrl)

  const youtubePresets = [
    { id: 'jfKfPfyJRdk', name: 'Lofi Girl', emoji: '🎧', color: 'from-pink-500 to-purple-500' },
    { id: '4xDzrJKXOOY', name: 'Synthwave', emoji: '🌆', color: 'from-cyan-500 to-blue-500' },
    { id: 'lTRiuFIWV54', name: 'Jazz Cafe', emoji: '☕', color: 'from-amber-500 to-orange-500' },
    { id: '5qap5aO4i9A', name: 'Chill Beats', emoji: '🎵', color: 'from-green-500 to-teal-500' },
  ]

  const spotifyPresets = [
    { url: 'https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM', name: 'Deep Focus', emoji: '🧠', color: 'from-blue-500 to-indigo-500' },
    { url: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS', name: 'Chill Lofi', emoji: '🌙', color: 'from-purple-500 to-pink-500' },
    { url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ', name: 'Lo-Fi Beats', emoji: '🎹', color: 'from-rose-500 to-red-500' },
    { url: 'https://open.spotify.com/playlist/37i9dQZF1DX9sIqqvKsjG8', name: 'Study Piano', emoji: '🎼', color: 'from-teal-500 to-emerald-500' },
  ]

  return (
    <>
      {isMinimized && (
        <div className="fixed top-20 right-4 z-[60] bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">Now Playing</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="Expand">
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors" title="Close">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed top-20 right-4 z-[60] w-[340px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden ${isMinimized ? 'invisible absolute -top-[9999px]' : ''}`}>
        <div className="relative px-5 py-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-rose-600/20" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Focus Music</h3>
                <p className="text-xs text-white/60">Study with music</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Minimize">
                <ChevronUp className="w-4 h-4 text-white/80" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Close">
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeTab === 'youtube' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => setActiveTab('spotify')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeTab === 'spotify' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">⚡ Quick Pick</p>
          <div className="grid grid-cols-2 gap-2">
            {activeTab === 'youtube' ? (
              youtubePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleYoutubeChange(preset.id)}
                  className={`group relative p-3 rounded-2xl transition-all duration-300 overflow-hidden ${
                    youtubeUrl === preset.id || youtubeUrl.includes(preset.id)
                      ? `bg-gradient-to-br ${preset.color} shadow-lg scale-[1.02]`
                      : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{preset.emoji}</span>
                    <span className={`text-sm font-medium ${youtubeUrl === preset.id || youtubeUrl.includes(preset.id) ? 'text-white' : 'text-white/80'}`}>
                      {preset.name}
                    </span>
                  </div>
                  {(youtubeUrl === preset.id || youtubeUrl.includes(preset.id)) && (
                    <div className="absolute top-2 right-2"><div className="w-2 h-2 bg-white rounded-full animate-pulse" /></div>
                  )}
                </button>
              ))
            ) : (
              spotifyPresets.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => handleSpotifyChange(preset.url)}
                  className={`group relative p-3 rounded-2xl transition-all duration-300 overflow-hidden ${
                    spotifyUrl === preset.url
                      ? `bg-gradient-to-br ${preset.color} shadow-lg scale-[1.02]`
                      : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{preset.emoji}</span>
                    <span className={`text-sm font-medium ${spotifyUrl === preset.url ? 'text-white' : 'text-white/80'}`}>
                      {preset.name}
                    </span>
                  </div>
                  {spotifyUrl === preset.url && (
                    <div className="absolute top-2 right-2"><div className="w-2 h-2 bg-white rounded-full animate-pulse" /></div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'youtube' ? (
            <div className="space-y-3">
              {youtubeEmbedUrl ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-black/50 ring-1 ring-white/10">
                  <iframe src={youtubeEmbedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div className="aspect-video rounded-2xl bg-white/5 flex flex-col items-center justify-center text-white/40 ring-1 ring-white/10">
                  <Youtube className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-sm">Select a playlist above</span>
                  <span className="text-xs mt-1 text-white/30">or paste a URL below</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {spotifyEmbedUrl ? (
                <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
                  <iframe src={spotifyEmbedUrl} width="100%" height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-2xl" />
                </div>
              ) : (
                <div className="h-[152px] rounded-2xl bg-white/5 flex flex-col items-center justify-center text-white/40 ring-1 ring-white/10">
                  <svg className="w-10 h-10 mb-2 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span className="text-sm">Select a playlist above</span>
                  <span className="text-xs mt-1 text-white/30">or paste a URL below</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium text-white/40 hover:text-white/60 transition-colors list-none">
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
              Custom URL
            </summary>
            <div className="mt-3 space-y-2">
              {activeTab === 'youtube' ? (
                <>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => handleYoutubeChange(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                  {youtubeHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/30 block">Recent</label>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {youtubeHistory.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 group/item">
                            <button
                              onClick={() => setYoutubeUrl(item.url)}
                              className={`flex-1 text-left px-3 py-2 text-xs rounded-lg transition-all truncate ${youtubeUrl === item.url ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                            >
                              {item.title}
                            </button>
                            <button onClick={() => removeFromYoutubeHistory(index)} className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-red-500/20 rounded-lg transition-all">
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={spotifyUrl}
                    onChange={(e) => handleSpotifyChange(e.target.value)}
                    placeholder="Paste Spotify URL..."
                    className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all"
                  />
                  {spotifyHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/30 block">Recent</label>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {spotifyHistory.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 group/item">
                            <button
                              onClick={() => setSpotifyUrl(item.url)}
                              className={`flex-1 text-left px-3 py-2 text-xs rounded-lg transition-all truncate ${spotifyUrl === item.url ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                            >
                              {item.title}
                            </button>
                            <button onClick={() => removeFromSpotifyHistory(index)} className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-red-500/20 rounded-lg transition-all">
                              <X className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </details>
        </div>

        <div className="px-4 pb-4">
          <a
            href={activeTab === 'youtube' ? "https://www.youtube.com/results?search_query=lofi+study+music" : "https://open.spotify.com/search/lofi%20study"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded-xl transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Find more on {activeTab === 'youtube' ? 'YouTube' : 'Spotify'}
          </a>
        </div>
      </div>
    </>
  )
}

interface Project {
  id: string
  name: string
  description: string
  color: string
  created_at: string
}

interface Profile {
  name: string
  email?: string
  tokens_balance?: number
}

interface ProjectLayoutProps {
  children: ReactNode
}

const sidebarItems = [
  { name: 'Overview', href: '', icon: LayoutDashboard },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'Q&A', href: '/qa', icon: HelpCircle },
  { name: 'Flashcards', href: '/flashcards', icon: Layers },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Leaf AI', href: '/leafai', icon: Sparkles }
]

// Markdown to HTML converter for AI responses
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2"><code>${code.trim()}</code></pre>`
  })
  
  // Handle headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-3 mb-2">$1</h1>')
  
  // Handle bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 hover:underline" target="_blank">$1</a>')
  
  // Process lists and paragraphs
  const lines = html.split('\n')
  const processed: string[] = []
  let inList = false
  let listType = ''
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false }
      continue
    }
    
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ul class="list-disc list-inside my-2 space-y-1">')
        inList = true; listType = 'ul'
      }
      processed.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ol class="list-decimal list-inside my-2 space-y-1">')
        inList = true; listType = 'ol'
      }
      processed.push(`<li>${numMatch[1]}</li>`)
      continue
    }
    
    if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
    if (trimmed.startsWith('<')) { processed.push(trimmed); continue }
    processed.push(`<p class="my-1">${trimmed}</p>`)
  }
  if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
  
  return processed.join('')
}

// Leaf AI Panel Component
function LeafAIPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'light' | 'heavy'>('light')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/notes/leafai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMessage,
          action: 'chat',
          mode,
          noteTitle: '',
          noteContent: '',
          isGlobal: true
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[70] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Leaf AI</h2>
              <p className="text-xs text-white/80">Your learning assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Hi! I'm Leaf AI 🌿</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your personal learning assistant. Ask me anything about your studies, homework, or any topic you want to learn about!
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Try asking:</p>
              {[
                "Explain quantum physics simply",
                "Help me study for my math exam",
                "What are good study techniques?",
                "Summarize the French Revolution"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="block w-full px-3 py-2 text-xs text-left text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div 
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(msg.content) }}
                  />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'light' | 'heavy')}
              className="px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-xs bg-white cursor-pointer"
            >
              <option value="light">Basic</option>
              <option value="heavy">Pro</option>
            </select>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm bg-white"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {mode === 'heavy' ? 'Pro mode uses 2x tokens' : 'Basic mode for quick answers'}
          </p>
        </div>
      </div>
    </>
  )
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [showLeafAI, setShowLeafAI] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showMusicPlayer, setShowMusicPlayer] = useState(false)

  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const supabase = createClient()

  const projectId = params.id as string

  // Check if returning from checkout and subscribe to realtime token updates
  useTokenSync(userId)

  // Track time spent on this project
  useProjectTimeTracking()

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  // Listen for token updates from AI operations
  useEffect(() => {
    const handleTokensUpdated = async () => {
      try {
        const subscriptionRes = await fetch('/api/subscription', { cache: 'no-store' })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          setProfile(prev => prev ? {
            ...prev,
            tokens_balance: subscriptionData.subscription?.tokens_balance || 0
          } : null)
        }
      } catch (err) {
        console.error('Error refreshing token balance:', err)
      }
    }

    window.addEventListener('tokensUpdated', handleTokensUpdated)
    return () => window.removeEventListener('tokensUpdated', handleTokensUpdated)
  }, [])

  // Listen for sidebar collapse/expand events from notes editor
  useEffect(() => {
    const handleSidebarCollapse = () => setSidebarCollapsed(true)
    const handleSidebarExpand = () => setSidebarCollapsed(false)

    window.addEventListener('collapseSidebar', handleSidebarCollapse)
    window.addEventListener('expandSidebar', handleSidebarExpand)
    return () => {
      window.removeEventListener('collapseSidebar', handleSidebarCollapse)
      window.removeEventListener('expandSidebar', handleSidebarExpand)
    }
  }, [])

  const loadProject = async () => {
    try {
      setError(null)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        router.push('/signin')
        return
      }

      if (!user) {
        router.push('/signin')
        return
      }

      // Set userId for realtime subscription
      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

      // Fetch valid token balance from subscription API
      let validTokenBalance = 0
      try {
        const subscriptionRes = await fetch('/api/subscription', { cache: 'no-store' })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          validTokenBalance = subscriptionData.subscription?.tokens_balance || 0
        }
      } catch (err) {
        console.error('Error fetching valid token balance:', err)
      }

      // Always set profile with token balance, even if profileData is null
      // Use email from profile or user.email as fallback for display name
      setProfile({
        name: profileData?.name || '',
        email: profileData?.email || user.email || '',
        tokens_balance: validTokenBalance
      })

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          router.push('/dashboard')
          return
        }
        setError('Failed to load project')
        return
      }

      if (!projectData) {
        router.push('/dashboard')
        return
      }

      setProject(projectData)

      // Fetch all user projects for dropdown
      const { data: allProjectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (allProjectsData) {
        setAllProjects(allProjectsData)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const isActiveRoute = (href: string) => {
    const fullPath = `/project/${projectId}${href}`
    return pathname === fullPath
  }

  const getPageTitle = () => {
    const currentItem = sidebarItems.find(item => isActiveRoute(item.href))
    return currentItem?.name || 'Project'
  }

  if (isLoading) {
    return <Loading message="Loading project..." fullScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F6FA' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={loadProject} className="bg-indigo-500 hover:bg-indigo-600">Try Again</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-white">
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0f172a] transition-all duration-300 shadow-lg ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex flex-col h-full">
            <div className="h-20 flex items-center justify-between px-5 relative">
              {!sidebarCollapsed ? (
                <button
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:bg-white/10 rounded-xl p-2 -ml-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: project.color }}>
                    <span className="text-white font-bold text-sm">{project.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-lg font-bold text-white truncate flex-1 text-left">{project.name}</span>
                  <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${projectDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                      className="w-full flex justify-center hover:bg-white/10 rounded-xl p-2 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color }}>
                        <span className="text-white font-bold text-sm">{project.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Switch Project</TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 text-slate-400" onClick={() => setMobileMenuOpen(false)}>
                <Menu className="h-5 w-5" />
              </Button>

              {/* Project Dropdown with Glassy UI */}
              {projectDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProjectDropdownOpen(false)} />
                  <div className={`absolute top-full mt-2 z-50 ${sidebarCollapsed ? 'left-2 w-64' : 'left-3 right-3'}`}>
                    <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
                      <div className="p-3 border-b border-gray-100/50">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Switch Project</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {allProjects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setProjectDropdownOpen(false)
                              if (p.id !== projectId) {
                                router.push(`/project/${p.id}`)
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                              p.id === projectId
                                ? 'bg-gray-100/80'
                                : 'hover:bg-gray-50/80'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: p.color }}
                            >
                              <span className="text-white font-semibold text-xs">{p.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className={`text-sm truncate flex-1 text-left ${p.id === projectId ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {p.name}
                            </span>
                            {p.id === projectId && (
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100/50">
                        <Link
                          href="/dashboard"
                          onClick={() => setProjectDropdownOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-50/80 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Plus className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="text-sm">View All Projects</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <nav className="flex-1 px-4 pt-2">
              <div className="space-y-1">

              {sidebarItems.map((item) => {
                const href = `/project/${projectId}${item.href}`
                const isActive = isActiveRoute(item.href)
                const Icon = item.icon
                
                return sidebarCollapsed ? (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link href={href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-r-full" style={{ marginLeft: '-16px' }} />
                        )}
                        <div className={`flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 ${isActive ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link key={item.name} href={href} onClick={() => setMobileMenuOpen(false)} className="relative block">
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-r-full" style={{ marginLeft: '-16px' }} />
                    )}
                    <div className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-sky-500 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                )
              })}
              </div>
            </nav>

            {/* Token Balance Section */}
            <div className="px-4 py-3 border-t border-slate-700/50">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowTokenModal(true)} className="flex items-center justify-center w-full h-11 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all duration-200">
                      <Coins className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{profile?.tokens_balance ?? 0} Tokens</p>
                    <p className="text-xs text-gray-400">Click to buy more</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">Tokens</span>
                    </div>
                    <span className="text-sm font-bold text-blue-400">{profile?.tokens_balance ?? 0}</span>
                  </div>
                  <button onClick={() => setShowTokenModal(true)} className="flex items-center justify-center w-full py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
                    Buy Tokens
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700/50">
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/dashboard" className="flex items-center justify-center w-full h-11 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200">
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Back to Dashboard</TooltipContent>
                </Tooltip>
              ) : (
                <Link href="/dashboard" className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-white/10 hover:text-white transition-all duration-200">
                  <ChevronLeft className="h-5 w-5" />
                  <span>Back to Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]'}`}>
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                {/* Sidebar Toggle Button - Desktop */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hidden lg:flex"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                      {sidebarCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-3">
                {/* Music Player Button */}
                <Button 
                  onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                  className={`h-9 px-4 rounded-xl transition-all gap-2 ${
                    showMusicPlayer 
                      ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30' 
                      : 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white hover:shadow-lg hover:shadow-pink-500/30'
                  }`}
                >
                  <Music className="h-4 w-4" />
                  <span className="hidden sm:inline">Music</span>
                </Button>

                {/* Leaf AI Button - Hide on notes page since it has its own Leaf AI */}
                {!pathname.includes('/notes') && (
                  <Button 
                    onClick={() => setShowLeafAI(true)}
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Leaf AI</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600">{(profile?.name || profile?.email)?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-gray-700">{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0] || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-medium">{profile?.name || profile?.email?.split('@')[0] || 'User'}</span>
                        <span className="text-xs text-gray-500">{profile?.email || 'Student'}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                      <User className="h-4 w-4 mr-2" />Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-4rem)] p-6">
            {children}
          </main>
        </div>

        {/* Leaf AI Panel */}
        <LeafAIPanel isOpen={showLeafAI} onClose={() => setShowLeafAI(false)} />

        {/* Global Music Player */}
        <GlobalMusicPlayer isOpen={showMusicPlayer} onClose={() => setShowMusicPlayer(false)} />

        {/* Token Purchase Modal */}
        <TokenPurchaseModal 
          isOpen={showTokenModal} 
          onClose={() => setShowTokenModal(false)}
          currentBalance={profile?.tokens_balance ?? 0}
        />
      </div>
    </TooltipProvider>
  )
}