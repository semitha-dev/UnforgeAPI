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
  ChevronDown,
  Bot,
  Lightbulb,
  GraduationCap
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
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import { useProjectTimeTracking } from '@/lib/useProjectTimeTracking'
import GlobalSidebar from '@/components/GlobalSidebar'
import SpaceSidebar from '@/components/SpaceSidebar'
import ChatsPanel from '@/components/ChatsPanel'
import MobileNav from '@/components/MobileNav'

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
  subscription_tier?: string
}

interface ProjectLayoutProps {
  children: ReactNode
}

// Markdown to HTML converter for AI responses
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks (preserve them from other transformations)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(`<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2"><code>${code.trim()}</code></pre>`)
    return placeholder
  })
  
  // Handle headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-3 mb-2">$1</h1>')
  
  // Handle bold - match content without asterisks or newlines
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  // Handle italic - single asterisks (not adjacent to other asterisks)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs">$1</code>')
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block)
  })
  
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showChatsPanel, setShowChatsPanel] = useState(false)
  
  // Space stats for sidebar
  const [notesCount, setNotesCount] = useState<number>(0)
  const [studySetsCount, setStudySetsCount] = useState<number>(0)

  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const supabase = createClient()

  const projectId = params.id as string

  // Track time spent on this project
  useProjectTimeTracking()

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

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

      // Fetch subscription tier from API
      let subscriptionTier = 'free'
      try {
        const subscriptionRes = await fetch('/api/subscription', { cache: 'no-store' })
        if (subscriptionRes.ok) {
          const subscriptionData = await subscriptionRes.json()
          subscriptionTier = subscriptionData.subscription?.subscription_tier || 'free'
        }
      } catch (err) {
        console.error('Error fetching subscription tier:', err)
      }

      // Always set profile with subscription tier
      setProfile({
        name: profileData?.name || '',
        email: profileData?.email || user.email || '',
        subscription_tier: subscriptionTier
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
      
      // Fetch space stats
      const [notesResult, flashcardsResult, quizzesResult] = await Promise.all([
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('flashcard_sets').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
      ])
      
      setNotesCount(notesResult.count || 0)
      setStudySetsCount((flashcardsResult.count || 0) + (quizzesResult.count || 0))
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-x-4">
            <Button onClick={loadProject} className="bg-white text-black hover:bg-neutral-200">Try Again</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-neutral-700 text-white hover:bg-neutral-800">Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-neutral-900">
        {/* Global Sidebar - Always visible even during loading */}
        <div className="hidden lg:block">
          <GlobalSidebar 
            currentSpaceId={projectId}
            isPro={profile?.subscription_tier === 'pro'}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            activeItem="spaces"
          />
        </div>
        <main className="lg:ml-[72px] min-h-screen" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-neutral-900">
        {/* Mobile Menu Backdrop */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Global Sidebar - Always visible (leftmost rail) */}
        <div className="hidden lg:block">
          <GlobalSidebar 
            currentSpaceId={projectId}
            isPro={profile?.subscription_tier === 'pro'}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onChatsClick={() => setShowChatsPanel(!showChatsPanel)}
            onChatsHover={() => setShowChatsPanel(true)}
            onChatsClose={() => setShowChatsPanel(false)}
            activeItem={showChatsPanel ? 'chats' : 'spaces'}
          />
        </div>

        {/* Chats Panel */}
        <ChatsPanel
          isOpen={showChatsPanel}
          onClose={() => setShowChatsPanel(false)}
          onSelectChat={() => { router.push('/overview'); setShowChatsPanel(false); }}
          onNewChat={() => { router.push('/overview'); setShowChatsPanel(false); }}
          currentChatId={null}
        />

        {/* Space Sidebar - Secondary sidebar for space navigation */}
        <div className="hidden lg:flex fixed inset-y-0 left-[72px] z-40 h-screen">
          <SpaceSidebar spaceId={projectId} spaceName={project.name} notesCount={notesCount} studySetsCount={studySetsCount} />
        </div>

        {/* Mobile Sidebar - Combined for mobile */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-neutral-950 border-r border-neutral-800 transition-transform duration-300 lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full">
            {/* Mobile: Mini global nav */}
            <div className="w-[60px] bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-4">
              <GlobalSidebar 
                currentSpaceId={projectId}
                isPro={profile?.subscription_tier === 'pro'}
                onUpgradeClick={() => { setShowUpgradeModal(true); setMobileMenuOpen(false); }}
                onChatsClick={() => { setShowChatsPanel(!showChatsPanel); setMobileMenuOpen(false); }}
                onChatsHover={() => setShowChatsPanel(true)}
                onChatsClose={() => setShowChatsPanel(false)}
              />
            </div>
            {/* Mobile: Space sidebar */}
            <div className="flex-1">
              <SpaceSidebar 
                spaceId={projectId} 
                spaceName={project.name}
                onClose={() => setMobileMenuOpen(false)}
                isMobile={true}
                notesCount={notesCount}
                studySetsCount={studySetsCount}
              />
            </div>
          </div>
        </aside>

        {/* Main Content Area - Offset by both sidebars on desktop */}
        <div className="transition-all duration-300 lg:ml-[292px]">
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800 h-16">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
              {/* Left side - Mobile menu button */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-neutral-500 text-sm">Space</span>
                  <ChevronRight className="h-4 w-4 text-neutral-600" />
                  <span className="text-white font-medium text-sm">{project.name}</span>
                </div>
              </div>

              {/* Right side - User menu */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-neutral-400" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <div className={`relative ${profile?.subscription_tier === 'pro' ? 'p-0.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 shadow-lg shadow-purple-500/50' : ''}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`${profile?.subscription_tier === 'pro' ? 'bg-neutral-900' : 'bg-neutral-800'} text-white`}>{(profile?.name || profile?.email)?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="text-sm font-medium text-neutral-200">{profile?.name?.split(' ')[0] || profile?.email?.split('@')[0] || 'User'}</span>
                        {profile?.subscription_tier === 'pro' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded shadow-sm shadow-purple-500/50">PRO</span>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{profile?.name || profile?.email?.split('@')[0] || 'User'}</span>
                          {profile?.subscription_tier === 'pro' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded">PRO</span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">{profile?.email || ''}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <User className="h-4 w-4 mr-2" />Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                      <LogOut className="h-4 w-4 mr-2" />Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 min-h-[calc(100vh-4rem)] p-4 lg:p-6 pb-24 lg:pb-6 bg-neutral-900">
            {children}
          </main>
        </div>

        {/* Mobile Navigation */}
        <MobileNav onChatsClick={() => setShowChatsPanel(!showChatsPanel)} />

        {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)}
          isPro={profile?.subscription_tier === 'pro'}
        />
      </div>
    </TooltipProvider>
  )
}