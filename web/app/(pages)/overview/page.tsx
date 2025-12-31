'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Search,
  Send,
  Sparkles,
  Globe,
  GraduationCap,
  Lightbulb,
  ArrowRight,
  ExternalLink,
  Plus,
  BookOpen,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  XCircle,
  Zap,
  Brain,
  Paperclip,
  File,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Lock,
  Crown,
  Menu
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import GlobalSidebar from '@/components/GlobalSidebar'
import ChatsPanel from '@/components/ChatsPanel'
import MobileNav from '@/components/MobileNav'

interface Citation {
  number: number
  title: string
  url: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  studySetCreated?: {
    id: string
    title: string
    itemCount: number
  }
  timestamp: Date
}

interface ChatConversation {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

interface Profile {
  name: string
  email: string
  subscription_tier?: string
}

interface StudyItem {
  id: string
  item_type: 'flashcard' | 'quiz'
  front?: string
  back?: string
  question?: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  correct_answer?: string
  explanation?: string
}

interface StudySetData {
  id: string
  title: string
  items: StudyItem[]
}

export default function GlobalOverviewPage() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showChatsPanel, setShowChatsPanel] = useState(false)
  
  // Search mode: 'fast' (llama-3.1-8b) or 'research' (llama-3.3-70b)
  const [searchMode, setSearchMode] = useState<'fast' | 'research'>('fast')
  
  // File attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Study set popup state
  const [showStudySetPopup, setShowStudySetPopup] = useState(false)
  const [activeStudySet, setActiveStudySet] = useState<StudySetData | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null)
  const [isLoadingStudySet, setIsLoadingStudySet] = useState(false)
  
  // Research limit tracking for free users
  const [researchUsed, setResearchUsed] = useState(0)
  const [researchLimit, setResearchLimit] = useState(3)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [query])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Allow anonymous users - don't redirect
      if (!user) {
        // Set anonymous state
        setUserId(null)
        setProfile({
          name: 'Guest',
          email: '',
          subscription_tier: 'anonymous'
        })
        setIsLoading(false)
        return
      }
      
      setUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single()

      // Fetch subscription tier
      let subscriptionTier = 'free'
      try {
        const res = await fetch('/api/subscription')
        if (res.ok) {
          const data = await res.json()
          subscriptionTier = data.subscription?.subscription_tier || 'free'
        }
      } catch (e) {}

      setProfile({
        name: profileData?.name || '',
        email: profileData?.email || user.email || '',
        subscription_tier: subscriptionTier
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      // On error, still allow anonymous access
      setProfile({
        name: 'Guest',
        email: '',
        subscription_tier: 'anonymous'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date()
    }

    // Build messages with user message first
    const messagesWithUser = [...messages, userMessage]
    setMessages(messagesWithUser)
    setQuery('')
    setIsSearching(true)
    setSearchStatus('Starting search...')

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Create a placeholder for the assistant message that we'll stream into
    const assistantMessageId = (Date.now() + 1).toString()
    let streamedContent = ''
    let streamedCitations: Citation[] = []
    let streamedStudySet: { id: string; title: string; itemCount: number } | undefined

    try {
      // Prepare file contents if attached
      let fileContents: { name: string; content: string; type: string }[] = []
      for (const file of attachedFiles) {
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          const text = await file.text()
          fileContents.push({ name: file.name, content: text, type: file.type })
        }
      }

      const response = await fetch('/api/leafai/search-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          query: userMessage.content,
          projectId: null, // Global search
          projectName: 'Global',
          searchMode,
          files: fileContents,
          userId, // Pass user ID for study set creation
          // Pass conversation history for context
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      // Clear attached files after sending
      setAttachedFiles([])

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response stream')
      }

      // Add empty assistant message that we'll update
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        citations: [],
        timestamp: new Date()
      }])

      // Process the SSE stream
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete events in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            continue
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Handle different event types based on the data structure
              if (data.step && data.message) {
                // Status update
                setSearchStatus(data.message)
              } else if (data.citations) {
                // Citations received
                streamedCitations = data.citations
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, citations: streamedCitations }
                    : m
                ))
              } else if (data.content !== undefined) {
                // Text chunk - append to content
                streamedContent += data.content
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, content: streamedContent }
                    : m
                ))
              } else if (data.id && data.title && data.itemCount !== undefined) {
                // Study set created event
                streamedStudySet = { id: data.id, title: data.title, itemCount: data.itemCount }
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, studySetCreated: streamedStudySet }
                    : m
                ))
              } else if (data.success !== undefined) {
                // Done event
                setSearchStatus('')
              } else if (data.type === 'rate_limit') {
                // Rate limit error for anonymous users
                throw new Error(`⏱️ ${data.message}`)
              } else if (data.remaining !== undefined && data.limit !== undefined && data.usedToday !== undefined) {
                // Research limit update for free users
                setResearchUsed(data.usedToday)
                setResearchLimit(data.limit)
              } else if (data.dailyLimitReached) {
                // Free user hit daily research limit - mode was downgraded
                setResearchUsed(3)
              } else if (data.message && !data.step) {
                // Error
                throw new Error(data.message)
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete data
            }
          }
        }
      }

      // Finalize the message
      const finalMessages = messagesWithUser.concat({
        id: assistantMessageId,
        role: 'assistant',
        content: streamedContent,
        citations: streamedCitations,
        studySetCreated: streamedStudySet,
        timestamp: new Date()
      })
      
      setMessages(finalMessages)

      // Save conversation with complete messages
      await saveConversation(finalMessages)

      // Refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => {
        // Replace the placeholder message with error, or add if not exists
        const hasPlaceholder = prev.some(m => m.id === assistantMessageId)
        if (hasPlaceholder) {
          return prev.map(m => m.id === assistantMessageId ? errorMessage : m)
        }
        return [...prev, errorMessage]
      })
    } finally {
      setIsSearching(false)
      setSearchStatus('')
    }
  }

  const saveConversation = async (msgs: Message[]) => {
    // Don't save for anonymous users
    if (!userId || profile?.subscription_tier === 'anonymous') {
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const title = msgs.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat'
      
      if (currentChatId) {
        // Update existing chat
        await supabase
          .from('chat_conversations')
          .update({
            messages: msgs,
            title,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentChatId)
      } else {
        // Create new chat
        const { data } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            title,
            messages: msgs,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (data) {
          setCurrentChatId(data.id)
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  const loadConversation = (chat: ChatConversation) => {
    setCurrentChatId(chat.id)
    setMessages(chat.messages)
    setShowChatsPanel(false)
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Study Set Popup Functions
  const openStudySet = async (studySetId: string) => {
    setIsLoadingStudySet(true)
    setShowStudySetPopup(true)
    setCurrentItemIndex(0)
    setShowAnswer(false)
    setSelectedQuizAnswer(null)

    try {
      // Fetch study set details
      const { data: studySet } = await supabase
        .from('study_sets')
        .select('id, title')
        .eq('id', studySetId)
        .single()

      // Fetch study items
      const { data: items } = await supabase
        .from('study_items')
        .select('*')
        .eq('study_set_id', studySetId)
        .order('item_order', { ascending: true })

      if (studySet && items) {
        setActiveStudySet({
          id: studySet.id,
          title: studySet.title,
          items: items as StudyItem[]
        })
      }
    } catch (error) {
      console.error('Error loading study set:', error)
    } finally {
      setIsLoadingStudySet(false)
    }
  }

  const closeStudySet = () => {
    setShowStudySetPopup(false)
    setActiveStudySet(null)
    setCurrentItemIndex(0)
    setShowAnswer(false)
    setSelectedQuizAnswer(null)
  }

  const nextItem = () => {
    if (activeStudySet && currentItemIndex < activeStudySet.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1)
      setShowAnswer(false)
      setSelectedQuizAnswer(null)
    }
  }

  const prevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1)
      setShowAnswer(false)
      setSelectedQuizAnswer(null)
    }
  }

  const handleQuizAnswer = (answer: string) => {
    setSelectedQuizAnswer(answer)
    setShowAnswer(true)
  }

  // Keyboard navigation for study set popup
  useEffect(() => {
    if (!showStudySetPopup) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextItem()
      } else if (e.key === 'ArrowLeft') {
        prevItem()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setShowAnswer(prev => !prev)
      } else if (e.key === 'Escape') {
        closeStudySet()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showStudySetPopup, currentItemIndex, activeStudySet])

  const quickActions = [
    { label: 'Explain a concept', icon: Lightbulb, query: 'Explain ' },
    { label: 'Create study set', icon: GraduationCap, query: 'Create a study set about ' },
    { label: 'Latest research', icon: Globe, query: 'What is the latest research on ' }
  ]

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-neutral-900">
        {/* Global Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <GlobalSidebar
            isPro={profile?.subscription_tier === 'pro'}
            isAnonymous={profile?.subscription_tier === 'anonymous'}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onChatsClick={() => setShowChatsPanel(!showChatsPanel)}
            onChatsHover={() => setShowChatsPanel(true)}
            onChatsClose={() => setShowChatsPanel(false)}
            activeItem={showChatsPanel ? 'chats' : 'overview'}
          />
        </div>

        {/* Mobile Navigation */}
        <MobileNav 
          onChatsClick={() => setShowChatsPanel(!showChatsPanel)}
        />

        {/* Chats Panel - only for logged in users */}
        {profile?.subscription_tier !== 'anonymous' && (
          <ChatsPanel
            isOpen={showChatsPanel}
            onClose={() => setShowChatsPanel(false)}
            onSelectChat={loadConversation}
            onNewChat={startNewChat}
            currentChatId={currentChatId}
          />
        )}

        {/* Main Content - Add bottom padding on mobile for nav */}
        <main className="lg:ml-[72px] min-h-screen flex flex-col pb-20 lg:pb-0">
          {/* Anonymous User Banner */}
          {profile?.subscription_tier === 'anonymous' && (
            <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-emerald-500/30 px-4 py-3">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-100">
                    <span className="font-medium">Try LeafAI!</span> Sign up for free to save chats, create spaces, and get unlimited searches.
                  </p>
                </div>
                <a 
                  href="/signup" 
                  className="flex-shrink-0 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium rounded-lg transition-colors"
                >
                  Sign up
                </a>
              </div>
            </div>
          )}
          
          {messages.length === 0 ? (
            /* Perplexity-style empty state */
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-12">
              {/* Logo */}
              <div className="flex items-center justify-center mb-6 lg:mb-8">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">leaflearning</h1>
              </div>

              {/* Search Input */}
              <div className="w-full max-w-3xl mb-6 lg:mb-8 px-2 sm:px-0">
                {/* Research Mode Usage Banner - Only for free users */}
                {profile?.subscription_tier === 'free' && researchUsed > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-3 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-300">
                      Research mode: <span className="font-semibold text-purple-200">{researchUsed}/{researchLimit}</span> used today
                      {researchUsed >= researchLimit && (
                        <span className="text-purple-400 ml-2">• Limit reached</span>
                      )}
                    </span>
                    {researchUsed < researchLimit && (
                      <span className="text-xs text-purple-400 ml-1">
                        ({researchLimit - researchUsed} remaining)
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Files Preview */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 px-2">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm"
                      >
                        <FileTextIcon className="w-4 h-4 text-neutral-400" />
                        <span className="text-neutral-300 max-w-[150px] truncate">{file.name}</span>
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-neutral-500 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                  </div>
                )}

                <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-neutral-600 transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    rows={1}
                    className="w-full px-5 py-4 pr-28 bg-transparent text-white placeholder:text-neutral-500 resize-none focus:outline-none text-base"
                  />
                  
                  {/* Bottom Bar with Mode Selector */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-t border-neutral-800/50">
                    {/* Left Side - Search Mode Selector */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSearchMode('fast')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          searchMode === 'fast'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Fast
                      </button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              // Anonymous users can't use research mode
                              if (profile?.subscription_tier === 'anonymous') {
                                setShowUpgradeModal(true)
                              } else {
                                // Both free and pro users can select research mode
                                // Free users will be limited to 3/day by the API
                                setSearchMode('research')
                              }
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                              searchMode === 'research'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                            }`}
                          >
                            <Brain className="w-3.5 h-3.5" />
                            Research
                          </button>
                        </TooltipTrigger>
                        {profile?.subscription_tier !== 'pro' && profile?.subscription_tier !== 'anonymous' && (
                          <TooltipContent 
                            side="bottom" 
                            className="bg-neutral-800 border border-neutral-700 px-3 py-2"
                            sideOffset={8}
                          >
                            <p className="text-xs text-neutral-300">3 research searches/day • Pro: Unlimited</p>
                          </TooltipContent>
                        )}
                        {profile?.subscription_tier === 'anonymous' && (
                          <TooltipContent 
                            side="bottom" 
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 border-0 px-4 py-3"
                            sideOffset={8}
                          >
                            <div className="flex flex-col items-center gap-1.5 text-white">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-300" />
                                <span className="font-semibold">Sign in Required</span>
                              </div>
                              <p className="text-xs text-purple-100">Sign in to use Research mode</p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* File Upload */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.csv,.json"
                        onChange={(e) => {
                          if (e.target.files) {
                            setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                        title="Attach files"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSearch}
                        disabled={!query.trim() || isSearching}
                        className="p-2 bg-white text-black rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSearching ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12 px-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setQuery(action.query)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg sm:rounded-xl text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all text-xs sm:text-sm"
                  >
                    <action.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {action.label}
                  </button>
                ))}
              </div>

            </div>
          ) : (
            /* ChatGPT-style with messages */
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-20 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span className="font-semibold text-white text-sm sm:text-base">LeafLearning</span>
                  </div>
                  <button
                    onClick={startNewChat}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New search
                  </button>
                </div>
              </header>

              {/* Messages - Extra bottom padding on mobile for fixed input */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 pb-40 lg:pb-6">
                <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.role === 'user' ? (
                        <div className="max-w-[90%] sm:max-w-[80%] bg-neutral-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3">
                          <p className="text-white text-sm sm:text-base">{message.content}</p>
                        </div>
                      ) : (
                        <div className="max-w-full w-full">
                          <div className="flex-1 min-w-0">
                            <div className="prose prose-invert prose-base max-w-none prose-headings:font-semibold prose-headings:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h1:mb-3 prose-h2:mb-2 prose-h3:mb-2 prose-p:text-neutral-200 prose-p:leading-relaxed prose-ul:text-neutral-200 prose-ol:text-neutral-200 prose-li:text-neutral-200 prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-neutral-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>

                            {/* Citations */}
                            {message.citations && message.citations.length > 0 && (
                              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-neutral-800">
                                <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider mb-2">
                                  Sources
                                </p>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  {message.citations.map((citation) => (
                                    <a
                                      key={citation.number}
                                      href={citation.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors group"
                                    >
                                      <span className="w-4 h-4 sm:w-5 sm:h-5 bg-neutral-700 rounded text-[10px] sm:text-xs flex items-center justify-center text-white font-medium">
                                        {citation.number}
                                      </span>
                                      <span className="text-xs sm:text-sm text-neutral-400 group-hover:text-white truncate max-w-[120px] sm:max-w-[200px]">
                                        {citation.title}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-neutral-600 hidden sm:block" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Study Set Created */}
                            {message.studySetCreated && (
                              <button
                                onClick={() => openStudySet(message.studySetCreated!.id)}
                                className="mt-4 w-full p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-colors text-left group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                                      <BookOpen className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-emerald-400">Study set created!</p>
                                      <p className="text-sm text-neutral-400">
                                        {message.studySetCreated.title} • {message.studySetCreated.itemCount} items
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-emerald-400">
                                    <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Start studying</span>
                                    <ArrowRight className="w-4 h-4" />
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming status indicator */}
                  {isSearching && searchStatus && (
                    <div className="flex items-center gap-2 text-neutral-400 py-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1 text-sm text-neutral-400">{searchStatus}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Bottom Input - Fixed on mobile, sticky on desktop */}
              <div className="fixed lg:sticky bottom-0 left-0 right-0 lg:left-auto lg:right-auto bg-gradient-to-t from-black via-black to-transparent pt-4 sm:pt-6 pb-20 lg:pb-6 px-3 sm:px-4 z-30">
                <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3">
                  {/* Research Mode Usage Banner - Only for free users in conversation view */}
                  {profile?.subscription_tier === 'free' && researchUsed > 0 && (
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-purple-300">
                        Research: <span className="font-semibold text-purple-200">{researchUsed}/{researchLimit}</span>
                        {researchUsed >= researchLimit ? (
                          <span className="text-purple-400 ml-1">• Limit reached</span>
                        ) : (
                          <span className="text-purple-400 ml-1">• {researchLimit - researchUsed} left</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setSearchMode('fast')}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        searchMode === 'fast'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-neutral-800/50 text-neutral-400 border border-transparent hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Fast
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            // Anonymous users can't use research mode
                            if (profile?.subscription_tier === 'anonymous') {
                              setShowUpgradeModal(true)
                            } else {
                              // Both free and pro users can select research mode
                              setSearchMode('research')
                            }
                          }}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
                            searchMode === 'research'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                              : 'bg-neutral-800/50 text-neutral-400 border border-transparent hover:text-white'
                          }`}
                        >
                          <Brain className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden xs:inline">Research</span>
                          <span className="xs:hidden">Pro</span>
                        </button>
                      </TooltipTrigger>
                      {profile?.subscription_tier !== 'pro' && profile?.subscription_tier !== 'anonymous' && (
                        <TooltipContent 
                          side="bottom" 
                          className="bg-neutral-800 border border-neutral-700 px-3 py-2"
                          sideOffset={8}
                        >
                          <p className="text-xs text-neutral-300">3 research searches/day • Pro: Unlimited</p>
                        </TooltipContent>
                      )}
                      {profile?.subscription_tier === 'anonymous' && (
                        <TooltipContent 
                          side="bottom" 
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 border-0 px-4 py-3"
                          sideOffset={8}
                        >
                          <div className="flex flex-col items-center gap-1.5 text-white">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-amber-300" />
                              <span className="font-semibold">Sign in Required</span>
                            </div>
                            <p className="text-xs text-purple-100">Sign in to use Research mode</p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>

                  {/* Attached Files Preview */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700"
                        >
                          <FileTextIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-white truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="p-0.5 hover:bg-neutral-700 rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-neutral-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-neutral-600 transition-colors">
                    <textarea
                      ref={textareaRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a follow-up..."
                      rows={1}
                      className="w-full px-5 py-4 pr-28 bg-transparent text-white placeholder:text-neutral-500 resize-none focus:outline-none"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleSearch}
                        disabled={!query.trim() || isSearching}
                        className="p-2.5 bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSearching ? (
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Study Set Popup Modal */}
        {showStudySetPopup && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={closeStudySet}
            />
            
            {/* Modal */}
            <div className="relative w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-neutral-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-neutral-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-800">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
                      {activeStudySet?.title || 'Loading...'}
                    </h2>
                    {activeStudySet && (
                      <p className="text-xs sm:text-sm text-neutral-400">
                        {currentItemIndex + 1} of {activeStudySet.items.length} items
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeStudySet}
                  className="p-1.5 sm:p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 min-h-[350px] sm:min-h-[400px] flex flex-col overflow-y-auto">
                {isLoadingStudySet ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-neutral-400">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span>Loading study set...</span>
                    </div>
                  </div>
                ) : activeStudySet && activeStudySet.items.length > 0 ? (
                  <>
                    {/* Current Item */}
                    {(() => {
                      const item = activeStudySet.items[currentItemIndex]
                      
                      if (item.item_type === 'flashcard') {
                        return (
                          <div className="flex-1 flex flex-col">
                            <div className="flex-1 flex items-center justify-center perspective-1000 px-2">
                              <div 
                                onClick={() => setShowAnswer(!showAnswer)}
                                className="relative w-full max-w-lg h-52 sm:h-64 cursor-pointer group"
                                style={{ perspective: '1000px' }}
                              >
                                {/* Card Container with 3D flip */}
                                <div 
                                  className="relative w-full h-full transition-transform duration-500 ease-in-out"
                                  style={{ 
                                    transformStyle: 'preserve-3d',
                                    transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                  }}
                                >
                                  {/* Front Side */}
                                  <div 
                                    className="absolute inset-0 w-full h-full p-4 sm:p-8 bg-neutral-800 rounded-xl sm:rounded-2xl border border-neutral-700 flex flex-col items-center justify-center shadow-xl"
                                    style={{ backfaceVisibility: 'hidden' }}
                                  >
                                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex items-center gap-1.5 sm:gap-2">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-neutral-600" />
                                      <span className="text-[10px] sm:text-xs font-medium text-neutral-500 uppercase tracking-wider">Front</span>
                                    </div>
                                    <p className="text-base sm:text-xl text-white text-center leading-relaxed px-2">{item.front}</p>
                                    <div className="absolute bottom-3 sm:bottom-4 flex items-center gap-1.5 sm:gap-2 text-neutral-500">
                                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      <span className="text-[10px] sm:text-xs">Tap to flip</span>
                                    </div>
                                  </div>
                                  
                                  {/* Back Side - Emerald themed */}
                                  <div 
                                    className="absolute inset-0 w-full h-full p-4 sm:p-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl border border-emerald-500/50 flex flex-col items-center justify-center shadow-xl shadow-emerald-500/20"
                                    style={{ 
                                      backfaceVisibility: 'hidden',
                                      transform: 'rotateY(180deg)'
                                    }}
                                  >
                                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex items-center gap-1.5 sm:gap-2">
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-300" />
                                      <span className="text-[10px] sm:text-xs font-medium text-emerald-200 uppercase tracking-wider">Answer</span>
                                    </div>
                                    <p className="text-base sm:text-xl text-white text-center leading-relaxed font-medium px-2">{item.back}</p>
                                    <div className="absolute bottom-3 sm:bottom-4 flex items-center gap-1.5 sm:gap-2 text-emerald-200/70">
                                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      <span className="text-[10px] sm:text-xs">Tap to flip back</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Hover glow effect */}
                                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                  showAnswer 
                                    ? 'shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                                    : 'shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                                }`} />
                              </div>
                            </div>
                            
                            {/* Card counter indicator */}
                            <div className="flex justify-center gap-1.5 mt-4">
                              {activeStudySet.items.filter(i => i.item_type === 'flashcard').slice(0, 10).map((_, idx) => (
                                <div 
                                  key={idx}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    idx === activeStudySet.items.filter(i => i.item_type === 'flashcard').indexOf(item)
                                      ? 'bg-emerald-500 w-4' 
                                      : 'bg-neutral-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      } else {
                        // Quiz item
                        const options = [
                          { key: 'A', value: item.option_a },
                          { key: 'B', value: item.option_b },
                          { key: 'C', value: item.option_c },
                          { key: 'D', value: item.option_d }
                        ].filter(opt => opt.value)

                        return (
                          <div className="flex-1 flex flex-col">
                            {/* Quiz Question Card */}
                            <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                <div className="p-1 sm:p-1.5 bg-blue-500/20 rounded-lg">
                                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                                </div>
                                <p className="text-[10px] sm:text-xs font-medium text-blue-400 uppercase tracking-wider">Quiz Question</p>
                              </div>
                              <p className="text-sm sm:text-lg text-white leading-relaxed">{item.question}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2 sm:gap-3 flex-1">
                              {options.map((opt, optIdx) => {
                                const isCorrect = item.correct_answer === opt.key
                                const isSelected = selectedQuizAnswer === opt.key
                                
                                let optionStyle = 'bg-neutral-800/80 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800'
                                let iconBg = 'bg-neutral-700'
                                let iconText = 'text-neutral-300'
                                
                                if (showAnswer) {
                                  if (isCorrect) {
                                    optionStyle = 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                    iconBg = 'bg-emerald-500'
                                    iconText = 'text-white'
                                  } else if (isSelected && !isCorrect) {
                                    optionStyle = 'bg-red-500/20 border-red-500/50'
                                    iconBg = 'bg-red-500'
                                    iconText = 'text-white'
                                  } else {
                                    optionStyle = 'bg-neutral-800/30 border-neutral-700/50 opacity-40'
                                  }
                                }

                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => !showAnswer && handleQuizAnswer(opt.key)}
                                    disabled={showAnswer}
                                    className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border text-left transition-all duration-300 flex items-center gap-3 sm:gap-4 ${optionStyle} ${!showAnswer ? 'active:scale-[0.98]' : ''}`}
                                    style={{ animationDelay: `${optIdx * 50}ms` }}
                                  >
                                    <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-semibold text-base sm:text-lg transition-all duration-300 flex-shrink-0 ${iconBg} ${iconText}`}>
                                      {showAnswer && isCorrect ? (
                                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                      ) : showAnswer && isSelected && !isCorrect ? (
                                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                      ) : (
                                        opt.key
                                      )}
                                    </span>
                                    <span className="text-white flex-1 text-sm sm:text-base">{opt.value}</span>
                                    {showAnswer && isCorrect && (
                                      <span className="text-emerald-400 text-xs sm:text-sm font-medium">Correct!</span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>

                            {showAnswer && item.explanation && (
                              <div className="mt-3 sm:mt-5 p-3 sm:p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg sm:rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div className="p-1 sm:p-1.5 bg-blue-500/20 rounded-lg mt-0.5">
                                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs sm:text-sm font-medium text-blue-300 mb-0.5 sm:mb-1">Explanation</p>
                                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">{item.explanation}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                    })()}

                    {/* Progress bar */}
                    <div className="mt-6 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${((currentItemIndex + 1) / activeStudySet.items.length) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-neutral-400">
                    No items found in this study set
                  </div>
                )}
              </div>

              {/* Footer Navigation */}
              {activeStudySet && activeStudySet.items.length > 0 && (
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-t border-neutral-800 bg-neutral-900/50">
                  <button
                    onClick={prevItem}
                    disabled={currentItemIndex === 0}
                    className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Prev</span>
                    <kbd className="hidden lg:inline-flex ml-1 px-1.5 py-0.5 text-[10px] bg-neutral-800 rounded text-neutral-500">←</kbd>
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => {
                        setCurrentItemIndex(0)
                        setShowAnswer(false)
                        setSelectedQuizAnswer(null)
                      }}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Restart</span>
                    </button>
                    
                    {/* Item type badge */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg">
                      {activeStudySet.items[currentItemIndex]?.item_type === 'flashcard' ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-neutral-400">Flashcard</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-neutral-400">Quiz</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={nextItem}
                    disabled={currentItemIndex === activeStudySet.items.length - 1}
                    className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all"
                  >
                    <kbd className="hidden lg:inline-flex mr-1 px-1.5 py-0.5 text-[10px] bg-neutral-800 rounded text-neutral-500">→</kbd>
                    <span className="text-sm sm:text-base">Next</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </TooltipProvider>
  )
}
