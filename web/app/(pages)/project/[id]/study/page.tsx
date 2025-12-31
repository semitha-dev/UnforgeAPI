'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loading } from '@/components/ui/loading'
import { 
  Plus, Search, Clock, BookOpen, Brain, Loader2, X, 
  ChevronRight, AlertCircle, Sparkles, GraduationCap,
  MoreVertical, Trash2, Share2, FileText, Upload,
  CheckCircle, XCircle, ArrowLeft, RefreshCw, Trophy,
  Zap, Target, Layers
} from 'lucide-react'

// Types
interface StudySet {
  id: string
  title: string
  description: string
  item_count: number
  flashcard_count: number
  quiz_count: number
  is_ai_generated: boolean
  created_at: string
}

interface StudyItem {
  id: string
  item_type: 'flashcard' | 'quiz'
  item_order: number
  front?: string
  back?: string
  question?: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  correct_answer?: string
  explanation?: string
  difficulty: string
  topic: string
}

interface Note {
  id: string
  title: string
  content: string
}

// Main Page Component
export default function StudyPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [sets, setSets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSet, setDeletingSet] = useState<StudySet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const setIdParam = searchParams.get('setId')
    if (setIdParam) {
      setSelectedSet(setIdParam)
    }
    loadSets()
  }, [projectId, searchParams])

  const loadSets = async () => {
    try {
      const response = await fetch(`/api/study/generate?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setSets(data)
      }
    } catch (error) {
      console.error('Error loading study sets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetCreated = (setId: string) => {
    setShowCreateModal(false)
    setSelectedSet(setId)
    loadSets()
  }

  const handleDeleteSet = async () => {
    if (!deletingSet) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/study/generate?setId=${deletingSet.id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSets(prev => prev.filter(s => s.id !== deletingSet.id))
        setShowDeleteModal(false)
        setDeletingSet(null)
      }
    } catch (error) {
      console.error('Error deleting study set:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Show study session if set is selected
  if (selectedSet) {
    return (
      <StudySession 
        setId={selectedSet} 
        projectId={projectId} 
        onBack={() => {
          setSelectedSet(null)
          loadSets()
        }} 
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  const filteredSets = sets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (set.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="overflow-x-hidden -m-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800">
        <div className="px-4 sm:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Study</h1>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-full">Smart</span>
                </div>
                <p className="text-sm sm:text-base text-neutral-400 mt-0.5 sm:mt-1 hidden sm:block">
                  AI-powered flashcards & quizzes in one unified experience
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-600/20 text-sm sm:text-base flex-shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Generate Study Set</span>
                <span className="sm:hidden">Generate</span>
              </button>
            </div>
            
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-neutral-300 transition-colors" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search study sets..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-neutral-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {filteredSets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredSets.map((set) => (
              <StudySetCard
                key={set.id}
                set={set}
                onClick={() => setSelectedSet(set.id)}
                onDelete={() => {
                  setDeletingSet(set)
                  setShowDeleteModal(true)
                }}
                isMenuOpen={menuOpenFor === set.id}
                onMenuToggle={() => setMenuOpenFor(menuOpenFor === set.id ? null : set.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateStudySetModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSetCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSet && (
        <DeleteConfirmModal
          set={deletingSet}
          isDeleting={isDeleting}
          onConfirm={handleDeleteSet}
          onCancel={() => { setShowDeleteModal(false); setDeletingSet(null); }}
        />
      )}
    </div>
  )
}

// Study Set Card Component
function StudySetCard({ 
  set, 
  onClick, 
  onDelete,
  isMenuOpen,
  onMenuToggle
}: { 
  set: StudySet
  onClick: () => void
  onDelete: () => void
  isMenuOpen: boolean
  onMenuToggle: () => void
}) {
  return (
    <div 
      onClick={onClick}
      className="group relative bg-neutral-900 rounded-2xl border border-neutral-800 p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/50 hover:-translate-y-1"
    >
      {/* Menu Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {isMenuOpen && (
          <div 
            className="absolute right-0 mt-1 w-36 bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 py-1 animate-in fade-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDelete}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
        <GraduationCap className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
            {set.title}
          </h3>
          {set.is_ai_generated && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/20 text-violet-400 rounded">
              AI
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
          {set.description || 'No description'}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs font-medium text-neutral-500">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
          <Layers className="w-3 h-3" />
          <span>{set.flashcard_count} cards</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
          <Target className="w-3 h-3" />
          <span>{set.quiz_count} quiz</span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between text-xs font-medium text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{Math.round(set.item_count * 0.5)} mins</span>
        </div>
        <span className="text-violet-400 group-hover:text-violet-300 flex items-center gap-1">
          Start <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
      <div className="w-24 h-24 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mb-6">
        <GraduationCap className="w-12 h-12 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Start Your Smart Study Journey</h3>
      <p className="text-neutral-400 mb-6 text-center max-w-sm">
        Generate AI-powered study sets that mix flashcards and quiz questions for optimal learning.
      </p>
      <button 
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-600/20"
      >
        <Sparkles className="w-5 h-5" />
        <span>Generate Study Set</span>
      </button>
    </div>
  )
}

// Create Study Set Modal
function CreateStudySetModal({ 
  projectId, 
  onClose, 
  onSuccess 
}: { 
  projectId: string
  onClose: () => void
  onSuccess: (setId: string) => void
}) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<'text' | 'note' | 'pdf'>('text')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [itemCount, setItemCount] = useState(10)
  const [flashcardRatio, setFlashcardRatio] = useState(0.5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  
  // Note selection
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [showNoteDropdown, setShowNoteDropdown] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // PDF state
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('id, title, content')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (data) setNotes(data)
    }
    loadNotes()
  }, [projectId, supabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNoteDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId)
    const note = notes.find(n => n.id === noteId)
    if (note) {
      // Strip HTML and get plain text
      const plainText = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      setStudyMaterial(plainText)
      if (!title) setTitle(`${note.title} Study Set`)
    }
    setShowNoteDropdown(false)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsPdfLoading(true)
    setPdfFileName(file.name)
    
    try {
      // @ts-ignore - pdfjs-dist types
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n'
      }
      
      setStudyMaterial(fullText.substring(0, 15000))
      if (!title) setTitle(file.name.replace('.pdf', '') + ' Study Set')
    } catch (err) {
      setError('Failed to read PDF. Please try another file.')
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!title || !studyMaterial) {
      setError('Please provide a title and study material')
      return
    }
    
    setIsGenerating(true)
    setError('')
    
    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          studyMaterial,
          itemCount,
          flashcardRatio,
          projectId,
          noteId: selectedNoteId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 402) {
          setError(`Insufficient tokens. You need at least ${data.tokensRequired} tokens. Current: ${data.currentBalance}`)
        } else {
          throw new Error(data.error || 'Failed to generate study set')
        }
        return
      }
      
      onSuccess(data.studySetId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(noteSearch.toLowerCase())
  )

  const flashcardCount = Math.round(itemCount * flashcardRatio)
  const quizCount = itemCount - flashcardCount

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-neutral-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto border border-neutral-800">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">Generate Study Set</h2>
            <p className="text-xs text-neutral-400">AI creates the perfect mix of flashcards & quizzes</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Review"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Source Material</label>
            <div className="flex gap-2 mb-3">
              {[
                { type: 'text', icon: FileText, label: 'Text' },
                { type: 'note', icon: BookOpen, label: 'Notes' },
                { type: 'pdf', icon: Upload, label: 'PDF' }
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => { 
                    setSourceType(type as any)
                    if (type !== 'note') setSelectedNoteId(null)
                    if (type !== 'pdf') setPdfFileName('')
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    sourceType === type
                      ? 'bg-violet-500/20 text-violet-400 border-2 border-violet-500'
                      : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {sourceType === 'text' && (
              <textarea
                value={studyMaterial}
                onChange={(e) => setStudyMaterial(e.target.value)}
                placeholder="Paste your study material here..."
                rows={6}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
              />
            )}

            {sourceType === 'note' && (
              <div ref={dropdownRef} className="relative">
                <div 
                  onClick={() => setShowNoteDropdown(!showNoteDropdown)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl cursor-pointer flex items-center justify-between"
                >
                  <span className={selectedNoteId ? 'text-white' : 'text-neutral-500'}>
                    {selectedNoteId ? notes.find(n => n.id === selectedNoteId)?.title : 'Select a note...'}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-neutral-500 transition-transform ${showNoteDropdown ? 'rotate-90' : ''}`} />
                </div>
                
                {showNoteDropdown && (
                  <div className="absolute z-20 mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-neutral-700">
                      <input
                        type="text"
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredNotes.map(note => (
                        <div
                          key={note.id}
                          onClick={() => handleNoteSelect(note.id)}
                          className={`px-4 py-3 cursor-pointer hover:bg-violet-500/10 ${
                            selectedNoteId === note.id ? 'bg-violet-500/20 text-violet-400' : 'text-neutral-300'
                          }`}
                        >
                          {note.title}
                        </div>
                      ))}
                      {filteredNotes.length === 0 && (
                        <div className="px-4 py-3 text-sm text-neutral-500 text-center">No notes found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sourceType === 'pdf' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPdfLoading}
                  className="w-full px-4 py-8 bg-neutral-800 border-2 border-dashed border-neutral-700 rounded-xl hover:border-violet-500 hover:bg-violet-500/5 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  {isPdfLoading ? (
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  ) : pdfFileName ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                      <span className="text-sm text-neutral-300">{pdfFileName}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-neutral-500" />
                      <span className="text-sm text-neutral-400">Click to upload PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Item Count & Ratio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Total Items</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(count => (
                  <button
                    key={count}
                    onClick={() => setItemCount(count)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      itemCount === count
                        ? 'bg-violet-500/20 text-violet-400 border-2 border-violet-500'
                        : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Study Mix</label>
              <select
                value={flashcardRatio}
                onChange={(e) => setFlashcardRatio(parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-sm"
              >
                <option value={0.7}>More Flashcards (70%)</option>
                <option value={0.5}>Balanced (50/50)</option>
                <option value={0.3}>More Quizzes (70%)</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-xl border border-violet-500/20">
            <div className="text-xs font-medium text-violet-400 mb-2">Your study set will include:</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-neutral-200">{flashcardCount} Flashcards</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-neutral-200">{quizCount} Quiz Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-5 py-3 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            disabled={!title || !studyMaterial || isGenerating}
            className="flex-1 px-5 py-3 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal
function DeleteConfirmModal({ 
  set, 
  isDeleting, 
  onConfirm, 
  onCancel 
}: { 
  set: StudySet
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-800">
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Delete Study Set</h2>
          <button onClick={onCancel} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">{set.title}</h3>
            <p className="text-sm text-neutral-400">{set.item_count} items will be deleted</p>
          </div>
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            This action cannot be undone.
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 font-medium">
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Study Session Component - The main study experience
function StudySession({ 
  setId, 
  projectId, 
  onBack 
}: { 
  setId: string
  projectId: string
  onBack: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [set, setSet] = useState<StudySet | null>(null)
  const [items, setItems] = useState<StudyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [itemStartTime, setItemStartTime] = useState(Date.now())
  
  // Touch/swipe state for mobile navigation
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50 // minimum swipe distance in pixels

  useEffect(() => {
    loadStudySet()
  }, [setId])

  useEffect(() => {
    setItemStartTime(Date.now())
  }, [currentIndex])

  const loadStudySet = async () => {
    try {
      const response = await fetch(`/api/study/generate?setId=${setId}`)
      if (response.ok) {
        const data = await response.json()
        setSet(data.set)
        setItems(data.items)
      }
    } catch (error) {
      console.error('Error loading study set:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentItem = items[currentIndex]
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0

  const handleFlashcardNext = (knew: boolean) => {
    if (knew) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }))
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }))
    }
    goToNext()
  }

  const handleQuizAnswer = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
    setShowResult(true)
    
    if (answer === currentItem?.correct_answer) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }))
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }))
    }
  }

  const goToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setIsFinished(true)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setIsFlipped(false)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  // Touch handlers for swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    // For flashcards: swipe left = next, swipe right = prev
    if (currentItem?.item_type === 'flashcard') {
      if (isLeftSwipe) {
        // Swiped left - go to next (mark as didn't know if flipped)
        if (isFlipped) {
          handleFlashcardNext(false) // Swipe left = didn't know
        } else {
          // If not flipped, just move to next
          goToNext()
        }
      } else if (isRightSwipe) {
        if (isFlipped) {
          handleFlashcardNext(true) // Swipe right = got it
        } else {
          // If not flipped, go to previous
          goToPrev()
        }
      }
    }
    // Reset touch state
    setTouchStart(null)
    setTouchEnd(null)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setSelectedAnswer(null)
    setShowResult(false)
    setIsFinished(false)
    setScore({ correct: 0, total: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (!set || items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-neutral-400 mb-4">No study items found</p>
          <button onClick={onBack} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            Back to Study Sets
          </button>
        </div>
      </div>
    )
  }

  // Completion Screen
  if (isFinished) {
    const percentage = Math.round((score.correct / score.total) * 100)
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 rounded-3xl shadow-2xl shadow-violet-500/10 p-10 text-center border border-neutral-800">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 ${
            percentage >= 70 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'
          }`}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2">Session Complete!</h2>
          <p className="text-neutral-400 mb-8">
            {percentage >= 80 ? 'Outstanding performance!' : percentage >= 60 ? 'Good effort!' : 'Keep practicing!'}
          </p>
          
          <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-2xl p-6 mb-8 border border-violet-500/20">
            <div className="text-5xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              {percentage}%
            </div>
            <div className="text-sm font-medium text-neutral-400">
              {score.correct} / {score.total} Correct
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleRestart}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-neutral-800 border-2 border-neutral-700 text-neutral-200 font-bold rounded-2xl hover:bg-neutral-700 hover:border-neutral-600 transition-all"
            >
              <RefreshCw className="w-5 h-5" /> Retry
            </button>
            <button 
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="-m-6 min-h-screen bg-gradient-to-b from-neutral-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm hidden sm:inline">Exit</span>
          </button>
          <div className="text-center">
            <div className="text-sm font-bold text-white">{set.title}</div>
            <div className="text-xs text-neutral-500">{currentIndex + 1} / {items.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              currentItem?.item_type === 'flashcard' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {currentItem?.item_type === 'flashcard' ? 'Card' : 'Quiz'}
            </span>
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 bg-neutral-800 w-full">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {currentItem?.item_type === 'flashcard' ? (
          // Flashcard View
          <div 
            className="space-y-8"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative w-full aspect-[4/3] cursor-pointer select-none"
              style={{ perspective: '1000px' }}
            >
              <div 
                className="relative w-full h-full transition-all duration-700 shadow-2xl shadow-violet-100/40 rounded-3xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front */}
                <div 
                  className="absolute inset-0 bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="text-xs font-black text-neutral-600 uppercase tracking-widest mb-4">Question</div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-bold text-white text-center leading-relaxed">
                      {currentItem.front}
                    </p>
                  </div>
                  <div className="text-xs text-neutral-500 text-center flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3" /> Tap to flip • Swipe to navigate
                  </div>
                </div>
                
                {/* Back */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-3xl p-8 flex flex-col"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="text-xs font-black text-violet-200/50 uppercase tracking-widest mb-4">Answer</div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-bold text-center leading-relaxed">
                      {currentItem.back}
                    </p>
                  </div>
                  <div className="text-xs text-violet-200/60 text-center flex items-center justify-center gap-2 sm:hidden">
                    ← Swipe right = Got it • Swipe left = Didn't know →
                  </div>
                </div>
              </div>
            </div>

            {/* Flashcard Actions */}
            {isFlipped && (
              <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-4">
                <button
                  onClick={() => handleFlashcardNext(false)}
                  className="flex items-center gap-2 px-8 py-4 bg-neutral-900 border-2 border-rose-500/50 text-rose-400 font-bold rounded-2xl hover:bg-rose-500/10 hover:border-rose-400 transition-all"
                >
                  <XCircle className="w-5 h-5" /> <span className="hidden sm:inline">Didn't Know</span><span className="sm:hidden">✗</span>
                </button>
                <button
                  onClick={() => handleFlashcardNext(true)}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle className="w-5 h-5" /> <span className="hidden sm:inline">Got It!</span><span className="sm:hidden">✓</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Quiz View
          <div className="space-y-8">
            <div className="bg-neutral-900 rounded-3xl shadow-2xl shadow-violet-500/10 p-8 border border-neutral-800">
              <div className="mb-8">
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-4 ${
                  currentItem?.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                  currentItem?.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {currentItem?.difficulty}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                  {currentItem?.question}
                </h2>
              </div>

              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => {
                  const optionKey = `option_${option.toLowerCase()}` as keyof StudyItem
                  const text = currentItem?.[optionKey] as string
                  const isSelected = selectedAnswer === option
                  const isCorrect = currentItem?.correct_answer === option

                  let style = 'border-neutral-700 hover:border-violet-500 hover:bg-violet-500/5 bg-neutral-800'
                  if (showResult) {
                    if (isCorrect) style = 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500'
                    else if (isSelected) style = 'border-rose-500 bg-rose-500/10'
                    else style = 'border-neutral-800 bg-neutral-800/50 opacity-50'
                  } else if (isSelected) {
                    style = 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500'
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleQuizAnswer(option)}
                      disabled={showResult}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${style}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          showResult && isCorrect ? 'bg-emerald-500 text-white' :
                          showResult && isSelected ? 'bg-rose-500 text-white' :
                          isSelected ? 'bg-violet-500 text-white' :
                          'bg-neutral-700 text-neutral-300'
                        }`}>
                          {option}
                        </span>
                        <span className="text-neutral-200 font-medium pt-1">{text}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {showResult && currentItem?.explanation && (
                <div className="mt-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/30 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-blue-400 uppercase mb-1">Explanation</div>
                      <p className="text-sm text-blue-200">{currentItem.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Next Button */}
            {showResult && (
              <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4">
                <button
                  onClick={goToNext}
                  className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/20"
                >
                  {currentIndex === items.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
