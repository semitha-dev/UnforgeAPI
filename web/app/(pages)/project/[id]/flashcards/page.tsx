// app/project/[id]/flashcards/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loading } from '@/components/ui/loading'
import { FileText, Upload, Search, MoreVertical, Pencil, Trash2, Share2, Copy, Check, Link2, Plus, BookOpen, Clock, Loader2, X, ChevronRight, AlertCircle } from 'lucide-react'

interface FlashcardSet {
  id: string
  title: string
  description: string
  card_count: number
  is_ai_generated: boolean
  created_at: string
  share_token?: string
  is_public?: boolean
}

interface Flashcard {
  id: string
  front: string
  back: string
  card_order: number
}

interface Note {
  id: string
  title: string
  content: string
}

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [sets, setSets] = useState<FlashcardSet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Menu and sharing states
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingSet, setSharingSet] = useState<FlashcardSet | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSet, setDeletingSet] = useState<FlashcardSet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null)

  useEffect(() => {
    loadSets()
  }, [projectId])

  const loadSets = async () => {
    try {
      const response = await fetch(`/api/flashcards?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setSets(data)
      }
    } catch (error) {
      console.error('Error loading flashcard sets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCreated = (setId: string) => {
    setShowCreateModal(false)
    setSelectedSet(setId)
  }

  const handleShare = async (set: FlashcardSet) => {
    setSharingSet(set)
    setShowShareModal(true)
    setMenuOpenFor(null)
    setIsSharing(true)
    setCopied(false)

    try {
      const response = await fetch('/api/share/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: set.id })
      })
      const data = await response.json()
      if (response.ok) {
        setShareUrl(data.shareUrl)
        // Update local state
        setSets(prev => prev.map(s => s.id === set.id ? { ...s, share_token: data.shareToken, is_public: true } : s))
      }
    } catch (error) {
      console.error('Error generating share link:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  const handleDeleteSet = async () => {
    if (!deletingSet) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/flashcards?setId=${deletingSet.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSets(prev => prev.filter(s => s.id !== deletingSet.id))
        setShowDeleteModal(false)
        setDeletingSet(null)
      }
    } catch (error) {
      console.error('Error deleting flashcard set:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSet = async (id: string, title: string, description: string) => {
    try {
      const response = await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: id, title, description })
      })
      if (response.ok) {
        setSets(prev => prev.map(s => s.id === id ? { ...s, title, description } : s))
        setShowEditModal(false)
        setEditingSet(null)
      }
    } catch (error) {
      console.error('Error updating flashcard set:', error)
    }
  }

  if (selectedSet) {
    return <FlashcardViewer setId={selectedSet} onBack={() => {
      setSelectedSet(null)
      loadSets()
    }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="px-4 sm:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Flashcard Library</h1>
                <p className="text-sm sm:text-base text-zinc-500 mt-0.5 sm:mt-1 hidden sm:block">Create and study flashcards to master your material.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-zinc-900/10 text-sm sm:text-base flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Set</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
            
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flashcards..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {sets.filter(set => 
          set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (set.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        ).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {sets
              .filter(set => 
                set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (set.description || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((set) => (
              <FlashcardSetCard
                key={set.id}
                set={set}
                onClick={() => setSelectedSet(set.id)}
                onShare={() => handleShare(set)}
                onEdit={() => {
                  setEditingSet(set)
                  setShowEditModal(true)
                }}
                onDelete={() => {
                  setDeletingSet(set)
                  setShowDeleteModal(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            {searchQuery ? (
              <>
                <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6">
                  <BookOpen className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 mb-1">No flashcard sets found</h3>
                <p className="text-zinc-500">Try adjusting your search or create a new set.</p>
              </>
            ) : (
              <>
                <div className="w-full max-w-md mb-8 rounded-2xl overflow-hidden">
                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-auto"
                  >
                    <source src="/vid.webm" type="video/webm" />
                    <source src="/vid.mp4" type="video/mp4" />
                  </video>
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">Create Your First Flashcard Set</h3>
                <p className="text-zinc-500 mb-6 text-center max-w-sm">Build flashcards to memorize key concepts and ace your exams.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-zinc-900/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Flashcard Set</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateFlashcardModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSetCreated}
        />
      )}

      {/* Share Modal */}
      {showShareModal && sharingSet && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-300 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0">
              <h2 className="text-lg font-semibold text-zinc-900">Share Flashcards</h2>
              <button onClick={() => setShowShareModal(false)} className="p-2.5 hover:bg-zinc-100 active:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 -mr-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 pb-8 sm:pb-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1 line-clamp-2">{sharingSet.title}</h3>
                <p className="text-sm text-zinc-500">{sharingSet.card_count} flashcards</p>
              </div>

              {isSharing ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : shareUrl ? (
                <div className="space-y-4">
                  {/* URL display - stacked on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Link2 className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input 
                        type="text" 
                        value={shareUrl} 
                        readOnly 
                        className="flex-1 bg-transparent text-sm text-zinc-700 outline-none truncate"
                      />
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 sm:p-2 bg-white sm:bg-transparent hover:bg-zinc-100 active:bg-zinc-200 rounded-lg transition-colors border sm:border-0 border-zinc-200"
                    >
                      {copied ? (
                        <><Check className="w-4 h-4 text-emerald-600" /><span className="sm:hidden text-sm text-emerald-600 font-medium">Copied!</span></>
                      ) : (
                        <><Copy className="w-4 h-4 text-zinc-500" /><span className="sm:hidden text-sm text-zinc-600 font-medium">Copy Link</span></>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-xs text-zinc-500 text-center">
                    Anyone with this link can view and study these flashcards
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Failed to generate share link. Please try again.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSet && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-white/20 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-semibold text-zinc-900">Delete Flashcard Set</h2>
              <button 
                onClick={() => { setShowDeleteModal(false); setDeletingSet(null); }} 
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">{deletingSet.title}</h3>
                <p className="text-sm text-zinc-500">{deletingSet.card_count} flashcards will be deleted</p>
              </div>

              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                This action cannot be undone.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeletingSet(null); }}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSet}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSet && (
        <EditFlashcardSetModal
          set={editingSet}
          onClose={() => { setShowEditModal(false); setEditingSet(null); }}
          onSave={handleEditSet}
        />
      )}
    </div>
  )
}

// Flashcard Set Card Component (matching Quiz Card style)
interface FlashcardSetCardProps {
  set: FlashcardSet
  onClick: () => void
  onDelete: () => void
  onShare: () => void
  onEdit: () => void
}

function FlashcardSetCard({ set, onClick, onDelete, onShare, onEdit }: FlashcardSetCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate a consistent color based on title length
  const colors = ['bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-emerald-50 text-emerald-600', 'bg-rose-50 text-rose-600', 'bg-amber-50 text-amber-600']
  const colorClass = colors[set.title.length % colors.length]

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Icon & Menu */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-zinc-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onShare(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-zinc-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{set.title}</h3>
          {set.is_ai_generated && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded">AI</span>
          )}
        </div>
        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{set.description || 'No description provided.'}</p>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{Math.round(set.card_count * 0.5)} mins</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <span>{set.card_count} cards</span>
        </div>
      </div>
    </div>
  )
}

// Edit Flashcard Set Modal
interface EditFlashcardSetModalProps {
  set: FlashcardSet
  onClose: () => void
  onSave: (id: string, title: string, description: string) => void
}

function EditFlashcardSetModal({ set, onClose, onSave }: EditFlashcardSetModalProps) {
  const [title, setTitle] = useState(set.title)
  const [description, setDescription] = useState(set.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave(set.id, title.trim(), description.trim())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Flashcard Set</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Flashcard set title..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Create Modal - Choose Manual or AI
interface CreateFlashcardModalProps {
  projectId: string
  onClose: () => void
  onSuccess: (setId: string) => void
}

function CreateFlashcardModal({ projectId, onClose, onSuccess }: CreateFlashcardModalProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'ai'>('choose')

  if (mode === 'manual') {
    return <ManualFlashcardCreator projectId={projectId} onClose={onClose} onSuccess={onSuccess} onBack={() => setMode('choose')} />
  }

  if (mode === 'ai') {
    return <AIFlashcardCreator projectId={projectId} onClose={onClose} onSuccess={onSuccess} onBack={() => setMode('choose')} />
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Flashcards</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-6">Choose how you'd like to create your flashcards:</p>

        <div className="space-y-4">
          <button
            onClick={() => setMode('manual')}
            className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Create Manually</h3>
                <p className="text-sm text-gray-600">Write your own flashcards from scratch</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('ai')}
            className="w-full p-6 border-2 border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Generate with AI</h3>
                <p className="text-sm text-gray-600">Let AI create flashcards from your study material</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Manual Creator Component
interface ManualCreatorProps {
  projectId: string
  onClose: () => void
  onSuccess: (setId: string) => void
  onBack: () => void
}

function ManualFlashcardCreator({ projectId, onClose, onSuccess, onBack }: ManualCreatorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cards, setCards] = useState([{ front: '', back: '' }])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const addCard = () => {
    setCards([...cards, { front: '', back: '' }])
  }

  const removeCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index))
    }
  }

  const updateCard = (index: number, field: 'front' | 'back', value: string) => {
    const newCards = [...cards]
    newCards[index][field] = value
    setCards(newCards)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (validCards.length === 0) {
      setError('Please create at least one complete flashcard')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          projectId,
          isManual: true,
          cards: validCards
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create flashcards')
      }

      const data = await response.json()
      onSuccess(data.set.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-3xl w-full my-8 p-6 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Create Flashcards Manually</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Set Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Biology Chapter 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of this flashcard set"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Flashcards</label>
              <button
                onClick={addCard}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Card</span>
              </button>
            </div>

            <div className="space-y-4">
              {cards.map((card, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Card {index + 1}</span>
                    {cards.length > 1 && (
                      <button
                        onClick={() => removeCard(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Front (Question/Term)</label>
                      <textarea
                        value={card.front}
                        onChange={(e) => updateCard(index, 'front', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Enter question or term..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Back (Answer/Definition)</label>
                      <textarea
                        value={card.back}
                        onChange={(e) => updateCard(index, 'back', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Enter answer or definition..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Flashcard Set'}
          </button>
        </div>
      </div>
    </div>
  )
}

// AI Creator Component
interface AICreatorProps {
  projectId: string
  onClose: () => void
  onSuccess: (setId: string) => void
  onBack: () => void
}

function AIFlashcardCreator({ projectId, onClose, onSuccess, onBack }: AICreatorProps) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cardCount, setCardCount] = useState<number>(5)
  const [customCount, setCustomCount] = useState('')
  const [sourceType, setSourceType] = useState<'text' | 'note' | 'pdf'>('text')
  const [sourceMaterial, setSourceMaterial] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [noteSearch, setNoteSearch] = useState('')
  const [showNoteDropdown, setShowNoteDropdown] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNoteDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotes = async () => {
    try {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (data) setNotes(data)
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const handleNoteSelect = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setSelectedNoteId(noteId)
      setSourceMaterial(note.content || '')
      setShowNoteDropdown(false)
      setNoteSearch('')
    }
  }

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(noteSearch.toLowerCase())
  )

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    setIsPdfLoading(true)
    setPdfFileName(file.name)
    setError('')

    try {
      // Use pdf.js to extract text from PDF
      const pdfjs = await import('pdfjs-dist')
      
      // Use local worker file from public folder
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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

      if (fullText.trim()) {
        setSourceMaterial(fullText.trim())
      } else {
        setError('Could not extract text from PDF. The PDF might be scanned or image-based.')
      }
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError('Failed to process PDF. Please try again or use text input.')
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!title.trim() || !sourceMaterial.trim()) {
      setError('Please provide title and source material')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          cardCount,
          projectId,
          noteId: selectedNoteId,
          sourceMaterial,
          isManual: false
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate flashcards')
      }

      const data = await response.json()
      
      // Dispatch event to notify layout to refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
      
      onSuccess(data.set.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Generate with AI</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Spanish Vocabulary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Material *</label>
            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => { setSourceType('text'); setSelectedNoteId(null); setPdfFileName(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'text'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Text
              </button>
              <button
                onClick={() => { setSourceType('note'); setPdfFileName(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'note'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                From Notes
              </button>
              <button
                onClick={() => { setSourceType('pdf'); setSelectedNoteId(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'pdf'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
            </div>

            {sourceType === 'text' && (
              <textarea
                value={sourceMaterial}
                onChange={(e) => setSourceMaterial(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste or type your study material here..."
              />
            )}

            {sourceType === 'note' && (
              <div ref={dropdownRef} className="relative">
                {notes.length > 0 ? (
                  <>
                    <div 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer flex items-center justify-between"
                      onClick={() => setShowNoteDropdown(!showNoteDropdown)}
                    >
                      <span className={selectedNoteId ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedNoteId ? notes.find(n => n.id === selectedNoteId)?.title : '-- Select a note --'}
                      </span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${showNoteDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {showNoteDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={noteSearch}
                              onChange={(e) => setNoteSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Search notes..."
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        {/* Notes List */}
                        <div className="overflow-y-auto max-h-48">
                          {filteredNotes.length > 0 ? (
                            filteredNotes.map((note) => (
                              <div
                                key={note.id}
                                onClick={() => handleNoteSelect(note.id)}
                                className={`px-4 py-2 cursor-pointer hover:bg-indigo-50 transition-colors ${
                                  selectedNoteId === note.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
                                }`}
                              >
                                {note.title}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No notes found
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show selected note content preview */}
                    {selectedNoteId && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Content preview:</p>
                        <p className="text-sm text-gray-700 line-clamp-3">{sourceMaterial.slice(0, 300)}{sourceMaterial.length > 300 ? '...' : ''}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    No notes available. Create a note first or use text input.
                  </p>
                )}
              </div>
            )}

            {sourceType === 'pdf' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isPdfLoading ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  {isPdfLoading ? (
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-sm text-indigo-600">Processing PDF...</p>
                    </div>
                  ) : pdfFileName ? (
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 text-indigo-600 mb-2" />
                      <p className="text-sm font-medium text-gray-900">{pdfFileName}</p>
                      <p className="text-xs text-gray-500 mt-1">Click to upload a different file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">Click to upload PDF</p>
                      <p className="text-xs text-gray-500 mt-1">PDF files only</p>
                    </div>
                  )}
                </div>
                
                {/* Show extracted text preview */}
                {sourceMaterial && sourceType === 'pdf' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Extracted text preview:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{sourceMaterial.slice(0, 300)}{sourceMaterial.length > 300 ? '...' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Flashcards</label>
            <div className="flex space-x-3">
              <button
                onClick={() => { setCardCount(5); setCustomCount(''); }}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  cardCount === 5 && !customCount
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                5
              </button>
              <button
                onClick={() => { setCardCount(10); setCustomCount(''); }}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  cardCount === 10 && !customCount
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                10
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="Custom"
                  value={customCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCount(val);
                    if (val && parseInt(val) >= 1 && parseInt(val) <= 20) {
                      setCardCount(parseInt(val));
                    }
                  }}
                  className={`w-full py-2 px-3 rounded-lg border-2 transition-colors text-center ${
                    customCount
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Max 20 flashcards</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim() || !sourceMaterial.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Flashcards...</span>
              </>
            ) : (
              <span>Generate Flashcards</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Flashcard Viewer Component
interface FlashcardViewerProps {
  setId: string
  onBack: () => void
}

function FlashcardViewer({ setId, onBack }: FlashcardViewerProps) {
  const supabase = createClient()
  const [set, setSet] = useState<FlashcardSet | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlashcards()
  }, [setId])

  const loadFlashcards = async () => {
    try {
      const response = await fetch(`/api/flashcards?setId=${setId}`)
      if (response.ok) {
        const data = await response.json()
        setSet(data.set)
        setCards(data.cards)
      }
    } catch (error) {
      console.error('Error loading flashcards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  if (loading) {
    return <Loading message="Loading flashcards..." fullScreen={false} />
  }

  if (!set || cards.length === 0) {
    return (
      <div className="bg-white flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No flashcards found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Sets
          </button>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Sets</span>
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{set.title}</h1>
            <p className="text-sm text-gray-600">
              Card {currentIndex + 1} of {cards.length}
            </p>
          </div>
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <div
            onClick={handleFlip}
            className="relative bg-white rounded-2xl shadow-2xl cursor-pointer transition-all duration-500 hover:shadow-3xl"
            style={{
              minHeight: '400px',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-12 backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-base font-medium text-indigo-600 mb-4">QUESTION</div>
              <p className="text-3xl font-medium text-gray-900 text-center leading-relaxed">
                {currentCard.front}
              </p>
              <div className="absolute bottom-6 text-sm text-gray-400">Click to flip</div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-indigo-600 text-white rounded-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-base font-medium mb-4">ANSWER</div>
              <p className="text-3xl font-medium text-center leading-relaxed">
                {currentCard.back}
              </p>
              <div className="absolute bottom-6 text-sm opacity-75">Click to flip back</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
          >
            ← Previous
          </button>

          <div className="flex space-x-2">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setIsFlipped(false)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-indigo-600 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
          >
            Next →
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>💡 Tip: Click the card to flip it, or use arrow keys to navigate</p>
        </div>
      </div>
    </div>
  )
}