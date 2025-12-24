'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Sparkles, 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  X, 
  Loader2,
  Trash2,
  Download,
  Copy,
  Check,
  Zap,
  Brain,
  RefreshCw,
  ChevronDown,
  File,
  FileImage,
  FileSpreadsheet,
  Presentation
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileAttachment {
  id: string
  file: File
  name: string
  type: string
  preview?: string
  data?: string // base64
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: FileAttachment[]
  timestamp: Date
  tokensUsed?: number
  image?: {
    data: string
    mimeType: string
  }
}

// Helper to detect image generation requests
function isImageGenerationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  const imageKeywords = [
    'generate image', 'create image', 'make image', 'draw', 'generate a picture',
    'create a picture', 'make a picture', 'generate an image', 'create an image',
    'make an image', 'image of', 'picture of', 'illustration of', 'draw me',
    'generate me an image', 'can you draw', 'can you create an image',
    'visualize', 'show me an image', 'generate art', 'create art'
  ]
  return imageKeywords.some(keyword => lowerMessage.includes(keyword))
}

// Markdown to HTML converter
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-slate-800 text-slate-100 p-4 rounded-xl text-sm overflow-x-auto my-3 font-mono"><code>${code.trim()}</code></pre>`
  })
  
  // Handle headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-4 mb-2 text-slate-800">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-4 mb-2 text-slate-800">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-3 text-slate-900">$1</h1>')
  
  // Handle bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-700">$1</code>')
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 hover:text-emerald-700 underline" target="_blank">$1</a>')
  
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
        processed.push('<ul class="list-disc list-inside my-3 space-y-1.5 text-slate-700">')
        inList = true; listType = 'ul'
      }
      processed.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ol class="list-decimal list-inside my-3 space-y-1.5 text-slate-700">')
        inList = true; listType = 'ol'
      }
      processed.push(`<li>${numMatch[1]}</li>`)
      continue
    }
    
    if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
    if (trimmed.startsWith('<')) { processed.push(trimmed); continue }
    processed.push(`<p class="my-2 text-slate-700 leading-relaxed">${trimmed}</p>`)
  }
  if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
  
  return processed.join('')
}

// Get file icon based on type
function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FileImage
  if (type.includes('pdf')) return FileText
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet
  if (type.includes('presentation') || type.includes('powerpoint')) return Presentation
  return File
}

export default function LeafAIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [mode, setMode] = useState<'light' | 'heavy'>('light')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [remainingTokens, setRemainingTokens] = useState<number | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    for (const file of files) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        continue
      }
      
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Create preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }
      
      // Read file as base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result as string
        setAttachments(prev => [...prev, {
          id,
          file,
          name: file.name,
          type: file.type,
          preview,
          data
        }])
      }
      reader.readAsDataURL(file)
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id)
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
      return prev.filter(a => a.id !== id)
    })
  }, [])

  // Copy message to clipboard
  const copyMessage = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // Send message
  const sendMessage = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      files: attachments.length > 0 ? [...attachments] : undefined,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachments([])
    setIsLoading(true)

    try {
      // Check if this is an image generation request
      if (isImageGenerationRequest(userMessage.content)) {
        // Call image generation API
        const imageResponse = await fetch('/api/leafai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMessage.content
          })
        })

        const imageData = await imageResponse.json()

        if (!imageResponse.ok) {
          throw new Error(imageData.error || 'Failed to generate image')
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Here's the image I generated for you! 🎨`,
          image: {
            data: imageData.image.data,
            mimeType: imageData.image.mimeType
          },
          timestamp: new Date(),
          tokensUsed: imageData.tokensUsed
        }

        setMessages(prev => [...prev, assistantMessage])
        setRemainingTokens(imageData.newBalance)
        window.dispatchEvent(new CustomEvent('tokensUpdated'))
        return
      }

      // Regular chat - Prepare files for API
      const filesData = userMessage.files?.map(f => ({
        type: f.type,
        name: f.name,
        data: f.data || ''
      }))

      // Prepare history (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/leafai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          files: filesData,
          history,
          mode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        tokensUsed: data.tokensUsed
      }

      setMessages(prev => [...prev, assistantMessage])
      setRemainingTokens(data.remainingTokens)
      
      // Dispatch event for token updates
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, attachments, isLoading, messages, mode])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([])
    setAttachments([])
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 flex-shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">Leaf AI</h1>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">FREE</span>
                </div>
                <p className="text-sm text-slate-500">Your intelligent study assistant • Unlimited & Free!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setMode('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'light' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Fast
                </button>
                <button
                  onClick={() => setMode('heavy')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'heavy' 
                      ? 'bg-white text-purple-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Deep
                </button>
              </div>

              {/* Free badge */}
              <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200">
                ✨ Unlimited Free
              </div>

              {/* Clear chat */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-slate-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            // Welcome state
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-350px)] text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Leaf AI</h2>
              <p className="text-slate-500 max-w-md mb-3">
                Your powerful AI assistant for learning. Upload images, PDFs, or documents and ask me anything about them!
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full text-sm font-semibold mb-8">
                ✨ 100% Free &amp; Unlimited
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  { icon: '📚', text: 'Explain quantum physics', color: 'from-blue-50 to-indigo-50' },
                  { icon: '📝', text: 'Help me write an essay', color: 'from-amber-50 to-orange-50' },
                  { icon: '🎨', text: 'Generate image of a forest', color: 'from-pink-50 to-rose-50' },
                  { icon: '📄', text: 'Summarize this PDF', color: 'from-green-50 to-emerald-50' },
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion.text)}
                    className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${suggestion.color} border border-white/50 hover:scale-[1.02] transition-all text-left group`}
                  >
                    <span className="text-2xl">{suggestion.icon}</span>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{suggestion.text}</span>
                  </button>
                ))}
              </div>
              
              <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <FileImage className="w-3 h-3" />
                  Images
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  PDFs
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <File className="w-3 h-3" />
                  Documents
                </div>
              </div>
            </div>
          ) : (
            // Messages list
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    {/* User message */}
                    {message.role === 'user' && (
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-200/50">
                        {message.files && message.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.files.map(file => (
                              <div key={file.id} className="flex items-center gap-2 bg-white/20 rounded-lg px-2 py-1">
                                {file.preview ? (
                                  <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  (() => {
                                    const Icon = getFileIcon(file.type)
                                    return <Icon className="w-4 h-4" />
                                  })()
                                )}
                                <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    )}
                    
                    {/* Assistant message */}
                    {message.role === 'assistant' && (
                      <div className="bg-white rounded-2xl rounded-bl-md px-5 py-4 shadow-lg border border-slate-100">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(message.content) }}
                        />
                        
                        {/* Generated Image */}
                        {message.image && (
                          <div className="mt-4">
                            <img 
                              src={`data:${message.image.mimeType};base64,${message.image.data}`}
                              alt="Generated image"
                              className="rounded-xl max-w-full h-auto shadow-lg border border-slate-200"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <a
                                href={`data:${message.image.mimeType};base64,${message.image.data}`}
                                download="leafai-generated-image.png"
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                Download Image
                              </a>
                            </div>
                          </div>
                        )}
                        
                        {/* Message actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyMessage(message.id, message.content)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <span className="text-xs text-emerald-500 font-medium">
                            ✨ Free
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-md px-5 py-4 shadow-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span className="text-sm text-slate-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="relative flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 pr-8 group"
                >
                  {attachment.preview ? (
                    <img src={attachment.preview} alt={attachment.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    (() => {
                      const Icon = getFileIcon(attachment.type)
                      return (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-slate-500" />
                        </div>
                      )
                    })()
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{attachment.name}</span>
                    <span className="text-xs text-slate-400">{(attachment.file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute top-1 right-1 p-1 bg-slate-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Input box */}
          <div className="flex items-center gap-3">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.csv,.ppt,.pptx"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 h-12 w-12 rounded-xl border-slate-200 hover:bg-slate-50 hover:border-emerald-300"
            >
              <Paperclip className="w-5 h-5 text-slate-500" />
            </Button>
            
            {/* Text input */}
            <div className="flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Send button */}
            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          {/* Tips */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Attach files
            </span>
            <span>•</span>
            <span>{mode === 'light' ? 'Fast mode: Quick responses' : 'Deep mode: Thorough analysis (2x tokens)'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
