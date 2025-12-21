'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Note, Project } from './page'
import { Maximize2, Minimize2, Music, X, Youtube, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'
import 'react-quill-new/dist/quill.snow.css'

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-50 animate-pulse rounded-lg" />
})

// Quill modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
  clipboard: {
    matchVisual: false
  }
}

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'indent',
  'align',
  'link'
]

// Music Player Component for Fullscreen Mode
interface MusicPlayerProps {
  isOpen: boolean
  onClose: () => void
}

interface SavedUrl {
  url: string
  title: string
  timestamp: number
}

const YOUTUBE_HISTORY_KEY = 'leaflearning_youtube_history'
const SPOTIFY_HISTORY_KEY = 'leaflearning_spotify_history'
const MAX_HISTORY_ITEMS = 5

function MusicPlayer({ isOpen, onClose }: MusicPlayerProps) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [youtubeHistory, setYoutubeHistory] = useState<SavedUrl[]>([])
  const [spotifyHistory, setSpotifyHistory] = useState<SavedUrl[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Load saved URLs from localStorage on mount
  useEffect(() => {
    try {
      const savedYoutube = localStorage.getItem(YOUTUBE_HISTORY_KEY)
      const savedSpotify = localStorage.getItem(SPOTIFY_HISTORY_KEY)
      
      if (savedYoutube) {
        const parsed = JSON.parse(savedYoutube)
        setYoutubeHistory(parsed)
        // Auto-load the most recent URL
        if (parsed.length > 0 && !youtubeUrl) {
          setYoutubeUrl(parsed[0].url)
        }
      }
      
      if (savedSpotify) {
        const parsed = JSON.parse(savedSpotify)
        setSpotifyHistory(parsed)
        // Auto-load the most recent URL
        if (parsed.length > 0 && !spotifyUrl) {
          setSpotifyUrl(parsed[0].url)
        }
      }
    } catch (e) {
      console.error('Failed to load music history:', e)
    }
  }, [])

  // Save YouTube URL to history
  const saveYoutubeUrl = (url: string) => {
    if (!url || !getYoutubeEmbedUrl(url)) return
    
    const videoId = extractYoutubeId(url)
    if (!videoId) return

    const newEntry: SavedUrl = {
      url: url,
      title: `YouTube Video (${videoId.slice(0, 6)}...)`,
      timestamp: Date.now()
    }

    setYoutubeHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => extractYoutubeId(item.url) !== videoId)
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(YOUTUBE_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  // Save Spotify URL to history
  const saveSpotifyUrl = (url: string) => {
    if (!url || !getSpotifyEmbedUrl(url)) return
    
    const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/)
    if (!match) return

    const type = match[1]
    const id = match[2]

    const newEntry: SavedUrl = {
      url: url,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} (${id.slice(0, 6)}...)`,
      timestamp: Date.now()
    }

    setSpotifyHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => !item.url.includes(id))
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(SPOTIFY_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  // Extract YouTube video ID
  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Extract YouTube video ID from various URL formats
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null
    const videoId = extractYoutubeId(url)
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`
    return null
  }

  // Extract Spotify embed URL
  const getSpotifyEmbedUrl = (url: string) => {
    if (!url) return null
    // Handle various Spotify URL formats
    const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/)
    if (match) {
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
    }
    return null
  }

  // Handle URL input change and save valid URLs
  const handleYoutubeChange = (url: string) => {
    setYoutubeUrl(url)
    // Save after a short delay to avoid saving incomplete URLs
    if (getYoutubeEmbedUrl(url)) {
      saveYoutubeUrl(url)
    }
  }

  const handleSpotifyChange = (url: string) => {
    setSpotifyUrl(url)
    if (getSpotifyEmbedUrl(url)) {
      saveSpotifyUrl(url)
    }
  }

  // Remove from history
  const removeFromYoutubeHistory = (index: number) => {
    setYoutubeHistory(prev => {
      const updated = prev.filter((_, i) => i !== index)
      localStorage.setItem(YOUTUBE_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const removeFromSpotifyHistory = (index: number) => {
    setSpotifyHistory(prev => {
      const updated = prev.filter((_, i) => i !== index)
      localStorage.setItem(SPOTIFY_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  if (!isOpen) return null

  const youtubeEmbedUrl = getYoutubeEmbedUrl(youtubeUrl)
  const spotifyEmbedUrl = getSpotifyEmbedUrl(spotifyUrl)

  // Preset playlists with nice metadata
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
      {/* Minimized view */}
      {isMinimized && (
        <div className="fixed top-4 right-4 z-[60] bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">
              Now Playing
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Expand"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full view - hidden when minimized but keeps iframes mounted */}
      <div className={`fixed top-4 right-4 z-[60] w-[340px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden ${isMinimized ? 'invisible absolute -top-[9999px]' : ''}`}>
        {/* Header with animated gradient */}
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
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                title="Minimize"
              >
                <ChevronUp className="w-4 h-4 text-white/80" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeTab === 'youtube'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </button>
            <button
              onClick={() => setActiveTab('spotify')}
              className={`flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 rounded-xl ${
                activeTab === 'spotify'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify
            </button>
          </div>
        </div>

        {/* Quick Pick Section - Prominent Presets */}
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
                    <span className={`text-sm font-medium ${
                      youtubeUrl === preset.id || youtubeUrl.includes(preset.id) ? 'text-white' : 'text-white/80'
                    }`}>
                      {preset.name}
                    </span>
                  </div>
                  {(youtubeUrl === preset.id || youtubeUrl.includes(preset.id)) && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
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
                    <span className={`text-sm font-medium ${
                      spotifyUrl === preset.url ? 'text-white' : 'text-white/80'
                    }`}>
                      {preset.name}
                    </span>
                  </div>
                  {spotifyUrl === preset.url && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Player Section */}
        <div className="p-4">
          {activeTab === 'youtube' ? (
            <div className="space-y-3">
              {youtubeEmbedUrl ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-black/50 ring-1 ring-white/10">
                  <iframe
                    src={youtubeEmbedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
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
                  <iframe
                    src={spotifyEmbedUrl}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-2xl"
                  />
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

        {/* Custom URL Section - Collapsible style */}
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
                  {/* Recent YouTube URLs */}
                  {youtubeHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/30 block">Recent</label>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {youtubeHistory.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 group/item"
                          >
                            <button
                              onClick={() => setYoutubeUrl(item.url)}
                              className={`flex-1 text-left px-3 py-2 text-xs rounded-lg transition-all truncate ${
                                youtubeUrl === item.url 
                                  ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' 
                                  : 'bg-white/5 hover:bg-white/10 text-white/60'
                              }`}
                            >
                              {item.title}
                            </button>
                            <button
                              onClick={() => removeFromYoutubeHistory(index)}
                              className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                            >
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
                  {/* Recent Spotify URLs */}
                  {spotifyHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/30 block">Recent</label>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {spotifyHistory.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-2 group/item"
                          >
                            <button
                              onClick={() => setSpotifyUrl(item.url)}
                              className={`flex-1 text-left px-3 py-2 text-xs rounded-lg transition-all truncate ${
                                spotifyUrl === item.url 
                                  ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' 
                                  : 'bg-white/5 hover:bg-white/10 text-white/60'
                              }`}
                            >
                              {item.title}
                            </button>
                            <button
                              onClick={() => removeFromSpotifyHistory(index)}
                              className="p-1.5 opacity-0 group-hover/item:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                            >
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

        {/* Footer */}
        <div className="px-4 pb-4">
          <a
            href={activeTab === 'youtube' 
              ? "https://www.youtube.com/results?search_query=lofi+study+music"
              : "https://open.spotify.com/search/lofi%20study"
            }
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

// Debounce hook for auto-save
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Comprehensive markdown to HTML converter for Quill editor
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // First, handle code blocks (```) before other processing
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`
  })
  
  // Handle headers (must be done before other inline processing)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  // Handle bold text (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  
  // Handle italic text (*text* or _text_) - must come after bold
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
  
  // Handle inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // Handle links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  
  // Process line by line for lists and paragraphs
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  let listType = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip empty lines
    if (!trimmed) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        inList = false
        listType = ''
      }
      processedLines.push('')
      continue
    }
    
    // Check for bullet list (- item or * item)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        processedLines.push('<ul>')
        inList = true
        listType = 'ul'
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    // Check for numbered list (1. item)
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
        processedLines.push('<ol>')
        inList = true
        listType = 'ol'
      }
      processedLines.push(`<li>${numberedMatch[1]}</li>`)
      continue
    }
    
    // Close any open list
    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
      listType = ''
    }
    
    // Skip if already an HTML tag
    if (trimmed.startsWith('<')) {
      processedLines.push(trimmed)
      continue
    }
    
    // Wrap in paragraph
    processedLines.push(`<p>${trimmed}</p>`)
  }
  
  // Close any remaining open list
  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>')
  }
  
  return processedLines.join('')
}

// Leaf AI Panel Component
interface LeafAIPanelProps {
  isOpen: boolean
  onClose: () => void
  noteTitle: string
  noteContent: string
  onInsertContent: (content: string) => void
}

function LeafAIPanel({ isOpen, onClose, noteTitle, noteContent, onInsertContent }: LeafAIPanelProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'light' | 'heavy'>('light')
  const [activeTab, setActiveTab] = useState<'chat' | 'generate'>('chat')
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [panelWidth, setPanelWidth] = useState(384) // 24rem = 384px
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      // Min 320px, Max 800px
      setPanelWidth(Math.max(320, Math.min(800, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

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
          noteContent,
          noteTitle,
          userMessage,
          mode,
          action: 'chat'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Friendly message for rate limits
        if (response.status === 429) {
          throw new Error('🕐 AI is busy right now. Please wait a minute and try again.')
        }
        throw new Error(data.error || 'Failed to get response')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.message }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!generatePrompt.trim() || isLoading) return

    setIsLoading(true)
    setGeneratedContent('')

    try {
      const response = await fetch('/api/notes/leafai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteContent,
          noteTitle,
          userMessage: generatePrompt,
          mode,
          action: 'generate'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setGeneratedContent(data.response)
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      setGeneratedContent(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInsertGenerated = () => {
    if (generatedContent && !generatedContent.startsWith('Error:')) {
      onInsertContent(generatedContent)
      setGeneratedContent('')
      setGeneratePrompt('')
    }
  }

  if (!isOpen) return null

  return (
    <div 
      ref={panelRef}
        className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
        style={{ width: panelWidth }}
      >
        {/* Resize Handle - Always visible with drag indicator */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-gray-100 hover:bg-emerald-100 border-r border-gray-200 transition-colors group flex items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
        >
          {/* Two vertical lines indicator */}
          <div className="flex gap-0.5">
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-emerald-400 rounded-full transition-colors" />
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-emerald-400 rounded-full transition-colors" />
          </div>
        </div>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Leaf AI</h3>
                <p className="text-xs text-white/80">Your writing assistant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✨ Generate
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' ? (
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Ask me anything!</h4>
                    <p className="text-sm text-gray-500">I can help you understand and improve your notes.</p>
                  </div>
                )}
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div 
                          className="text-sm prose prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm"
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

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
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
                    placeholder="Ask about your note..."
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Generate Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      What would you like me to write?
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as 'light' | 'heavy')}
                      className="px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 text-xs bg-white cursor-pointer"
                    >
                      <option value="light">Basic</option>
                      <option value="heavy">Pro</option>
                    </select>
                  </div>
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="e.g., Tips and tricks for writing good character development..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm resize-none"
                    rows={3}
                    disabled={isLoading}
                  />
                </div>

                {/* Quick Suggestions */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Expand on this topic', 'Add examples', 'Create an outline', 'Summarize key points'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setGeneratePrompt(suggestion)}
                        className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !generatePrompt.trim()}
                  className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Generate Content
                  </>
                )}
              </button>

              {/* Generated Content Preview */}
              {generatedContent && (
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Generated Content</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGeneratedContent('')}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleInsertGenerated}
                        className="px-3 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Insert into Note
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div 
                      className="text-sm text-gray-700 prose prose-sm max-w-none [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm"
                      dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(generatedContent) }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface NotesClientProps {
  project: Project
  notes: Note[]
  projectId: string
  createNoteAction: (formData: FormData) => Promise<{ id: string; title: string; content: string; created_at: string; updated_at: string }>
  deleteNoteAction: (formData: FormData) => Promise<void>
  updateNoteAction: (formData: FormData) => Promise<void>
}

// Extended note type for summaries
interface ExtendedNote extends Note {
  isSummary?: boolean
  sourceType?: 'note' | 'pdf'
  sourceName?: string
}

export default function NotesClient({ 
  project, 
  notes, 
  projectId, 
  createNoteAction, 
  deleteNoteAction, 
  updateNoteAction 
}: NotesClientProps) {
  const [selectedNote, setSelectedNote] = useState<ExtendedNote | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  // Initialize localNotes with isSummary flag properly set
  const [localNotes, setLocalNotes] = useState<ExtendedNote[]>(() => 
    notes.map(note => ({
      ...note,
      isSummary: note.title?.startsWith('Summary:') || false
    }))
  )
  const [showSummarizeModal, setShowSummarizeModal] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedNotesForFolder, setSelectedNotesForFolder] = useState<Set<string>>(new Set())
  const [isManagingFolders, setIsManagingFolders] = useState(false)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const folderDropdownRef = useRef<HTMLDivElement>(null)

  // Sync notes from server while preserving local changes
  useEffect(() => {
    setLocalNotes(prevLocal => {
      // Create a map of local notes for quick lookup
      const localMap = new Map(prevLocal.map(n => [n.id, n]))
      
      // Merge server notes with local notes (server wins for most fields, but preserve local folder if it was recently changed)
      return notes.map(serverNote => {
        const localNote = localMap.get(serverNote.id)
        if (localNote) {
          // Merge: prefer server data but keep local isSummary, sourceType, sourceName flags
          return {
            ...serverNote,
            isSummary: localNote.isSummary || serverNote.title?.startsWith('Summary:'),
            sourceType: localNote.sourceType,
            sourceName: localNote.sourceName
          }
        }
        return {
          ...serverNote,
          isSummary: serverNote.title?.startsWith('Summary:')
        }
      })
    })
  }, [notes])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false)
      }
    }
    if (showFolderDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFolderDropdown])

  // Get unique folders from notes
  const folders = useMemo(() => {
    const folderSet = new Set<string>()
    localNotes.forEach(note => {
      if (note.folder) folderSet.add(note.folder)
    })
    return Array.from(folderSet).sort()
  }, [localNotes])

  // Group notes by folder
  const notesByFolder = useMemo(() => {
    const grouped: Record<string, ExtendedNote[]> = { 'Ungrouped': [] }
    folders.forEach(folder => { grouped[folder] = [] })
    
    localNotes.forEach(note => {
      if (note.folder && grouped[note.folder]) {
        grouped[note.folder].push(note)
      } else {
        grouped['Ungrouped'].push(note)
      }
    })
    
    return grouped
  }, [localNotes, folders])

  const toggleFolderCollapse = (folder: string) => {
    setCollapsedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folder)) {
        newSet.delete(folder)
      } else {
        newSet.add(folder)
      }
      return newSet
    })
  }

  const handleNoteClick = (note: ExtendedNote) => {
    if (isManagingFolders) {
      setSelectedNotesForFolder(prev => {
        const newSet = new Set(prev)
        if (newSet.has(note.id)) {
          newSet.delete(note.id)
        } else {
          newSet.add(note.id)
        }
        return newSet
      })
    } else {
      setSelectedNote(note)
      setIsCreating(false)
    }
  }

  const handleCreateNew = () => {
    setIsCreating(true)
    setSelectedNote(null)
  }

  const handleBackToList = () => {
    setSelectedNote(null)
    setIsCreating(false)
  }

  const handleNoteCreated = (newNote: ExtendedNote) => {
    setLocalNotes(prev => [newNote, ...prev])
    setSelectedNote(newNote)
    setIsCreating(false)
  }

  const handleNoteUpdated = (updatedNote: ExtendedNote) => {
    setLocalNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n))
    setSelectedNote(updatedNote)
  }

  const handleNoteDeleted = (noteId: string) => {
    setLocalNotes(prev => prev.filter(n => n.id !== noteId))
    setSelectedNote(null)
  }

  const handleSummaryCreated = (summaryNote: ExtendedNote) => {
    setLocalNotes(prev => [summaryNote, ...prev])
    setShowSummarizeModal(false)
    setSelectedNote(summaryNote)
  }

  // Folder management functions
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    // Just add the folder name - notes will be moved to it
    setShowFolderModal(false)
    setNewFolderName('')
  }

  const handleMoveNotesToFolder = async (folderName: string | null) => {
    if (selectedNotesForFolder.size === 0) return
    
    // Get the notes to update
    const notesToUpdate = localNotes.filter(n => selectedNotesForFolder.has(n.id))
    
    // Update local state FIRST for immediate UI feedback
    setLocalNotes(prev => prev.map(note => {
      if (selectedNotesForFolder.has(note.id)) {
        return { ...note, folder: folderName }
      }
      return note
    }))
    
    // Clear selection and exit manage mode immediately
    const selectedIds = new Set(selectedNotesForFolder)
    setSelectedNotesForFolder(new Set())
    setIsManagingFolders(false)
    
    // Then update database in background
    for (const note of notesToUpdate) {
      const formData = new FormData()
      formData.append('noteId', note.id)
      formData.append('projectId', projectId)
      formData.append('title', note.title)
      formData.append('content', note.content || '')
      formData.append('folder', folderName || '')
      
      try {
        await updateNoteAction(formData)
      } catch (error) {
        console.error('Error moving note to folder:', error)
        // Revert on error
        setLocalNotes(prev => prev.map(n => {
          if (selectedIds.has(n.id)) {
            return { ...n, folder: note.folder }
          }
          return n
        }))
      }
    }
  }

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      setEditingFolder(null)
      return
    }
    
    const notesInFolder = localNotes.filter(n => n.folder === oldName)
    
    // Update local state FIRST
    setLocalNotes(prev => prev.map(note => {
      if (note.folder === oldName) {
        return { ...note, folder: newName }
      }
      return note
    }))
    
    setEditingFolder(null)
    setEditFolderName('')
    
    // Then update database in background
    for (const note of notesInFolder) {
      const formData = new FormData()
      formData.append('noteId', note.id)
      formData.append('projectId', projectId)
      formData.append('title', note.title)
      formData.append('content', note.content || '')
      formData.append('folder', newName)
      
      try {
        await updateNoteAction(formData)
      } catch (error) {
        console.error('Error renaming folder:', error)
      }
    }
  }

  const handleDeleteFolder = async (folderName: string) => {
    const notesInFolder = localNotes.filter(n => n.folder === folderName)
    
    // Update local state FIRST
    setLocalNotes(prev => prev.map(note => {
      if (note.folder === folderName) {
        return { ...note, folder: null }
      }
      return note
    }))
    
    // Then update database in background
    for (const note of notesInFolder) {
      const formData = new FormData()
      formData.append('noteId', note.id)
      formData.append('projectId', projectId)
      formData.append('title', note.title)
      formData.append('content', note.content || '')
      formData.append('folder', '')
      
      try {
        await updateNoteAction(formData)
      } catch (error) {
        console.error('Error removing folder:', error)
      }
    }
  }

  if (selectedNote) {
    return (
      <NoteEditor
        note={selectedNote}
        projectId={projectId}
        onBack={handleBackToList}
        updateNoteAction={updateNoteAction}
        deleteNoteAction={deleteNoteAction}
        onNoteUpdated={handleNoteUpdated}
        onNoteDeleted={handleNoteDeleted}
      />
    )
  }

  if (isCreating) {
    return (
      <CreateNote
        projectId={projectId}
        createNoteAction={createNoteAction}
        onBack={handleBackToList}
        onNoteCreated={handleNoteCreated}
      />
    )
  }

  return (
    <div className="bg-white">
      <div>
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">Create and organize your project notes</p>
          <div className="flex items-center gap-2">
            {isManagingFolders ? (
              <>
                <span className="text-sm text-gray-500">
                  {selectedNotesForFolder.size} selected
                </span>
                {selectedNotesForFolder.size > 0 && (
                  <div className="relative" ref={folderDropdownRef}>
                    <button
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Move to Folder
                      <svg className={`w-4 h-4 transition-transform ${showFolderDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Dropdown */}
                    {showFolderDropdown && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => {
                          handleMoveNotesToFolder(null)
                          setShowFolderDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Remove from folder
                      </button>
                      {folders.map(folder => (
                        <button
                          key={folder}
                          onClick={() => {
                            handleMoveNotesToFolder(folder)
                            setShowFolderDropdown(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {folder}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          setShowFolderModal(true)
                          setShowFolderDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Folder
                      </button>
                    </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsManagingFolders(false)
                    setSelectedNotesForFolder(new Set())
                  }}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsManagingFolders(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Organize
                </button>
                <button
                  onClick={() => setShowSummarizeModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Summarize
                </button>
              </>
            )}
          </div>
        </div>

        {/* Folders Section */}
        {folders.length > 0 && (
          <div className="space-y-4 mb-6">
            {folders.map(folder => (
              <div key={folder} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Folder Header */}
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleFolderCollapse(folder)}
                >
                  <div className="flex items-center gap-3">
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform ${collapsedFolders.has(folder) ? '' : 'rotate-90'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    {editingFolder === folder ? (
                      <input
                        type="text"
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onBlur={() => handleRenameFolder(folder, editFolderName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameFolder(folder, editFolderName)
                          if (e.key === 'Escape') setEditingFolder(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 border border-blue-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{folder}</span>
                    )}
                    <span className="text-sm text-gray-500">({notesByFolder[folder]?.length || 0})</span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingFolder(folder)
                        setEditFolderName(folder)
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Rename folder"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete folder "${folder}"? Notes will be moved to Ungrouped.`)) {
                          handleDeleteFolder(folder)
                        }
                      }}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete folder"
                    >
                      <svg className="w-4 h-4 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Folder Content */}
                {!collapsedFolders.has(folder) && notesByFolder[folder]?.length > 0 && (
                  <div className="p-3 bg-white">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {notesByFolder[folder].map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onClick={() => handleNoteClick(note)}
                          isSelected={selectedNotesForFolder.has(note.id)}
                          isSelectable={isManagingFolders}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ungrouped Notes Section */}
        <div className="mb-6">
          {folders.length > 0 && notesByFolder['Ungrouped']?.length > 0 && (
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ungrouped Notes
            </h3>
          )}
          
          {/* Notes Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {/* Create New Note Card */}
            <button
              onClick={handleCreateNew}
              className="aspect-square bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center mb-2 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600">New Note</span>
            </button>

            {/* Ungrouped Notes */}
            {notesByFolder['Ungrouped']?.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleNoteClick(note)}
                isSelected={selectedNotesForFolder.has(note.id)}
                isSelectable={isManagingFolders}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {localNotes.length === 0 && (
          <div className="text-center py-12 mt-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new note.</p>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Week 1, Chapter 1, Midterm"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  handleMoveNotesToFolder(newFolderName.trim())
                  setShowFolderModal(false)
                  setNewFolderName('')
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFolderModal(false)
                  setNewFolderName('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    handleMoveNotesToFolder(newFolderName.trim())
                    setShowFolderModal(false)
                    setNewFolderName('')
                  }
                }}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Create & Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Summarize Modal */}
      {showSummarizeModal && (
        <GlobalSummarizeModal
          projectId={projectId}
          notes={localNotes.filter(n => !n.isSummary)}
          onClose={() => setShowSummarizeModal(false)}
          onSummaryCreated={handleSummaryCreated}
          createNoteAction={createNoteAction}
        />
      )}
    </div>
  )
}

// Note Card Component
interface NoteCardProps {
  note: ExtendedNote
  onClick: () => void
  isSelected?: boolean
  isSelectable?: boolean
}

function NoteCard({ note, onClick, isSelected = false, isSelectable = false }: NoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  // Strip HTML tags for preview
  const getPlainText = (html: string) => {
    if (typeof window === 'undefined') return html
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }

  // Check if note title starts with "Summary:" to detect summary notes
  const isSummaryNote = note.isSummary || note.title?.startsWith('Summary:')
  // Check if note has an AI-generated summary saved
  const hasSavedSummary = !!note.summary

  return (
    <button
      onClick={onClick}
      className={`aspect-square bg-white border-2 rounded-xl hover:shadow-md transition-all text-left overflow-hidden group relative ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Selection Checkbox */}
      {isSelectable && (
        <div className="absolute top-1.5 right-1.5 z-20">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : 'bg-white border-gray-300 group-hover:border-blue-400'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Badges */}
      <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex gap-1 flex-wrap">
        {isSummaryNote && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-medium rounded">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Summary
          </span>
        )}
        {hasSavedSummary && !isSummaryNote && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-medium rounded">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI
          </span>
        )}
      </div>
      
      <div className="h-full flex flex-col p-3">
        <div className={`flex-1 overflow-hidden ${(isSummaryNote || hasSavedSummary) ? 'mt-4' : ''}`}>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm">
            {note.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-3">
            {getPlainText(note.content || 'No content')}
          </p>
        </div>
        <div className="mt-auto pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </button>
  )
}

// Create Note Component with Quill Editor
interface CreateNoteProps {
  projectId: string
  createNoteAction: (formData: FormData) => Promise<{ id: string; title: string; content: string; created_at: string; updated_at: string }>
  onBack: () => void
  onNoteCreated?: (note: Note) => void
}

function CreateNote({ projectId, createNoteAction, onBack, onNoteCreated }: CreateNoteProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showLeafAI, setShowLeafAI] = useState(true) // Auto-open Leaf AI when creating note
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMusicPlayer, setShowMusicPlayer] = useState(false)
  
  // Debounced content for auto-save
  const debouncedContent = useDebounce(content, 2000)
  const debouncedTitle = useDebounce(title, 2000)

  // Auto-save effect
  useEffect(() => {
    const autoSave = async () => {
      if (!title.trim() || !noteId) return
      
      setAutoSaveStatus('saving')
      const formData = new FormData()
      formData.append('noteId', noteId)
      formData.append('projectId', projectId)
      formData.append('title', title)
      formData.append('content', content)

      try {
        // We'll need to create the note first, then update
        setAutoSaveStatus('saved')
      } catch (error) {
        console.error('Auto-save error:', error)
        setAutoSaveStatus('unsaved')
      }
    }

    if (debouncedContent !== '' || debouncedTitle !== '') {
      setAutoSaveStatus('unsaved')
    }
  }, [debouncedContent, debouncedTitle, noteId, projectId, title, content])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', content)

    try {
      await createNoteAction(formData)
      onBack()
    } catch (error) {
      console.error('Error creating note:', error)
      alert('Failed to create note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInsertContent = (newContent: string) => {
    const htmlContent = convertMarkdownToHtml(newContent)
    setContent(prev => prev + htmlContent)
  }

  return (
    <div className={`bg-white min-h-[calc(100vh-8rem)] transition-all ${showLeafAI && !isFullscreen ? 'mr-96' : ''}`}>
      {/* Fullscreen Editor Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title..."
                className="text-xl font-semibold text-gray-900 placeholder-gray-400 bg-transparent border-none focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Music Button */}
              <button
                onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105 ${
                  showMusicPlayer ? 'ring-2 ring-white/50' : ''
                }`}
                title="Toggle music player"
              >
                <Music className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white">Music</span>
              </button>
              {/* Exit Fullscreen Button */}
              <button
                onClick={() => {
                  setIsFullscreen(false)
                  setShowMusicPlayer(false)
                }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                title="Exit fullscreen"
              >
                <Minimize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Fullscreen Editor */}
          <div className="flex-1 overflow-hidden">
            <div className="note-editor-container h-full">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your notes..."
                className="h-full"
              />
            </div>
          </div>
          
          {/* Music Player */}
          <MusicPlayer isOpen={showMusicPlayer} onClose={() => setShowMusicPlayer(false)} />
        </div>
      )}

      {/* Clean Header */}
      <div className="border-b border-gray-100 sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <span className="text-sm text-gray-500">New Note</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaf AI Toggle */}
            <button
              onClick={() => setShowLeafAI(!showLeafAI)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                showLeafAI
                  ? 'bg-emerald-500 text-white'
                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Leaf AI
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="py-6">
        {/* Title Input */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            className="w-full text-2xl md:text-3xl font-semibold text-gray-900 placeholder-gray-400 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none pb-3 transition-colors"
          />
        </div>
        
        {/* Quill Editor */}
        <div className="note-editor-container rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm relative max-h-[70vh] overflow-y-auto">
          {/* Fullscreen Toggle Button */}
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-white/90 hover:bg-gray-100 rounded-lg shadow-sm border border-gray-200 transition-colors"
              title="Enter fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            modules={quillModules}
            formats={quillFormats}
            placeholder="Start writing your notes..."
          />
        </div>
      </div>

      {/* Leaf AI Panel */}
      <LeafAIPanel
        isOpen={showLeafAI && !isFullscreen}
        onClose={() => setShowLeafAI(false)}
        noteTitle={title}
        noteContent={content}
        onInsertContent={handleInsertContent}
      />
    </div>
  )
}

// Note Editor Component with Summarization and Quill
interface NoteEditorProps {
  note: Note
  projectId: string
  onBack: () => void
  updateNoteAction: (formData: FormData) => Promise<void>
  deleteNoteAction: (formData: FormData) => Promise<void>
  onNoteUpdated?: (note: Note) => void
  onNoteDeleted?: (noteId: string) => void
}

function NoteEditor({ note, projectId, onBack, updateNoteAction, deleteNoteAction, onNoteUpdated, onNoteDeleted }: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryType, setSummaryType] = useState<'concise' | 'bullet' | 'detailed'>(note.summary_type || 'concise')
  const [inlineSummary, setInlineSummary] = useState(note.summary || '')
  const [summaryError, setSummaryError] = useState('')
  const [showLeafAI, setShowLeafAI] = useState(true) // Auto-open Leaf AI when note opens
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMusicPlayer, setShowMusicPlayer] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  
  // Debounced values for auto-save
  const debouncedContent = useDebounce(content, 2000)
  const debouncedTitle = useDebounce(title, 2000)

  useEffect(() => {
    if (viewRef.current && !isEditing) {
      viewRef.current.innerHTML = note.content || '<p class="text-gray-400">No content</p>'
    }
  }, [note.content, isEditing])

  // Auto-scroll to summary when generated
  useEffect(() => {
    if (inlineSummary && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [inlineSummary])

  // Auto-save effect
  useEffect(() => {
    const performAutoSave = async () => {
      if (!isEditing) return
      if (debouncedTitle === note.title && debouncedContent === (note.content || '')) return
      if (!debouncedTitle.trim()) return

      setAutoSaveStatus('saving')
      const formData = new FormData()
      formData.append('noteId', note.id)
      formData.append('projectId', projectId)
      formData.append('title', debouncedTitle)
      formData.append('content', debouncedContent)

      try {
        await updateNoteAction(formData)
        setAutoSaveStatus('saved')
        if (onNoteUpdated) {
          onNoteUpdated({ ...note, title: debouncedTitle, content: debouncedContent, updated_at: new Date().toISOString() })
        }
      } catch (error) {
        console.error('Auto-save error:', error)
        setAutoSaveStatus('unsaved')
      }
    }

    performAutoSave()
  }, [debouncedContent, debouncedTitle, isEditing, note, projectId, updateNoteAction, onNoteUpdated])

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && (title !== note.title || content !== (note.content || ''))) {
      setAutoSaveStatus('unsaved')
    }
  }, [title, content, isEditing, note])

  const handleEdit = () => {
    setIsEditing(true)
    setContent(note.content || '')
  }

  const handleSave = async () => {
    setIsSaving(true)
    const formData = new FormData()
    formData.append('noteId', note.id)
    formData.append('projectId', projectId)
    formData.append('title', title)
    formData.append('content', content)

    try {
      await updateNoteAction(formData)
      setIsEditing(false)
      if (onNoteUpdated) {
        onNoteUpdated({ ...note, title, content, updated_at: new Date().toISOString() })
      }
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to update note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTitle(note.title)
    setContent(note.content || '')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    setIsDeleting(true)
    const formData = new FormData()
    formData.append('noteId', note.id)
    formData.append('projectId', projectId)

    try {
      await deleteNoteAction(formData)
      if (onNoteDeleted) {
        onNoteDeleted(note.id)
      }
      onBack()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note. Please try again.')
      setIsDeleting(false)
    }
  }

  const handleInlineSummarize = async () => {
    const currentContent = isEditing ? content : note.content
    if (!currentContent || currentContent.replace(/<[^>]*>/g, '').trim().length < 50) {
      setSummaryError('Please add more content before summarizing (at least 50 characters).')
      return
    }

    setIsSummarizing(true)
    setSummaryError('')
    setInlineSummary('')

    try {
      const response = await fetch('/api/notes/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentContent,
          noteId: note.id,
          projectId,
          summaryType
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to summarize')
      }

      const data = await response.json()
      setInlineSummary(data.summary)
      
      // Update note object with new summary (so it persists in parent state)
      if (onNoteUpdated) {
        onNoteUpdated({
          ...note,
          summary: data.summary,
          summary_type: summaryType,
          summary_generated_at: new Date().toISOString()
        })
      }
      
      // Dispatch event to refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      setSummaryError(error.message)
    } finally {
      setIsSummarizing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleInsertContent = (newContent: string) => {
    const htmlContent = convertMarkdownToHtml(newContent)
    setContent(prev => prev + htmlContent)
    // Auto-switch to edit mode when content is inserted
    if (!isEditing) {
      setIsEditing(true)
    }
    setAutoSaveStatus('unsaved')
  }

  return (
    <div className={`bg-white min-h-[calc(100vh-8rem)] transition-all ${showLeafAI && !isFullscreen ? 'mr-96' : ''}`}>
      {/* Fullscreen Editor Overlay */}
      {isFullscreen && isEditing && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title..."
                className="text-xl font-semibold text-gray-900 placeholder-gray-400 bg-transparent border-none focus:outline-none"
              />
              {/* Auto-save status */}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                autoSaveStatus === 'saved' ? 'bg-green-100 text-green-600' :
                autoSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {autoSaveStatus === 'saved' ? '✓ Saved' :
                 autoSaveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Music Button */}
              <button
                onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-105 ${
                  showMusicPlayer ? 'ring-2 ring-white/50' : ''
                }`}
                title="Toggle music player"
              >
                <Music className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white">Music</span>
              </button>
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              {/* Exit Fullscreen Button */}
              <button
                onClick={() => {
                  setIsFullscreen(false)
                  setShowMusicPlayer(false)
                }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
                title="Exit fullscreen"
              >
                <Minimize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Fullscreen Editor */}
          <div className="flex-1 overflow-hidden">
            <div className="note-editor-container h-full">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your notes..."
                className="h-full"
              />
            </div>
          </div>
          
          {/* Music Player */}
          <MusicPlayer isOpen={showMusicPlayer} onClose={() => setShowMusicPlayer(false)} />
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-100 sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 truncate max-w-xs">{note.title}</span>
              {/* Auto-save status */}
              {isEditing && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  autoSaveStatus === 'saved' ? 'bg-green-100 text-green-600' :
                  autoSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {autoSaveStatus === 'saved' ? '✓ Saved' :
                   autoSaveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Leaf AI Toggle */}
            <button
              onClick={() => setShowLeafAI(!showLeafAI)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                showLeafAI
                  ? 'bg-emerald-500 text-white'
                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="hidden sm:inline">Leaf AI</span>
            </button>
            
            {/* Inline Summarize Button */}
            <button
              onClick={handleInlineSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              title="Summarize this note"
            >
              {isSummarizing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Summarizing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Summarize</span>
                </>
              )}
            </button>
            
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Type Selector (when not summarizing) */}
      {!isSummarizing && !inlineSummary && (
        <div className="py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Summary type:</span>
            <div className="flex gap-2">
              {[
                { value: 'concise', label: 'Concise' },
                { value: 'bullet', label: 'Bullet Points' },
                { value: 'detailed', label: 'Detailed' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSummaryType(type.value as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    summaryType === type.value
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="py-6">
        {isEditing ? (
          <>
            {/* Title Input for Edit Mode */}
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter note title..."
                className="w-full text-2xl md:text-3xl font-semibold text-gray-900 placeholder-gray-400 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none pb-3 transition-colors"
              />
            </div>
            
            {/* Quill Editor for Edit Mode */}
            <div className="note-editor-container rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm relative max-h-[70vh] overflow-y-auto">
              {/* Fullscreen Toggle Button */}
              <div className="absolute top-2 right-2 z-20">
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 bg-white/90 hover:bg-gray-100 rounded-lg shadow-sm border border-gray-200 transition-colors"
                  title="Enter fullscreen"
                >
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Start writing your notes..."
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-8 md:p-12">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-100">{note.title}</h1>
              <div
                ref={viewRef}
                className="text-base text-gray-700 leading-relaxed prose max-w-none"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              
              <div className="mt-12 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Created {formatDate(note.created_at)}</span>
                  {note.created_at !== note.updated_at && (
                    <span>Edited {formatDate(note.updated_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {summaryError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {summaryError}
            <button 
              onClick={() => setSummaryError('')}
              className="ml-2 text-red-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Inline Summary Section */}
        {inlineSummary && (
          <div 
            ref={summaryRef}
            className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 overflow-hidden"
          >
            <div className="p-4 border-b border-purple-200 bg-purple-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-semibold text-purple-900">AI Summary</span>
                  <span className="text-xs text-purple-600 bg-purple-200 px-2 py-0.5 rounded-full capitalize">{summaryType}</span>
                </div>
                <button
                  onClick={() => setInlineSummary('')}
                  className="p-1 hover:bg-purple-200 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div 
              className="p-6 prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: inlineSummary }}
            />
          </div>
        )}
      </div>

      {/* Leaf AI Panel */}
      <LeafAIPanel
        isOpen={showLeafAI && !isFullscreen}
        onClose={() => setShowLeafAI(false)}
        noteTitle={note.title}
        noteContent={isEditing ? content : (note.content || '')}
        onInsertContent={handleInsertContent}
      />
    </div>
  )
}

// Global Summarize Modal - For creating new summary notes from notes or PDFs
interface GlobalSummarizeModalProps {
  projectId: string
  notes: ExtendedNote[]
  onClose: () => void
  onSummaryCreated: (note: ExtendedNote) => void
  createNoteAction: (formData: FormData) => Promise<{ id: string; title: string; content: string; created_at: string; updated_at: string }>
}

function GlobalSummarizeModal({ projectId, notes, onClose, onSummaryCreated, createNoteAction }: GlobalSummarizeModalProps) {
  const [sourceType, setSourceType] = useState<'note' | 'pdf'>('note')
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState('')
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [summaryType, setSummaryType] = useState<'concise' | 'bullet' | 'detailed' | 'findings' | 'keypoints'>('concise')
  const [citationStyle, setCitationStyle] = useState<'none' | 'apa' | 'mla' | 'chicago'>('none')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedNote = notes.find(n => n.id === selectedNoteId)

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setSummaryError('Please upload a PDF file')
      return
    }

    setPdfFile(file)
    setIsExtractingPdf(true)
    setSummaryError('')

    try {
      // Use pdf.js to extract text from PDF
      const pdfjs = await import('pdfjs-dist')
      
      // Try multiple worker sources
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
      ]
      
      // Test which URL is accessible
      let workingUrl = ''
      for (const url of workerUrls) {
        try {
          const response = await fetch(url, { method: 'HEAD' })
          if (response.ok) {
            workingUrl = url
            break
          }
        } catch (err) {
          // URL failed, try next
        }
      }
      
      if (!workingUrl) {
        // Disable worker and use main thread (slower but works)
        pdfjs.GlobalWorkerOptions.workerSrc = ''
      } else {
        pdfjs.GlobalWorkerOptions.workerSrc = workingUrl
      }

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n\n'
      }

      if (fullText.trim().length < 50) {
        throw new Error('Could not extract enough text from the PDF. The file may be scanned or image-based.')
      }

      setPdfText(fullText)
    } catch (error: any) {
      setSummaryError(error.message || 'Failed to extract text from PDF')
      setPdfFile(null)
    } finally {
      setIsExtractingPdf(false)
    }
  }

  const handleSummarize = async () => {
    let content = ''
    let sourceName = ''

    if (sourceType === 'note') {
      if (!selectedNote) {
        setSummaryError('Please select a note to summarize')
        return
      }
      content = selectedNote.content || ''
      sourceName = selectedNote.title
    } else {
      if (!pdfText) {
        setSummaryError('Please upload a PDF file first')
        return
      }
      content = pdfText
      sourceName = pdfFile?.name || 'PDF'
    }

    if (content.replace(/<[^>]*>/g, '').trim().length < 50) {
      setSummaryError('Content is too short to summarize (minimum 50 characters)')
      return
    }

    setIsSummarizing(true)
    setSummaryError('')
    setSummary('')

    try {
      const response = await fetch('/api/notes/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          projectId,
          summaryType,
          citationStyle,
          sourceName
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to summarize')
      }

      const data = await response.json()
      setSummary(data.summary)
      
      // Dispatch event to refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      setSummaryError(error.message)
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleSaveAsSummaryNote = async () => {
    if (!summary) return

    setIsSaving(true)
    const sourceName = sourceType === 'note' 
      ? selectedNote?.title || 'Note' 
      : pdfFile?.name || 'PDF'

    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('title', `Summary: ${sourceName}`)
      formData.append('content', summary)

      // Get the created note with real UUID from the server
      const createdNote = await createNoteAction(formData)
      
      // Use the real note data from the server
      const newNote: ExtendedNote = {
        id: createdNote.id,
        title: createdNote.title,
        content: createdNote.content,
        created_at: createdNote.created_at,
        updated_at: createdNote.updated_at,
        isSummary: true,
        sourceType,
        sourceName
      }

      onSummaryCreated(newNote)
    } catch (error: any) {
      setSummaryError('Failed to save summary as note')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Summarize</h2>
                <p className="text-sm text-gray-500">Create a summary from notes or PDF</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Source Type Selection */}
          {!summary && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Summarize from</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSourceType('note')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      sourceType === 'note'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">Existing Note</div>
                        <div className="text-xs text-gray-500">Summarize one of your notes</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSourceType('pdf')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      sourceType === 'pdf'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">PDF Upload</div>
                        <div className="text-xs text-gray-500">Extract & summarize PDF content</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Note Selection */}
              {sourceType === 'note' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select a note</label>
                  {notes.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-xl text-gray-500 text-sm text-center">
                      No notes available. Create a note first.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {notes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                            selectedNoteId === note.id ? 'bg-purple-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedNoteId === note.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                            }`}>
                              {selectedNoteId === note.id && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{note.title}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {(note.content || '').replace(/<[^>]*>/g, '').slice(0, 60)}...
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PDF Upload */}
              {sourceType === 'pdf' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload PDF</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  {!pdfFile ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">Click to upload PDF</span>
                        <span className="text-xs text-gray-400">Max file size: 10MB</span>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <div className="font-medium text-gray-900">{pdfFile.name}</div>
                            <div className="text-xs text-gray-500">
                              {isExtractingPdf ? 'Extracting text...' : `${Math.round(pdfText.length / 1000)}K characters extracted`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPdfFile(null)
                            setPdfText('')
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {isExtractingPdf && (
                        <div className="mt-3">
                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Summary Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Summary Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'concise', label: 'Concise', desc: '2-3 paragraphs' },
                    { value: 'bullet', label: 'Bullet Points', desc: 'Key points' },
                    { value: 'detailed', label: 'Detailed', desc: 'Comprehensive' },
                    { value: 'findings', label: 'Findings', desc: 'Research findings' },
                    { value: 'keypoints', label: 'Key Points', desc: 'Main takeaways' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSummaryType(type.value as any)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        summaryType === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Citation Style Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Citation Style (Optional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'none', label: 'None', desc: 'No citations' },
                    { value: 'apa', label: 'APA', desc: '7th Edition' },
                    { value: 'mla', label: 'MLA', desc: '9th Edition' },
                    { value: 'chicago', label: 'Chicago', desc: '17th Edition' }
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setCitationStyle(style.value as any)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        citationStyle === style.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{style.label}</div>
                      <div className="text-xs text-gray-500">{style.desc}</div>
                    </button>
                  ))}
                </div>
                {citationStyle !== 'none' && (
                  <p className="text-xs text-indigo-600 mt-2">
                    📚 Bibliography will be included in {citationStyle.toUpperCase()} format
                  </p>
                )}
              </div>
            </>
          )}

          {/* Error Display */}
          {summaryError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {summaryError}
            </div>
          )}

          {/* Summary Result */}
          {summary && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Generated Summary</label>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full capitalize">{summaryType}</span>
                </div>
                <div 
                  className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 prose max-w-none text-sm max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: summary }}
                />
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">
                  This summary will be saved as a new note titled "Summary: {sourceType === 'note' ? selectedNote?.title : pdfFile?.name}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          {summary ? (
            <button
              onClick={handleSaveAsSummaryNote}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save as Note
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSummarize}
              disabled={isSummarizing || isExtractingPdf || (sourceType === 'note' && !selectedNoteId) || (sourceType === 'pdf' && !pdfText)}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-xl hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSummarizing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Summarizing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Summary
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}