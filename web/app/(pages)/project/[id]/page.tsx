'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { 
  Search, Send, Globe, Sparkles, GraduationCap, 
  ExternalLink, Loader2, Clock, Zap,
  MessageSquare, ArrowRight, X
} from 'lucide-react'

interface Citation {
  number: number
  title: string
  url: string
}

interface SearchResponse {
  answer: string
  citations: Citation[]
  studySetCreated?: {
    id: string
    title: string
    itemCount: number
  }
}

interface RecentSearch {
  id: string
  query: string
  timestamp: string
  hasStudySet: boolean
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

interface ProjectNote {
  id: string
  title: string
  content: string
  summary?: string
}

export default function ProjectOverview() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [allChats, setAllChats] = useState<RecentSearch[]>([])
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([])
  const [showStudySetPopup, setShowStudySetPopup] = useState(false)
  const [createdStudySet, setCreatedStudySet] = useState<{ id: string; title: string; itemCount: number } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const projectId = params.id as string

  useEffect(() => {
    loadProjectData()
    loadAllChats()
    loadProjectNotes()
  }, [projectId])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [query])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const loadProjectData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }

      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (project) {
        setProjectName(project.name)
      }
    } catch (error) {
      console.error('Error loading project:', error)
    }
  }

  const loadAllChats = async () => {
    try {
      const { data: searches } = await supabase
        .from('ai_search_history')
        .select('id, query, created_at, study_set_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (searches) {
        setAllChats(searches.map(s => ({
          id: s.id,
          query: s.query,
          timestamp: s.created_at,
          hasStudySet: !!s.study_set_id
        })))
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log('Chats not available')
    }
  }

  // Filter chats based on search query
  const filteredChats = allChats.filter(chat =>
    chat.query.toLowerCase().includes(chatSearchQuery.toLowerCase())
  )

  const loadProjectNotes = async () => {
    try {
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, content, summary')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(10) // Get top 10 most recent notes for context

      if (notes) {
        setProjectNotes(notes)
      }
    } catch (error) {
      console.log('Could not load project notes')
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || isSearching) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    const currentQuery = query.trim()
    setQuery('')
    setIsSearching(true)

    try {
      // Build notes context for AI
      const notesContext = projectNotes.map(note => ({
        title: note.title,
        content: note.summary || note.content?.slice(0, 1000) || ''
      }))

      const res = await fetch('/api/leafai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          query: currentQuery,
          projectId,
          projectName,
          notesContext
        })
      })

      if (!res.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await res.json()
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        studySetCreated: data.studySetCreated,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])

      // If a study set was created, show the popup
      if (data.studySetCreated) {
        setCreatedStudySet(data.studySetCreated)
        setShowStudySetPopup(true)
      }

      // Refresh chat history
      loadAllChats()
    } catch (error) {
      console.error('Search error:', error)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while searching. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleQuickAction = (action: string) => {
    setQuery(action)
    setTimeout(() => {
      handleSearch()
    }, 100)
  }

  const startNewChat = () => {
    setMessages([])
    setQuery('')
  }

  const formatAnswer = (answer: string) => {
    // Convert markdown-style citations [1] to styled spans
    return answer.replace(/\[(\d+)\]/g, (_, num) => {
      return `<sup class="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-neutral-700 text-white rounded ml-0.5 cursor-pointer hover:bg-neutral-600">${num}</sup>`
    })
  }

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const hasMessages = messages.length > 0

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col -m-6">
      {/* Perplexity-style Empty State (centered search) */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8 animate-in fade-in duration-500">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2">
              leaflearning
            </h1>
            <p className="text-neutral-500 text-sm">
              AI-powered search for {projectName || 'your project'}
            </p>
          </div>

          {/* Centered Search Input */}
          <div className="w-full max-w-3xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-neutral-700 transition-colors">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything. Type 'create study set about...' to generate flashcards & quizzes."
                  className="w-full px-5 py-4 bg-transparent text-white placeholder:text-neutral-500 focus:outline-none resize-none text-base leading-relaxed"
                  rows={1}
                  disabled={isSearching}
                />
                
                {/* Bottom Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                      title="Web Search"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuery(q => q + ' create study set')}
                      className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                      title="Create Study Set"
                    >
                      <GraduationCap className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600 text-xs hidden sm:block">
                      <Zap className="w-3 h-3 inline mr-1" />
                      Groq + Tavily
                    </span>
                    <button
                      type="submit"
                      disabled={!query.trim() || isSearching}
                      className="p-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Your Chats - Always visible */}
            <div className="w-full mt-4 animate-in fade-in duration-500 delay-100">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Your Chats</h3>
                {allChats.length > 0 && (
                  <span className="text-neutral-600 text-xs">
                    {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
                  </span>
                )}
              </div>
              
              {/* Search Bar - Always visible */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search your chats..."
                  className="w-full pl-9 pr-9 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-neutral-600 transition-colors"
                />
                {chatSearchQuery && (
                  <button
                    onClick={() => setChatSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Chat List */}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {allChats.length === 0 ? (
                  <div className="text-center py-4 text-neutral-600 text-xs">
                    <MessageSquare className="w-5 h-5 mx-auto mb-2 text-neutral-700" />
                    No chats yet. Start a conversation!
                  </div>
                ) : (chatSearchQuery ? filteredChats : filteredChats.slice(0, 5)).length === 0 ? (
                  <div className="text-center py-4 text-neutral-600 text-xs">
                    No chats found for "{chatSearchQuery}"
                  </div>
                ) : (
                  (chatSearchQuery ? filteredChats : filteredChats.slice(0, 5)).map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleQuickAction(chat.query)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-900/50 border border-neutral-800/50 hover:bg-neutral-900 hover:border-neutral-800 transition-all group text-left"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                      <span className="text-neutral-400 text-xs truncate flex-1 group-hover:text-white transition-colors">
                        {chat.query}
                      </span>
                      <span className="text-neutral-600 text-[10px] flex-shrink-0">{getRelativeTime(chat.timestamp)}</span>
                      {chat.hasStudySet && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] flex-shrink-0">
                          Study Set
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 animate-in fade-in duration-500 delay-150">
              <button
                onClick={() => handleQuickAction(`Explain the key concepts in ${projectName}`)}
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-sm hover:border-neutral-700 hover:text-white transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-2" />
                Explain key concepts
              </button>
              <button
                onClick={() => handleQuickAction(`Create study set about ${projectName}`)}
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-sm hover:border-neutral-700 hover:text-white transition-all"
              >
                <GraduationCap className="w-3.5 h-3.5 inline mr-2" />
                Create study set
              </button>
              <button
                onClick={() => handleQuickAction(`What are the latest research findings about ${projectName}?`)}
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-sm hover:border-neutral-700 hover:text-white transition-all"
              >
                <Globe className="w-3.5 h-3.5 inline mr-2" />
                Latest research
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChatGPT-style Layout (after first message) */}
      {hasMessages && (
        <>
          {/* Chat Messages Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
              {/* New Chat Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={startNewChat}
                  className="px-3 py-1.5 rounded-lg text-neutral-500 text-xs hover:bg-neutral-800 hover:text-neutral-300 transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3 h-3" />
                  New search
                </button>
              </div>

              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    message.role === 'user' ? 'flex justify-end' : ''
                  }`}
                >
                  {message.role === 'user' ? (
                    /* User Message */
                    <div className="max-w-[85%] bg-neutral-800 rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-white">{message.content}</p>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/20 shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-white leading-relaxed prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: formatAnswer(message.content) }}
                          />
                          
                          {/* Citations */}
                          {message.citations && message.citations.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-neutral-800">
                              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Sources</h4>
                              <div className="flex flex-wrap gap-2">
                                {message.citations.map((citation) => (
                                  <a
                                    key={citation.number}
                                    href={citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition-colors group"
                                  >
                                    <span className="flex items-center justify-center w-5 h-5 rounded bg-neutral-700 text-white text-xs font-bold">
                                      {citation.number}
                                    </span>
                                    <span className="text-xs text-neutral-400 truncate max-w-[150px] group-hover:text-white transition-colors">
                                      {citation.title}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-neutral-500 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Study Set Created Badge */}
                          {message.studySetCreated && (
                            <div className="mt-4">
                              <button
                                onClick={() => router.push(`/project/${projectId}/study?set=${message.studySetCreated?.id}`)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 transition-colors"
                              >
                                <GraduationCap className="w-4 h-4" />
                                Study Set: {message.studySetCreated.title} ({message.studySetCreated.itemCount} items)
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading Indicator */}
              {isSearching && (
                <div className="flex items-start gap-3 animate-in fade-in duration-300">
                  <div className="p-2 rounded-lg bg-cyan-500/20 shrink-0">
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-neutral-500 text-sm">Searching the web...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed Bottom Input Area */}
          <div className="sticky bottom-0 bg-gradient-to-t from-black via-black to-transparent pt-6 pb-4 px-4 sm:px-8">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSearch}>
                <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden focus-within:border-neutral-700 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up..."
                    className="w-full px-5 py-4 bg-transparent text-white placeholder:text-neutral-500 focus:outline-none resize-none text-base leading-relaxed"
                    rows={1}
                    disabled={isSearching}
                  />
                  
                  {/* Bottom Bar */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800/50">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                        title="Web Search"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuery(q => q + ' create study set')}
                        className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                        title="Create Study Set"
                      >
                        <GraduationCap className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600 text-xs hidden sm:block">
                        <Zap className="w-3 h-3 inline mr-1" />
                        Groq + Tavily
                      </span>
                      <button
                        type="submit"
                        disabled={!query.trim() || isSearching}
                        className="p-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Study Set Created Popup */}
      {showStudySetPopup && createdStudySet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Study Set Created!</h2>
              <p className="text-neutral-400 mb-6">
                <span className="text-white font-medium">{createdStudySet.title}</span>
                <br />
                {createdStudySet.itemCount} items ready to study
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStudySetPopup(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-medium hover:bg-neutral-700 transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={() => router.push(`/project/${projectId}/study?set=${createdStudySet.id}`)}
                  className="flex-1 py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
                >
                  Study Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}