'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { Bell, ChevronDown, User, Settings, LogOut, CreditCard, Sparkles, X, Send } from 'lucide-react'
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

interface Profile {
  id: string
  name: string
  email: string
  subscription_tier?: string
}

interface TopNavProps {
  title?: string
}

// Markdown to HTML converter with table support
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks first (preserve them from other transformations)
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
  
  // Process tables, lists, and paragraphs
  const lines = html.split('\n')
  const processed: string[] = []
  let inList = false
  let listType = ''
  let inTable = false
  let tableHeaderProcessed = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Check if this is a table row
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|')
    const isSeparatorRow = /^\|[\s-:|]+\|$/.test(trimmed)
    
    if (isTableRow) {
      if (inList) {
        processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        inList = false
        listType = ''
      }
      
      if (!inTable) {
        processed.push('<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-gray-200 rounded-lg text-sm">')
        inTable = true
        tableHeaderProcessed = false
      }
      
      if (isSeparatorRow) {
        tableHeaderProcessed = true
        continue
      }
      
      const cells = trimmed.slice(1, -1).split('|').map(cell => cell.trim())
      
      if (!tableHeaderProcessed) {
        processed.push('<thead class="bg-gray-100">')
        processed.push('<tr>')
        cells.forEach(cell => {
          processed.push(`<th class="border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-700">${cell}</th>`)
        })
        processed.push('</tr>')
        processed.push('</thead>')
        processed.push('<tbody>')
      } else {
        processed.push('<tr class="hover:bg-gray-50">')
        cells.forEach(cell => {
          processed.push(`<td class="border border-gray-200 px-3 py-2 text-xs text-gray-600">${cell}</td>`)
        })
        processed.push('</tr>')
      }
      continue
    }
    
    if (inTable && !isTableRow) {
      processed.push('</tbody></table></div>')
      inTable = false
      tableHeaderProcessed = false
    }
    
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
  
  if (inTable) processed.push('</tbody></table></div>')
  if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
  
  return processed.join('')
}

// Global Leaf AI Panel Component
function GlobalLeafAIPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
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

interface TopNavProps {
  title?: string
}

export default function TopNav({ title = 'Dashboard' }: TopNavProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showLeafAI, setShowLeafAI] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('User authentication error:', userError)
        router.push('/')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, subscription_tier')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        return
      }

      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      router.push('/')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Leaf AI Button */}
          <Button 
            onClick={() => setShowLeafAI(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Leaf AI</span>
          </Button>

          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

        {/* User Profile */}
        {isLoading ? (
          <div className="w-32 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
        ) : profile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-3 rounded-xl hover:bg-gray-100 gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white text-xs">
                    {profile.name ? getInitials(profile.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900">{profile.name}</span>
                    {profile.subscription_tier === 'pro' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">PRO</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{profile.subscription_tier === 'pro' ? 'Pro Member' : 'Student'}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings?section=tokens" className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      </header>

      {/* Global Leaf AI Panel */}
      <GlobalLeafAIPanel isOpen={showLeafAI} onClose={() => setShowLeafAI(false)} />
    </>
  )
}
