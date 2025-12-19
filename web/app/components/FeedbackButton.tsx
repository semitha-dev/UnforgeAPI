'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { MessageSquare, X, Send, Bug, Lightbulb, HelpCircle, Loader2, Check, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

const categories = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-purple-500' },
  { id: 'general', label: 'General Feedback', icon: HelpCircle, color: 'text-blue-500' },
]

export default function FeedbackButton() {
  const pathname = usePathname()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    checkAuth()
    // Load saved position from localStorage
    const savedPosition = localStorage.getItem('feedbackButtonPosition')
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition)
        setPosition(parsed)
      } catch (e) {
        // Invalid saved position, use default
      }
    }
  }, [])

  // Save position to localStorage when it changes
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('feedbackButtonPosition', JSON.stringify(position))
    }
  }, [position])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    setIsAuthenticated(!!session)
  }

  // Handle mouse/touch drag
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    })
  }

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      // Calculate new position
      let newX = clientX - dragStart.x
      let newY = clientY - dragStart.y
      
      // Constrain to viewport
      const buttonSize = 56 // 14 * 4 = 56px (w-14)
      const padding = 24 // Keep some padding from edges
      
      newX = Math.max(-(window.innerWidth - buttonSize - padding), Math.min(0, newX))
      newY = Math.max(-(window.innerHeight - buttonSize - padding), Math.min(0, newY))
      
      setPosition({ x: newX, y: newY })
    }

    const handleDragEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove)
      window.addEventListener('touchend', handleDragEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('touchmove', handleDragMove)
      window.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, dragStart])

  // Don't show on landing page or if not authenticated
  if (pathname === '/' || !isAuthenticated) {
    return null
  }

  async function handleSubmit() {
    if (!category || !message.trim()) return

    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page_url: pathname,
          category,
          message: message.trim()
        })
      })

      if (response.ok) {
        setSent(true)
        setTimeout(() => {
          setIsOpen(false)
          setSent(false)
          setCategory('')
          setMessage('')
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Draggable Button */}
      <button
        ref={buttonRef}
        onClick={() => !isDragging && setIsOpen(true)}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 flex items-center justify-center group ${isDragging ? 'scale-110' : ''}`}
        aria-label="Send Feedback"
      >
        <MessageSquare className="h-6 w-6 group-hover:scale-110 transition-transform" />
        {/* Drag indicator */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-500" />
        </div>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Send Feedback</h3>
                  <p className="text-xs text-gray-500">Help us improve LeafLearn</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {sent ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Thank you!</h4>
                  <p className="text-sm text-gray-500">Your feedback has been submitted.</p>
                </div>
              ) : (
                <>
                  {/* Current Page */}
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Feedback from page:</p>
                    <p className="text-sm text-gray-700 font-mono truncate">{pathname}</p>
                  </div>

                  {/* Category Selection */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Category</p>
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((cat) => {
                        const Icon = cat.icon
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                              category === cat.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${cat.color}`} />
                            <span className="text-xs text-gray-600">{cat.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Your Feedback</p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        category === 'bug' 
                          ? "Describe the bug you encountered..."
                          : category === 'feature'
                          ? "Describe the feature you'd like..."
                          : "Share your thoughts..."
                      }
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!category || !message.trim() || sending}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
