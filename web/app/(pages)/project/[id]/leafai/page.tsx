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
  Presentation,
  Crown,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/ui/upgrade-modal'

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

// Markdown to HTML converter with table support
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks first (preserve them from other transformations)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(`<pre class="bg-gray-900 text-gray-100 p-4 rounded-xl text-sm overflow-x-auto my-3 font-mono"><code>${code.trim()}</code></pre>`)
    return placeholder
  })
  
  // Handle headers (order matters - process larger headers first)
  html = html.replace(/^###### (.+)$/gm, '<h6 class="font-medium text-sm mt-3 mb-1.5 text-gray-700">$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5 class="font-medium text-sm mt-3 mb-1.5 text-gray-800">$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4 class="font-semibold text-sm mt-4 mb-2 text-gray-800">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-4 mb-2 text-gray-800">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-4 mb-2 text-gray-800">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-3 text-gray-900">$1</h1>')
  
  // Handle bold - use [\s\S] to match across newlines, but prefer same-line matches first
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
  // Handle italic - single asterisks (not adjacent to other asterisks)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-700">$1</code>')
  
  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block)
  })
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 hover:text-emerald-700 underline" target="_blank">$1</a>')
  
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
    
    // Check if this is a table row (starts and ends with |)
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|')
    const isSeparatorRow = /^\|[\s-:|]+\|$/.test(trimmed)
    
    if (isTableRow) {
      // Close any open list
      if (inList) {
        processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        inList = false
        listType = ''
      }
      
      if (!inTable) {
        // Start new table
        processed.push('<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">')
        inTable = true
        tableHeaderProcessed = false
      }
      
      if (isSeparatorRow) {
        // This is the separator row, skip it but mark header as processed
        tableHeaderProcessed = true
        continue
      }
      
      // Parse table cells
      const cells = trimmed.slice(1, -1).split('|').map(cell => cell.trim())
      
      if (!tableHeaderProcessed) {
        // This is the header row
        processed.push('<thead class="bg-gray-100">')
        processed.push('<tr>')
        cells.forEach(cell => {
          processed.push(`<th class="border border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-700">${cell}</th>`)
        })
        processed.push('</tr>')
        processed.push('</thead>')
        processed.push('<tbody>')
      } else {
        // This is a data row
        processed.push('<tr class="hover:bg-gray-50">')
        cells.forEach(cell => {
          processed.push(`<td class="border border-gray-200 px-4 py-2 text-sm text-gray-600">${cell}</td>`)
        })
        processed.push('</tr>')
      }
      continue
    }
    
    // Close table if we were in one and this line is not a table row
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
        processed.push('<ul class="list-disc list-inside my-3 space-y-1.5 text-gray-700">')
        inList = true; listType = 'ul'
      }
      processed.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ol class="list-decimal list-inside my-3 space-y-1.5 text-gray-700">')
        inList = true; listType = 'ol'
      }
      processed.push(`<li>${numMatch[1]}</li>`)
      continue
    }
    
    if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
    if (trimmed.startsWith('<')) { processed.push(trimmed); continue }
    processed.push(`<p class="my-2 text-gray-700 leading-relaxed">${trimmed}</p>`)
  }
  
  // Close any remaining open elements
  if (inTable) processed.push('</tbody></table></div>')
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
  const [isPro, setIsPro] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await fetch('/api/subscription')
        if (res.ok) {
          const data = await res.json()
          setIsPro(data.subscription?.subscription_tier === 'pro')
        }
      } catch (err) {
        console.error('Error checking subscription:', err)
      }
    }
    checkSubscription()
  }, [])

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
    <div className="flex flex-col h-[calc(100vh-64px-3rem)] bg-white -m-6">
      {/* Messages Area - Full width, clean white background */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            // Welcome state - ChatGPT style
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center px-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Leaf AI</h1>
              <p className="text-gray-500 max-w-md mb-8">
                Your intelligent study assistant. Ask me anything about your studies, upload files, or get help with homework.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  { icon: '📚', text: 'Explain a complex topic', desc: 'Get simple explanations' },
                  { icon: '📝', text: 'Help me write an essay', desc: 'Writing assistance' },
                  { icon: '📄', text: 'Summarize this document', desc: 'Upload files for analysis' },
                  { icon: '🧮', text: 'Solve this math problem', desc: 'Step-by-step solutions' },
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion.text)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group"
                  >
                    <span className="text-2xl">{suggestion.icon}</span>
                    <div>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 block">{suggestion.text}</span>
                      <span className="text-xs text-gray-400">{suggestion.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-8 flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">
                  <Zap className="w-3 h-3" />
                  100% Free
                </div>
                <div className="flex items-center gap-1">
                  <FileImage className="w-3 h-3" />
                  Images
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  PDFs
                </div>
                <div className="flex items-center gap-1">
                  <File className="w-3 h-3" />
                  Documents
                </div>
              </div>
            </div>
          ) : (
            // Messages list - ChatGPT style
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant avatar */}
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    {/* User message */}
                    {message.role === 'user' && (
                      <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-4 py-3">
                        {message.files && message.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.files.map(file => (
                              <div key={file.id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-gray-200">
                                {file.preview ? (
                                  <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
                                ) : (
                                  (() => {
                                    const Icon = getFileIcon(file.type)
                                    return <Icon className="w-4 h-4 text-gray-500" />
                                  })()
                                )}
                                <span className="text-xs truncate max-w-[100px] text-gray-600">{file.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>
                    )}
                    
                    {/* Assistant message */}
                    {message.role === 'assistant' && (
                      <div className="text-gray-800">
                        <div 
                          className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2"
                          dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(message.content) }}
                        />
                        
                        {/* Generated Image */}
                        {message.image && (
                          <div className="mt-4">
                            <img 
                              src={`data:${message.image.mimeType};base64,${message.image.data}`}
                              alt="Generated image"
                              className="rounded-xl max-w-full h-auto shadow-lg border border-gray-200"
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
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => copyMessage(message.id, message.content)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* User avatar */}
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-gray-600">U</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
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
          )}
        </div>
      </div>

      {/* Input Area - Fixed at bottom, ChatGPT style */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 group"
                >
                  {attachment.preview ? (
                    <img src={attachment.preview} alt={attachment.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    (() => {
                      const Icon = getFileIcon(attachment.type)
                      return (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-gray-500" />
                        </div>
                      )
                    })()
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">{attachment.name}</span>
                    <span className="text-xs text-gray-400">{(attachment.file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute -top-1 -right-1 p-1 bg-gray-200 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Input box - ChatGPT style */}
          <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition-all">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.csv,.ppt,.pptx"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Leaf AI..."
              rows={1}
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none resize-none max-h-[200px] py-2 text-sm"
            />
            
            {/* Mode toggle */}
            <TooltipProvider>
              <div className="flex items-center gap-1 mr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setMode('light')}
                      className={`p-1.5 rounded-lg transition-colors ${
                        mode === 'light' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Fast mode - Quick responses</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        if (isPro) {
                          setMode('heavy')
                        } else {
                          setShowUpgradeModal(true)
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors relative ${
                        mode === 'heavy' ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:text-gray-600'
                      } ${!isPro ? 'cursor-pointer' : ''}`}
                    >
                      <Brain className="w-4 h-4" />
                      {!isPro && (
                        <div className="absolute -top-1 -right-1">
                          <Lock className="w-2.5 h-2.5 text-amber-500" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className={!isPro ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-0 px-4 py-3' : ''}
                    sideOffset={8}
                  >
                    {isPro ? (
                      <p>Research mode - Deep analysis</p>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-white">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-300" />
                          <span className="font-semibold">Pro Feature</span>
                        </div>
                        <p className="text-xs text-purple-100">Upgrade to unlock Research mode</p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            
            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Footer info */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Free &amp; Unlimited
            </span>
            <span>•</span>
            <span>{mode === 'light' ? 'Fast mode' : 'Research mode'}</span>
            {messages.length > 0 && (
              <>
                <span>•</span>
                <button
                  onClick={clearChat}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear chat
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        isPro={isPro}
      />
    </div>
  )
}
