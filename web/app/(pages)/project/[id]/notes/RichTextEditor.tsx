'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Minimize2, Music } from 'lucide-react'
import 'react-quill-new/dist/quill.snow.css'

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-50 animate-pulse rounded-lg" />
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
    <div ref={containerRef} className={`rich-text-editor ${className}`}>
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
            background: white !important;
            border-bottom: 1px solid #e4e4e7 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
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
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="text-xl font-semibold text-zinc-900 placeholder-zinc-400 bg-transparent border-none focus:outline-none"
          />
          {autoSaveStatus && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              autoSaveStatus === 'saved' ? 'bg-green-100 text-green-600' :
              autoSaveStatus === 'saving' ? 'bg-yellow-100 text-yellow-600' :
              'bg-zinc-100 text-zinc-500'
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
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
              title="Toggle music player"
            >
              <Music className="w-5 h-5" />
              <span className="text-sm font-medium">Music</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            title="Exit fullscreen"
          >
            <Minimize2 className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="note-editor-container mobile-editor h-full bg-white">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={onContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Start writing your notes..."
              className="h-full bg-white"
            />
          </div>
        </div>
      </div>
      
      {/* Music Player */}
      {musicPlayerComponent}
    </div>
  )
}
