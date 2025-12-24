'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'

import { 
  FileText, Upload, Search, X, MoreVertical, Share2, Trash2, Pencil,
  Copy, Check, Link2, Plus, Brain, Clock, ChevronRight, 
  Trophy, AlertCircle, RefreshCw, ArrowLeft, BookOpen, Loader2
} from 'lucide-react'

// --- Types ---
interface Quiz {
  id: string
  title: string
  description: string
  question_count: number
  created_at: string
  share_token?: string
  is_public?: boolean
  themeColor?: string 
}

interface Note {
  id: string
  title: string
  content: string
}

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  question_order: number
}

// --- Components ---

// 1. Create Quiz Modal
interface CreateQuizModalProps {
  projectId: string
  onClose: () => void
  onSuccess: (quizId: string) => void
}

function CreateQuizModal({ projectId, onClose, onSuccess }: CreateQuizModalProps) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<'text' | 'note' | 'pdf'>('text')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [customCount, setCustomCount] = useState<string>('')
  const [useCustom, setUseCustom] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  
  // Note selection state
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [showNoteDropdown, setShowNoteDropdown] = useState(false)
  const [noteSearch, setNoteSearch] = useState('')
  
  // PDF state
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        if (data) setNotes(data)
      } catch (error) {
        console.error('Error loading notes:', error)
      }
    }
    loadNotes()
  }, [projectId, supabase])

  // Click outside listener for dropdown
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
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setSelectedNoteId(noteId)
      setStudyMaterial(note.content || '')
      setShowNoteDropdown(false)
      setNoteSearch('')
    }
  }

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
      // Dynamically import pdfjs
      const pdfjs = await import('pdfjs-dist')
      // Ensure you have the worker file in your public directory
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
        setStudyMaterial(fullText.trim())
      } else {
        setError('Could not extract text. The PDF might be scanned/image-based.')
      }
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError('Failed to process PDF. Please try again.')
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!title.trim() || !studyMaterial.trim()) {
      setError('Please provide a title and content.')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          studyMaterial,
          questionCount,
          projectId,
          noteId: selectedNoteId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      // Dispatch event to refresh tokens if needed
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
      onSuccess(data.quiz?.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(noteSearch.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white">
          <h2 className="text-lg font-semibold text-zinc-900">Create New Quiz</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Quiz Title</label>
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4: Photosynthesis"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* Source Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-700">Source Material</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'text', label: 'Paste Text', icon: FileText },
                  { id: 'note', label: 'From Note', icon: BookOpen },
                  { id: 'pdf', label: 'Upload PDF', icon: Upload },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSourceType(type.id as any)
                      setSelectedNoteId(null)
                      setPdfFileName('')
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      sourceType === type.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <type.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area based on Source */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Content</label>
              
              {sourceType === 'text' && (
                <textarea 
                  value={studyMaterial}
                  onChange={(e) => setStudyMaterial(e.target.value)}
                  placeholder="Paste your study notes or text here..."
                  className="w-full h-40 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-zinc-400 text-sm"
                />
              )}

              {sourceType === 'note' && (
                <div ref={dropdownRef} className="relative">
                  <div 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer flex items-center justify-between hover:bg-zinc-100 transition-colors"
                    onClick={() => setShowNoteDropdown(!showNoteDropdown)}
                  >
                    <span className={`text-sm ${selectedNoteId ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {selectedNoteId ? notes.find(n => n.id === selectedNoteId)?.title : 'Select a note...'}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${showNoteDropdown ? 'rotate-90' : ''}`} />
                  </div>
                  
                  {showNoteDropdown && (
                    <div className="absolute z-10 mt-2 w-full bg-white border border-zinc-200 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                          <input
                            type="text"
                            value={noteSearch}
                            onChange={(e) => setNoteSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            placeholder="Search..."
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-1">
                        {filteredNotes.length > 0 ? (
                          filteredNotes.map((note) => (
                            <button
                              key={note.id}
                              onClick={() => handleNoteSelect(note.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                selectedNoteId === note.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              {note.title}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-zinc-400">No notes found</div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedNoteId && (
                    <div className="mt-2 text-xs text-zinc-500 line-clamp-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                      {studyMaterial}
                    </div>
                  )}
                </div>
              )}

              {sourceType === 'pdf' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isPdfLoading 
                        ? 'border-indigo-300 bg-indigo-50/30' 
                        : 'border-zinc-300 hover:border-indigo-500 hover:bg-indigo-50/10'
                    }`}
                  >
                    {isPdfLoading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                        <p className="text-sm font-medium text-indigo-600">Extracting text...</p>
                      </div>
                    ) : pdfFileName ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-900">{pdfFileName}</p>
                        <p className="text-xs text-zinc-500 mt-1">Click to replace</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-700">Click to upload PDF</p>
                        <p className="text-xs text-zinc-400 mt-1">Max 10MB</p>
                      </div>
                    )}
                  </div>
                  {studyMaterial && !isPdfLoading && (
                    <div className="text-xs text-zinc-500 line-clamp-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                      {studyMaterial}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question Count */}
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">Number of Questions</label>
              <div className="flex gap-3">
                {[5, 10].map(num => (
                  <button
                    key={num}
                    onClick={() => { setQuestionCount(num); setUseCustom(false); setCustomCount(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      questionCount === num && !useCustom
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={customCount}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomCount(val)
                      const num = parseInt(val)
                      if (num >= 1 && num <= 20) {
                        setQuestionCount(num)
                        setUseCustom(true)
                      }
                    }}
                    onFocus={() => setUseCustom(true)}
                    placeholder="1-20"
                    className={`w-full py-2 px-3 rounded-lg text-sm font-medium border text-center transition-all ${
                      useCustom && customCount
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                    }`}
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">Choose preset or enter custom (1-20)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            disabled={!title || !studyMaterial || isGenerating}
            className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generate Quiz
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// 2. Share Quiz Modal
interface ShareModalProps {
  quiz: Quiz
  onClose: () => void
}

function ShareQuizModal({ quiz, onClose }: ShareModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(quiz.is_public || false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const generateShareLink = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/share/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, action: 'enable' })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate share link')
      }
      
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setIsPublic(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const disableSharing = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/share/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, action: 'disable' })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disable sharing')
      }
      
      setShareUrl(null)
      setIsPublic(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Initialize share URL if quiz is already public
  useEffect(() => {
    if (quiz.share_token && quiz.is_public) {
      const baseUrl = window.location.origin
      setShareUrl(`${baseUrl}/share/quiz/${quiz.share_token}`)
      setIsPublic(true)
    }
  }, [quiz])

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0">
          <h2 className="text-lg font-semibold text-zinc-900">Share Quiz</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-zinc-100 active:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 pb-8 sm:pb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-1 line-clamp-2">{quiz.title}</h3>
            <p className="text-sm text-zinc-500">{quiz.question_count} questions</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isPublic && shareUrl ? (
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
                  onClick={copyToClipboard}
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
                Anyone with this link can take the quiz
              </p>

              <button
                onClick={disableSharing}
                disabled={isLoading}
                className="w-full py-3 sm:py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl border border-red-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Disabling...' : 'Disable Sharing'}
              </button>
            </div>
          ) : (
            <button
              onClick={generateShareLink}
              disabled={isLoading}
              className="w-full py-3.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Generate Share Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 3. Quiz Card
interface QuizCardProps {
  quiz: Quiz
  onClick: () => void
  onDelete: () => void
  onShare: () => void
  onEdit: () => void
}

function QuizCard({ quiz, onClick, onDelete, onShare, onEdit }: QuizCardProps) {
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

  // Generate a consistent color based on title length (for aesthetics without storing in DB)
  const colors = ['bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600', 'bg-emerald-50 text-emerald-600', 'bg-rose-50 text-rose-600', 'bg-amber-50 text-amber-600']
  const colorClass = colors[quiz.title.length % colors.length]

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
    >
      {/* Icon & Menu */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass}`}>
          <Brain className="w-6 h-6" />
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
        <h3 className="font-bold text-zinc-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{quiz.title}</h3>
        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{quiz.description || 'No description provided.'}</p>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{Math.round(quiz.question_count * 1.5)} mins</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <span>{quiz.question_count} Qs</span>
        </div>
      </div>
    </div>
  )
}

// Edit Quiz Modal
interface EditQuizModalProps {
  quiz: Quiz
  onClose: () => void
  onSave: (id: string, title: string, description: string) => void
}

function EditQuizModal({ quiz, onClose, onSave }: EditQuizModalProps) {
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await onSave(quiz.id, title.trim(), description.trim())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Quiz</h2>
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
              placeholder="Quiz title..."
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

// 3. Quiz Taker (The immersive view)
interface QuizTakerProps {
  quizId: string
  onBack: () => void
}

function QuizTaker({ quizId, onBack }: QuizTakerProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [mistakesRecorded, setMistakesRecorded] = useState(0)

  // Load quiz details
  useEffect(() => {
    const loadQuizData = async () => {
      try {
        // Fetch questions from Supabase
        const { data: questionsData, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('question_order')
        
        if (error) throw error
        if (questionsData) setQuestions(questionsData as any)
      } catch (error) {
        console.error('Error loading quiz:', error)
        alert('Failed to load quiz. Please try again.')
        onBack()
      } finally {
        setLoading(false)
      }
    }
    loadQuizData()
  }, [quizId, onBack]) // Removed supabase dependency

  const currentQ = questions[currentIdx]
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0

  const handleAnswer = (option: string) => {
    if (showFeedback) return
    setAnswers(prev => ({ ...prev, [currentIdx]: option }))
    setShowFeedback(true)
  }

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setShowFeedback(false)
    } else {
      // Calculate score locally
      let correct = 0
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) correct++
      })
      setScore(correct)
      
      // Submit results
      await submitQuizResults(correct)
    }
  }

  const submitQuizResults = async (finalScore: number) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          answers // sending index-based or mapped answers based on your API expectation
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.mistakesRecorded > 0) {
          setMistakesRecorded(data.mistakesRecorded)
        }
      }
    } catch (error) {
      console.error('Submission error:', error)
    } finally {
      setSubmitting(false)
      setIsFinished(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-zinc-100">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${percentage >= 70 ? 'bg-emerald-50' : 'bg-yellow-50'}`}>
            <Trophy className={`w-12 h-12 ${percentage >= 70 ? 'text-emerald-500' : 'text-yellow-500'}`} />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">Quiz Complete!</h2>
          <p className="text-zinc-500 mb-8">
            {percentage >= 80 ? 'Outstanding performance!' : 'Good effort, keep practicing!'}
          </p>
          
          <div className="bg-zinc-50 rounded-2xl p-6 mb-4">
            <div className="text-5xl font-bold text-indigo-600 mb-2">{percentage}%</div>
            <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              {score} / {questions.length} Correct
            </div>
          </div>

          {mistakesRecorded > 0 && (
            <div className="mb-8 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{mistakesRecorded} mistakes saved for review</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setCurrentIdx(0); setAnswers({}); setShowFeedback(false); setIsFinished(false);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <button 
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Exit</span>
          </button>
          <div className="text-sm font-medium text-zinc-400">
            {currentIdx + 1} / {questions.length}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-zinc-100 w-full">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-12 leading-tight">
            {currentQ?.question_text}
          </h2>

          <div className="space-y-4">
            {['A', 'B', 'C', 'D'].map((option) => {
              const optionKey = `option_${option.toLowerCase()}` as keyof Question
              const text = currentQ?.[optionKey] as string
              const isSelected = answers[currentIdx] === option
              const isCorrect = currentQ?.correct_answer === option
              
              let stateStyle = 'border-zinc-200 hover:border-indigo-300 hover:bg-white bg-white'
              if (showFeedback) {
                if (isCorrect) stateStyle = 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 text-emerald-900'
                else if (isSelected) stateStyle = 'border-rose-500 bg-rose-50 text-rose-900'
                else stateStyle = 'border-zinc-100 bg-zinc-50 opacity-60'
              } else if (isSelected) {
                stateStyle = 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 text-indigo-900'
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={showFeedback}
                  className={`w-full p-6 text-left rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 group ${stateStyle}`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    showFeedback && isCorrect 
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : showFeedback && isSelected
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : isSelected 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-zinc-300 text-zinc-400 group-hover:border-indigo-400 group-hover:text-indigo-500'
                  }`}>
                    {option}
                  </div>
                  <span className="text-lg font-medium">{text}</span>
                  
                  {showFeedback && isCorrect && (
                    <Check className="w-6 h-6 text-emerald-600 ml-auto shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <X className="w-6 h-6 text-rose-500 ml-auto shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Explanation / Next */}
          {showFeedback && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-2">
              <div className={`p-6 rounded-2xl mb-6 flex gap-4 ${
                answers[currentIdx] === currentQ.correct_answer 
                  ? 'bg-emerald-50/50 border border-emerald-100' 
                  : 'bg-indigo-50/50 border border-indigo-100' 
              }`}>
                <div className="shrink-0 p-2 bg-white rounded-full shadow-sm">
                  {answers[currentIdx] === currentQ.correct_answer 
                    ? <Check className="w-5 h-5 text-emerald-600" />
                    : <AlertCircle className="w-5 h-5 text-indigo-600" />
                  }
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 mb-1">
                    {answers[currentIdx] === currentQ.correct_answer ? 'Correct!' : 'Explanation'}
                  </h4>
                  <p className="text-zinc-600 leading-relaxed">{currentQ.explanation}</p>
                </div>
              </div>

              <button 
                onClick={handleNext}
                disabled={submitting}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-zinc-900/10 hover:shadow-zinc-900/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {currentIdx < questions.length - 1 ? 'Next Question' : 'See Results'}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 4. Main Page Component
export default function QuizPage() {
  const params = useParams()
  const projectId = params.id as string
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [shareQuiz, setShareQuiz] = useState<Quiz | null>(null)
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)

  useEffect(() => {
    loadQuizzes()
  }, [projectId])

  const loadQuizzes = async () => {
    try {
      const response = await fetch(`/api/quiz/generate?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data)
      }
    } catch (error) {
      console.error('Error loading quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return
    
    try {
      const response = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' })
      if (response.ok) {
        setQuizzes(prev => prev.filter(q => q.id !== quizId))
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
    }
  }

  const handleEditQuiz = async (id: string, title: string, description: string) => {
    try {
      const response = await fetch(`/api/quiz/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      })
      if (response.ok) {
        setQuizzes(prev => prev.map(q => q.id === id ? { ...q, title, description } : q))
        setShowEditModal(false)
        setEditingQuiz(null)
      }
    } catch (error) {
      console.error('Error updating quiz:', error)
    }
  }

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If a quiz is selected, show the quiz taker view
  if (selectedQuizId) {
    return <QuizTaker quizId={selectedQuizId} onBack={() => setSelectedQuizId(null)} />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="px-8 py-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Quiz Library</h1>
              <p className="text-zinc-500 mt-1">Review your automated quizzes and track progress.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes..."
                  className="pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                />
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Quiz</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredQuizzes.map(quiz => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                onClick={() => setSelectedQuizId(quiz.id)}
                onDelete={() => handleDeleteQuiz(quiz.id)}
                onShare={() => setShareQuiz(quiz)}
                onEdit={() => {
                  setEditingQuiz(quiz)
                  setShowEditModal(true)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6">
              <Brain className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 mb-1">No quizzes found</h3>
            <p className="text-zinc-500">Try creating a new one or adjusting your search.</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateQuizModal 
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(id) => {
            setShowCreateModal(false)
            loadQuizzes() // Refresh list
            setSelectedQuizId(id) // Open new quiz
          }}
        />
      )}

      {shareQuiz && (
        <ShareQuizModal
          quiz={shareQuiz}
          onClose={() => {
            setShareQuiz(null)
            loadQuizzes() // Refresh to update share status
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => { setShowEditModal(false); setEditingQuiz(null); }}
          onSave={handleEditQuiz}
        />
      )}
    </div>
  )
}