'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Search,
  ChevronRight
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: any[]
  timestamp: Date
}

interface ChatConversation {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

interface ChatsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat: (chat: ChatConversation) => void
  onNewChat: () => void
  currentChatId: string | null
}

export default function ChatsPanel({ isOpen, onClose, onSelectChat, onNewChat, currentChatId }: ChatsPanelProps) {
  const [chats, setChats] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

  // Handle delayed close on mouse leave
  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      onClose()
    }, 300) // 300ms delay
  }

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadChats()
    }
  }, [isOpen])

  const loadChats = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (data && !error) {
        setChats(data)
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(chatId)
    
    try {
      await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', chatId)

      setChats(prev => prev.filter(c => c.id !== chatId))
      
      if (currentChatId === chatId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const groupChatsByDate = (chats: ChatConversation[]) => {
    const groups: { [key: string]: ChatConversation[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Older': []
    }

    const now = new Date()
    chats.forEach(chat => {
      const date = new Date(chat.updated_at)
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) groups['Today'].push(chat)
      else if (diffDays === 1) groups['Yesterday'].push(chat)
      else if (diffDays < 7) groups['This Week'].push(chat)
      else groups['Older'].push(chat)
    })

    return groups
  }

  const groupedChats = groupChatsByDate(filteredChats)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 lg:bg-transparent lg:left-[392px]"
        onClick={onClose}
        onMouseEnter={() => {
          // Only auto-close on desktop when hovering outside
          if (window.innerWidth >= 1024) {
            onClose()
          }
        }}
      />

      {/* Panel */}
      <div 
        className={`fixed top-0 left-0 lg:left-[72px] h-full w-full sm:w-[320px] bg-neutral-950 border-r border-neutral-800 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white" />
            <h2 className="font-semibold text-white">Chats</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 border-b border-neutral-800">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-neutral-400 text-sm">
                {searchQuery ? 'No chats found' : 'No conversations yet'}
              </p>
              <p className="text-neutral-600 text-xs mt-1">
                {searchQuery ? 'Try a different search' : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedChats).map(([group, groupChats]) => 
                groupChats.length > 0 && (
                  <div key={group} className="mb-4">
                    <p className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      {group}
                    </p>
                    {groupChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => onSelectChat(chat)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group ${
                          currentChatId === chat.id 
                            ? 'bg-neutral-800' 
                            : 'hover:bg-neutral-900'
                        }`}
                      >
                        <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${currentChatId === chat.id ? 'text-white font-medium' : 'text-neutral-300'}`}>
                            {chat.title}
                          </p>
                          <p className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(chat.updated_at)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {deletingId === chat.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
