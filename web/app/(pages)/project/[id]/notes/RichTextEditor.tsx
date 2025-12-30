'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Minimize2, Music, X, Loader2, Sparkles, Wand2, MessageSquare, FileText, Send, GripVertical } from 'lucide-react'
import 'react-quill-new/dist/quill.snow.css'

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-[300px] bg-neutral-800 animate-pulse rounded-lg" />
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
    ['blockquote', 'code-block'],
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
  'blockquote', 'code-block',
  'link'
]

// Context Menu Component
interface ContextMenuProps {
  x: number
  y: number
  hasSelection: boolean
  onAskAI: () => void
  onSummarize: () => void
  onGenerate: () => void
  onClose: () => void
}

function ContextMenu({ x, y, hasSelection, onAskAI, onSummarize, onGenerate, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])
  
  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 150)
  
  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
        AI Actions
      </div>
      <button
        onClick={onAskAI}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Ask AI</span>
        <span className="ml-auto text-xs text-neutral-500">{hasSelection ? 'about selection' : 'about note'}</span>
      </button>
      {hasSelection ? (
        <button
          onClick={onSummarize}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-300 hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>Summarize</span>
        </button>
      ) : (
        <button
          onClick={onGenerate}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-neutral-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          <span>Generate</span>
        </button>
      )}
    </div>
  )
}

// Simple markdown to HTML converter
function convertMarkdownToHtml(markdown: string): string {
  let html = markdown
  
  // Handle code blocks first
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto my-2 font-mono"><code>${code.trim()}</code></pre>`
  })
  
  // Handle headers (order matters - process larger headers first)
  html = html.replace(/^#### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1 text-gray-800">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1 text-gray-800">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1 text-gray-800">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 class="font-bold text-base mt-3 mb-2 text-gray-900">$1</h1>')
  
  // Handle bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  
  // Handle inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-700 px-1 py-0.5 rounded text-xs font-mono text-emerald-400">$1</code>')
  
  // Handle links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 hover:underline" target="_blank">$1</a>')
  
  // Process lists and paragraphs
  const lines = html.split('\n')
  const processed: string[] = []
  let inList = false
  let listType = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    if (!trimmed) {
      if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false }
      continue
    }
    
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ul class="list-disc list-inside my-2 space-y-1 text-gray-700 text-sm">')
        inList = true; listType = 'ul'
      }
      processed.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    const numMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
        processed.push('<ol class="list-decimal list-inside my-2 space-y-1 text-gray-700 text-sm">')
        inList = true; listType = 'ol'
      }
      processed.push(`<li>${numMatch[1]}</li>`)
      continue
    }
    
    if (inList) { processed.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
    if (trimmed.startsWith('<')) { processed.push(trimmed); continue }
    processed.push(`<p class="my-1.5 text-gray-700 text-sm leading-relaxed">${trimmed}</p>`)
  }
  
  if (inList) processed.push(listType === 'ul' ? '</ul>' : '</ol>')
  
  return processed.join('')
}

// AI Response Box Component
interface AIBoxProps {
  type: 'ask' | 'summarize' | 'generate'
  selectedText?: string
  fullNoteContent?: string
  onInsert?: (text: string) => void
  onClose: () => void
  onStreamInsert?: (text: string) => void
  initialPosition?: { x: number; y: number }
}

function AIBox({ type, selectedText, fullNoteContent, onInsert, onClose, onStreamInsert, initialPosition }: AIBoxProps) {
  const [question, setQuestion] = useState('')
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Dragging refs for smooth performance (no re-renders during drag)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef(initialPosition || { x: 100, y: 100 })
  
  // Set initial position on mount
  useEffect(() => {
    if (boxRef.current && initialPosition) {
      positionRef.current = initialPosition
      boxRef.current.style.left = `${initialPosition.x}px`
      boxRef.current.style.top = `${initialPosition.y}px`
    }
  }, [])
  
  // Handle mouse down on header to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect()
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      isDraggingRef.current = true
      boxRef.current.style.cursor = 'grabbing'
    }
  }
  
  // Handle mouse move for dragging - using direct DOM manipulation for smooth performance
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !boxRef.current) return
      
      const newX = e.clientX - dragOffsetRef.current.x
      const newY = e.clientY - dragOffsetRef.current.y
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - boxRef.current.offsetWidth
      const maxY = window.innerHeight - boxRef.current.offsetHeight
      
      const clampedX = Math.max(0, Math.min(newX, maxX))
      const clampedY = Math.max(0, Math.min(newY, maxY))
      
      // Direct DOM manipulation - no React re-render, super smooth
      boxRef.current.style.left = `${clampedX}px`
      boxRef.current.style.top = `${clampedY}px`
      positionRef.current = { x: clampedX, y: clampedY }
    }
    
    const handleMouseUp = () => {
      isDraggingRef.current = false
      if (boxRef.current) {
        boxRef.current.style.cursor = 'default'
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])
  
  useEffect(() => {
    // Auto-focus input
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])
  
  // Auto-summarize when type is summarize
  useEffect(() => {
    if (type === 'summarize' && selectedText) {
      handleSummarize()
    }
  }, [type, selectedText])
  
  const handleAskAI = async () => {
    if (!question.trim()) return
    setIsLoading(true)
    setResponse('')
    
    try {
      const context = selectedText || fullNoteContent || ''
      const res = await fetch('/api/leafai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Context:\n${context}\n\nQuestion: ${question}`,
          mode: 'light'
        })
      })
      
      const data = await res.json()
      console.log('AI Response:', data)
      if (data.response) {
        setResponse(data.response)
      } else if (data.error) {
        // Check for insufficient tokens (402 status)
        if (res.status === 402) {
          setResponse('⚠️ **Insufficient Tokens**\n\nYou don\'t have enough tokens to use this feature. Please purchase more tokens to continue.')
        } else {
          setResponse(`Error: ${data.error}`)
        }
      } else {
        setResponse('No response received. Please try again.')
      }
    } catch (error) {
      console.error('AI error:', error)
      setResponse('Sorry, something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSummarize = async () => {
    if (!selectedText) return
    setIsLoading(true)
    setResponse('')
    
    try {
      const res = await fetch('/api/leafai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please provide a concise summary of the following text:\n\n${selectedText}`,
          mode: 'light'
        })
      })
      
      const data = await res.json()
      console.log('Summarize Response:', data)
      if (data.response) {
        setResponse(data.response)
      } else if (data.error) {
        // Check for insufficient tokens (402 status)
        if (res.status === 402) {
          setResponse('⚠️ **Insufficient Tokens**\n\nYou don\'t have enough tokens to use this feature. Please purchase more tokens to continue.')
        } else {
          setResponse(`Error: ${data.error}`)
        }
      } else {
        setResponse('No response received. Please try again.')
      }
    } catch (error) {
      console.error('AI error:', error)
      setResponse('Sorry, something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleGenerate = async () => {
    if (!generatePrompt.trim() || !onStreamInsert) return
    setIsLoading(true)
    setIsStreaming(true)
    
    try {
      // The API doesn't support streaming, so we'll use regular request
      const res = await fetch('/api/leafai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate content about: ${generatePrompt}\n\nProvide informative, well-structured content that can be inserted directly into notes. Do not include any meta commentary, just the content itself.`,
          mode: 'light'
        })
      })
      
      const data = await res.json()
      console.log('Generate Response:', data)
      if (data.response) {
        onStreamInsert(data.response)
        onClose()
      } else if (data.error) {
        // Check for insufficient tokens (402 status)
        if (res.status === 402) {
          setResponse('⚠️ **Insufficient Tokens**\n\nYou don\'t have enough tokens to use this feature. Please purchase more tokens to continue.')
        } else {
          setResponse(`Error: ${data.error}`)
        }
      } else {
        setResponse('No response received. Please try again.')
      }
    } catch (error) {
      console.error('Generate error:', error)
      setResponse('Sorry, something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (type === 'ask') handleAskAI()
      else if (type === 'generate') handleGenerate()
    }
  }
  
  return (
    <div
      ref={boxRef}
      className="bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-w-xl w-full fixed z-50"
      style={{ 
        left: initialPosition?.x || 100, 
        top: initialPosition?.y || 100
      }}
    >
      {/* Header - Draggable */}
      <div 
        className={`px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing select-none ${
          type === 'ask' ? 'bg-emerald-500/20 border-b border-emerald-500/30' :
          type === 'summarize' ? 'bg-purple-500/20 border-b border-purple-500/30' :
          'bg-blue-500/20 border-b border-blue-500/30'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-neutral-400" />
          {type === 'ask' ? (
            <>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-emerald-400 text-sm">Ask AI</span>
            </>
          ) : type === 'summarize' ? (
            <>
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-purple-400 text-sm">Summary</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-blue-400 text-sm">Generate</span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Show selected text context for ask/summarize */}
        {(type === 'ask' || type === 'summarize') && selectedText && (
          <div className="bg-neutral-900 rounded-lg p-3 text-xs text-neutral-400 max-h-24 overflow-y-auto border border-neutral-700">
            <span className="font-medium text-neutral-500 block mb-1">Context:</span>
            {selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}
          </div>
        )}
        
        {/* Input for Ask AI */}
        {type === 'ask' && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={handleAskAI}
              disabled={isLoading || !question.trim()}
              className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
        
        {/* Input for Generate */}
        {type === 'generate' && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">What would you like to generate?</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., facts about cats, a poem about nature..."
                className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !generatePrompt.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </button>
            </div>
            {isStreaming && (
              <p className="text-xs text-blue-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating and inserting into note...
              </p>
            )}
          </div>
        )}
        
        {/* Response display */}
        {(type === 'ask' || type === 'summarize') && (isLoading || response) && (
          <div className={`rounded-lg p-3 ${
            type === 'ask' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-purple-500/10 border border-purple-500/20'
          }`}>
            {isLoading ? (
              <div className="flex items-center gap-2 text-neutral-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{type === 'summarize' ? 'Summarizing...' : 'Thinking...'}</span>
              </div>
            ) : (
              <div 
                className="max-h-64 overflow-y-auto prose prose-sm prose-emerald"
                dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
              />
            )}
          </div>
        )}
        
        {/* Insert button for summarize */}
        {type === 'summarize' && response && !isLoading && onInsert && (
          <button
            onClick={() => {
              onInsert(response)
              onClose()
            }}
            className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium transition-colors"
          >
            Insert Summary Below
          </button>
        )}
      </div>
    </div>
  )
}

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  stickyToolbar?: boolean
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
  stickyToolbar = true
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isToolbarFixed, setIsToolbarFixed] = useState(false)
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const [toolbarWidth, setToolbarWidth] = useState(0)
  const [toolbarLeft, setToolbarLeft] = useState(0)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [aiBox, setAiBox] = useState<{ type: 'ask' | 'summarize' | 'generate'; position: { x: number; y: number } } | null>(null)
  
  // Get plain text from HTML
  const getPlainText = useCallback((html: string) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }, [])
  
  // Handle right click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    
    // Get selected text from Quill
    const container = containerRef.current
    if (!container) return
    
    const quillEditor = container.querySelector('.ql-editor')
    if (!quillEditor) return
    
    const selection = window.getSelection()
    const selected = selection?.toString().trim() || ''
    setSelectedText(selected)
    
    setContextMenu({ x: e.clientX, y: e.clientY })
    setAiBox(null)
  }, [])
  
  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])
  
  // Handle AI actions
  const handleAskAI = useCallback(() => {
    if (contextMenu) {
      setAiBox({ type: 'ask', position: { x: contextMenu.x, y: contextMenu.y } })
      setContextMenu(null)
    }
  }, [contextMenu])
  
  const handleSummarize = useCallback(() => {
    if (contextMenu) {
      setAiBox({ type: 'summarize', position: { x: contextMenu.x, y: contextMenu.y } })
      setContextMenu(null)
    }
  }, [contextMenu])
  
  const handleGenerate = useCallback(() => {
    if (contextMenu) {
      setAiBox({ type: 'generate', position: { x: contextMenu.x, y: contextMenu.y } })
      setContextMenu(null)
    }
  }, [contextMenu])
  
  // Convert markdown to clean HTML for insertion
  const markdownToInsertHtml = useCallback((markdown: string) => {
    let html = markdown
    
    // Handle code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre style="background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 13px; overflow-x: auto; margin: 8px 0; font-family: monospace;"><code>${code.trim()}</code></pre>`
    })
    
    // Handle headers
    html = html.replace(/^#{4,}\s+(.+)$/gm, '<p style="font-weight: 600; font-size: 14px; margin: 12px 0 6px 0; color: #1f2937;">$1</p>')
    html = html.replace(/^###\s+(.+)$/gm, '<p style="font-weight: 600; font-size: 15px; margin: 14px 0 6px 0; color: #1f2937;">$1</p>')
    html = html.replace(/^##\s+(.+)$/gm, '<p style="font-weight: 700; font-size: 16px; margin: 16px 0 8px 0; color: #111827;">$1</p>')
    html = html.replace(/^#\s+(.+)$/gm, '<p style="font-weight: 700; font-size: 18px; margin: 16px 0 8px 0; color: #111827;">$1</p>')
    
    // Remove markdown header underlines (=== or ---)
    html = html.replace(/^[=]{2,}$/gm, '')
    html = html.replace(/^[-]{2,}$/gm, '')
    
    // Handle bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    
    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace;">$1</code>')
    
    // Handle links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>')
    
    // Process line by line for lists and paragraphs
    const lines = html.split('\n')
    const result: string[] = []
    let inList = false
    let listType = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
        continue
      }
      
      // Bullet list
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/)
      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>')
          result.push('<ul style="margin: 8px 0; padding-left: 24px; list-style-type: disc;">')
          inList = true; listType = 'ul'
        }
        result.push(`<li style="margin: 4px 0; color: #374151;">${bulletMatch[1]}</li>`)
        continue
      }
      
      // Numbered list
      const numMatch = trimmed.match(/^\d+\.\s+(.+)$/)
      if (numMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>')
          result.push('<ol style="margin: 8px 0; padding-left: 24px; list-style-type: decimal;">')
          inList = true; listType = 'ol'
        }
        result.push(`<li style="margin: 4px 0; color: #374151;">${numMatch[1]}</li>`)
        continue
      }
      
      // Close list if needed
      if (inList) { result.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = '' }
      
      // Skip if already HTML tag
      if (trimmed.startsWith('<')) { result.push(trimmed); continue }
      
      // Regular paragraph
      result.push(`<p style="margin: 6px 0; color: #374151; line-height: 1.6;">${trimmed}</p>`)
    }
    
    if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>')
    
    return result.join('')
  }, [])
  
  // Insert text into editor (for summary)
  const handleInsert = useCallback((text: string) => {
    const htmlContent = markdownToInsertHtml(text)
    onChange(value + '<br/>' + htmlContent)
  }, [value, onChange, markdownToInsertHtml])
  
  // Insert for generate - no wrapper, just clean content
  const handleStreamInsert = useCallback((text: string) => {
    const htmlContent = markdownToInsertHtml(text)
    const baseContent = value.includes('<!-- ai-generate-marker -->') 
      ? value.split('<!-- ai-generate-marker -->')[0] 
      : value
    onChange(baseContent + '<!-- ai-generate-marker --><br/>' + htmlContent)
  }, [value, onChange, markdownToInsertHtml])
  
  useEffect(() => {
    if (!stickyToolbar) return
    
    const NAV_HEIGHT = 57 // Height of top navigation
    
    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return
      
      const toolbar = container.querySelector('.ql-toolbar') as HTMLElement
      if (!toolbar) return
      
      // Get the container's position relative to viewport
      const containerRect = container.getBoundingClientRect()
      
      // Store toolbar dimensions for placeholder
      if (!toolbarHeight) {
        setToolbarHeight(toolbar.offsetHeight)
      }
      
      // Store container's left position and width for fixed positioning
      setToolbarWidth(containerRect.width)
      setToolbarLeft(containerRect.left)
      
      // Check if toolbar would scroll past the nav
      // The toolbar should stick when container top goes above nav height
      const shouldFix = containerRect.top <= NAV_HEIGHT
      
      if (shouldFix !== isToolbarFixed) {
        setIsToolbarFixed(shouldFix)
      }
    }
    
    // Initial check
    handleScroll()
    
    // Listen to scroll on window and resize
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [stickyToolbar, isToolbarFixed, toolbarHeight])

  return (
    <div ref={containerRef} className={`rich-text-editor ${className}`} onContextMenu={handleContextMenu}>
      {/* Placeholder to prevent content jump when toolbar becomes fixed */}
      {isToolbarFixed && stickyToolbar && (
        <div style={{ height: toolbarHeight }} />
      )}
      
      {/* Fixed toolbar overlay */}
      {isToolbarFixed && stickyToolbar && (
        <style jsx global>{`
          .rich-text-editor .ql-toolbar.ql-snow {
            position: fixed !important;
            top: 57px !important;
            left: ${toolbarLeft}px !important;
            width: ${toolbarWidth}px !important;
            right: auto !important;
            z-index: 50 !important;
            background: #262626 !important;
            border-bottom: 1px solid #404040 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            padding: 0.5rem 0 !important;
            border-radius: 0 !important;
          }
        `}</style>
      )}
      
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={quillModules}
        formats={quillFormats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasSelection={selectedText.length > 0}
          onAskAI={handleAskAI}
          onSummarize={handleSummarize}
          onGenerate={handleGenerate}
          onClose={closeContextMenu}
        />
      )}
      
      {/* AI Box */}
      {aiBox && (
        <AIBox
          type={aiBox.type}
          selectedText={selectedText || undefined}
          fullNoteContent={getPlainText(value)}
          onInsert={handleInsert}
          onStreamInsert={handleStreamInsert}
          onClose={() => setAiBox(null)}
          initialPosition={{
            x: Math.min(aiBox.position.x, window.innerWidth - 580),
            y: Math.min(aiBox.position.y, window.innerHeight - 350)
          }}
        />
      )}
    </div>
  )
}

// Fullscreen editor wrapper for immersive writing
interface FullscreenEditorProps {
  isOpen: boolean
  onClose: () => void
  title: string
  onTitleChange: (title: string) => void
  content: string
  onContentChange: (content: string) => void
  autoSaveStatus?: 'saved' | 'saving' | 'unsaved'
  showMusicPlayer?: boolean
  onToggleMusicPlayer?: () => void
  musicPlayerComponent?: React.ReactNode
}

export function FullscreenEditor({
  isOpen,
  onClose,
  title,
  onTitleChange,
  content,
  onContentChange,
  autoSaveStatus = 'saved',
  showMusicPlayer = false,
  onToggleMusicPlayer,
  musicPlayerComponent
}: FullscreenEditorProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="text-xl font-semibold text-white placeholder-neutral-500 bg-transparent border-none focus:outline-none"
          />
          {autoSaveStatus && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              autoSaveStatus === 'saved' ? 'bg-green-500/20 text-green-400' :
              autoSaveStatus === 'saving' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-neutral-800 text-neutral-400'
            }`}>
              {autoSaveStatus === 'saved' ? '✓ Saved' :
               autoSaveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onToggleMusicPlayer && (
            <button
              onClick={onToggleMusicPlayer}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                showMusicPlayer 
                  ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white shadow-md' 
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
              title="Toggle music player"
            >
              <Music className="w-5 h-5" />
              <span className="text-sm font-medium">Music</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            title="Exit fullscreen"
          >
            <Minimize2 className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>
      
      {/* Editor - Using RichTextEditor for context menu support */}
      <div className="flex-1 overflow-auto bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="note-editor-container mobile-editor h-full bg-neutral-900">
            <RichTextEditor
              value={content}
              onChange={onContentChange}
              placeholder="Start writing your notes..."
              className="h-full bg-neutral-900"
              stickyToolbar={false}
            />
          </div>
        </div>
      </div>
      
      {/* Music Player */}
      {musicPlayerComponent}
    </div>
  )
}
