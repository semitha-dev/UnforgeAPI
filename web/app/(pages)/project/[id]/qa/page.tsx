// app/project/[id]/qa/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loading } from '@/components/ui/loading'
import { FileText, Upload, Search, X } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description: string
  question_count: number
  created_at: string
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

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleQuizCreated = (quizId?: string) => {
    setShowCreateModal(false)
    loadQuizzes()
    // Auto-open the newly created quiz
    if (quizId) {
      setSelectedQuiz(quizId)
    }
  }

  if (selectedQuiz) {
    return <QuizTaker quizId={selectedQuiz} onBack={() => setSelectedQuiz(null)} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      <div>
        {/* Header */}
        <div className="mb-8">
          <p className="text-gray-600">Create AI-generated quizzes from your study materials</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {/* Create New Quiz Card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="aspect-square bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all flex flex-col items-center justify-center group"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center mb-2 transition-colors">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-green-600">New Quiz</span>
          </button>

          {/* Existing Quizzes */}
          {quizzes
            .filter(quiz => 
              quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (quiz.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => setSelectedQuiz(quiz.id)}
              className="aspect-square bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all text-left overflow-hidden group"
            >
              <div className="h-full flex flex-col p-3">
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-base">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {quiz.description || 'No description'}
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">{quiz.question_count} questions</span>
                  <span className="text-sm text-green-600 font-semibold group-hover:translate-x-0.5 transition-transform">Start →</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {quizzes.length === 0 && (
          <div className="text-center py-12 mt-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first quiz.</p>
          </div>
        )}

        {/* Create Quiz Modal */}
        {showCreateModal && (
          <CreateQuizModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleQuizCreated}
          />
        )}
      </div>
    </div>
  )
}

// Create Quiz Modal Component
interface CreateQuizModalProps {
  projectId: string
  onClose: () => void
  onSuccess: (quizId?: string) => void
}

function CreateQuizModal({ projectId, onClose, onSuccess }: CreateQuizModalProps) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [customCount, setCustomCount] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [sourceType, setSourceType] = useState<'text' | 'note' | 'pdf'>('text')
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
      setStudyMaterial(note.content || '')
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
        setStudyMaterial(fullText.trim())
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
    if (!title.trim() || !studyMaterial.trim()) {
      setError('Please provide title and study material')
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

      // Dispatch event to notify layout to refresh token balance
      window.dispatchEvent(new CustomEvent('tokensUpdated'))
      
      // Pass the quiz ID to auto-open it
      onSuccess(data.quiz?.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Quiz</h2>
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Chapter 1 Quiz"
            />
          </div>

          {/* Source Type Selection */}
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

            {/* Text Input */}
            {sourceType === 'text' && (
              <textarea
                value={studyMaterial}
                onChange={(e) => setStudyMaterial(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste or type your study material here..."
              />
            )}

            {/* Notes Selection with Search */}
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
                        <p className="text-sm text-gray-700 line-clamp-3">{studyMaterial.slice(0, 300)}{studyMaterial.length > 300 ? '...' : ''}</p>
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

            {/* PDF Upload */}
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
                {studyMaterial && sourceType === 'pdf' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Extracted text preview:</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{studyMaterial.slice(0, 300)}{studyMaterial.length > 300 ? '...' : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
            <div className="flex space-x-3">
              <button
                onClick={() => { setQuestionCount(5); setCustomCount(''); }}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  questionCount === 5 && !customCount
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                5
              </button>
              <button
                onClick={() => { setQuestionCount(10); setCustomCount(''); }}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  questionCount === 10 && !customCount
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
                      setQuestionCount(parseInt(val));
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
            <p className="text-xs text-gray-500 mt-1">Max 20 questions</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim() || !studyMaterial.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Quiz...</span>
              </>
            ) : (
              <span>Generate Quiz</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Quiz Taker Component
interface QuizTakerProps {
  quizId: string
  onBack: () => void
}

function QuizTaker({ quizId, onBack }: QuizTakerProps) {
  const supabase = createClient()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mistakesRecorded, setMistakesRecorded] = useState(0)

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    try {
      const [quizRes, questionsRes] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', quizId).single(),
        supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('question_order')
      ])

      if (quizRes.data) setQuiz(quizRes.data)
      if (questionsRes.data) setQuestions(questionsRes.data)
    } catch (error) {
      console.error('Error loading quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return

    const newAnswers = { ...answers, [currentQuestion]: selectedAnswer }
    setAnswers(newAnswers)
    setShowFeedback(true)
  }

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(answers[currentQuestion + 1] || null)
      setShowFeedback(false)
    } else {
      // Calculate score locally first
      let correctCount = 0
      questions.forEach((q, index) => {
        if (answers[index] === q.correct_answer) {
          correctCount++
        }
      })
      setScore(correctCount)
      
      // Submit to backend
      await submitQuiz(correctCount)
    }
  }

  const submitQuiz = async (calculatedScore: number) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          answers // Send the answers object { 0: 'A', 1: 'B', ... }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit quiz')
      }

      const data = await response.json()
      
      // Store mistakes info
      if (data.mistakesRecorded > 0) {
        setMistakesRecorded(data.mistakesRecorded)
        console.log(`Recorded ${data.mistakesRecorded} mistakes to schedule`)
      }
      
      setShowResult(true)
    } catch (error) {
      console.error('Error submitting quiz:', error)
      // Still show result even if submission fails
      setShowResult(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loading message="Loading quiz..." fullScreen={false} />
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="bg-white flex items-center justify-center p-6">
        <div className="bg-gray-50 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            {percentage >= 70 ? (
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
          <p className="text-gray-600 mb-6">
            You scored <span className="font-bold text-indigo-600">{score}</span> out of{' '}
            <span className="font-bold">{questions.length}</span> ({percentage}%)
          </p>
          
          {/* Show mistake recording status */}
          {mistakesRecorded > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-blue-900 text-sm">📚 Mistakes Recorded!</p>
                  <p className="mt-1 text-sm text-blue-800">
                    {mistakesRecorded} incorrect {mistakesRecorded === 1 ? 'answer has' : 'answers have'} been added to your study schedule for review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {score < questions.length && mistakesRecorded === 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-left">
                  <p className="font-semibold text-yellow-900 text-sm">💡 Tip</p>
                  <p className="mt-1 text-sm text-yellow-800">
                    Create a study schedule to automatically track and review your mistakes!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setCurrentQuestion(0)
                setAnswers({})
                setSelectedAnswer(null)
                setShowResult(false)
                setShowFeedback(false)
                setMistakesRecorded(0)
              }}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry Quiz
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const isCorrect = selectedAnswer === currentQ?.correct_answer

  return (
    <div className="bg-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gray-50 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-relaxed">{currentQ?.question_text}</h2>

          {/* Options */}
          <div className="space-y-4 mb-8">
            {['A', 'B', 'C', 'D'].map((option) => {
              const optionText = currentQ[`option_${option.toLowerCase()}` as keyof Question] as string
              const isSelected = selectedAnswer === option
              const isCorrectOption = option === currentQ.correct_answer
              const showCorrectness = showFeedback

              return (
                <button
                  key={option}
                  onClick={() => !showFeedback && handleAnswerSelect(option)}
                  disabled={showFeedback}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    showCorrectness && isCorrectOption
                      ? 'border-green-500 bg-green-50'
                      : showCorrectness && isSelected && !isCorrect
                      ? 'border-red-500 bg-red-50'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-base font-medium ${
                      showCorrectness && isCorrectOption
                        ? 'border-green-500 bg-green-500 text-white'
                        : showCorrectness && isSelected && !isCorrect
                        ? 'border-red-500 bg-red-500 text-white'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-400'
                    }`}>
                      {showCorrectness && isCorrectOption ? '✓' : option}
                    </span>
                    <span className="flex-1 text-lg">{optionText}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`p-4 rounded-lg mb-6 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start space-x-3">
                {isCorrect ? (
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div>
                  <p className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </p>
                  {currentQ.explanation && (
                    <p className={`text-sm mt-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {currentQ.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}