// app/project/[id]/flashcards/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'

interface FlashcardSet {
  id: string
  title: string
  description: string
  card_count: number
  is_ai_generated: boolean
  created_at: string
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

  if (selectedSet) {
    return <FlashcardViewer setId={selectedSet} onBack={() => {
      setSelectedSet(null)
      loadSets()
    }} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flashcards</h1>
          <p className="text-gray-600">Create and study flashcards to master your material</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="mb-8 w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create Flashcard Set</span>
        </button>

        {sets.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No flashcard sets yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first flashcard set to start studying.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sets.map((set) => (
              <div
                key={set.id}
                onClick={() => setSelectedSet(set.id)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">{set.title}</h3>
                  {set.is_ai_generated && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">AI</span>
                  )}
                </div>
                {set.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{set.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{set.card_count} cards</span>
                  <span className="text-indigo-600 font-medium">Study →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreateFlashcardModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleSetCreated}
          />
        )}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
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
            className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
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
            className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8 p-6">
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
  const [cardCount, setCardCount] = useState<5 | 10>(5)
  const [sourceType, setSourceType] = useState<'text' | 'note' | 'pdf'>('text')
  const [sourceMaterial, setSourceMaterial] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadNotes()
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
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    // For PDF processing, you'd typically use a library like pdf-parse or send to backend
    // For now, we'll show a placeholder message
    setError('PDF processing coming soon! Please use text or notes for now.')
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
      onSuccess(data.set.id)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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
                onClick={() => setSourceType('text')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'text'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setSourceType('note')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'note'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                From Notes
              </button>
              <button
                onClick={() => setSourceType('pdf')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceType === 'pdf'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
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
              <div>
                {notes.length > 0 ? (
                  <select
                    value={selectedNoteId || ''}
                    onChange={(e) => handleNoteSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a note --</option>
                    {notes.map((note) => (
                      <option key={note.id} value={note.id}>{note.title}</option>
                    ))}
                  </select>
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
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-2 text-xs text-gray-500">Upload a PDF file to extract text for flashcard generation</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Flashcards</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setCardCount(5)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  cardCount === 5
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                5 Cards
              </button>
              <button
                onClick={() => setCardCount(10)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  cardCount === 10
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                10 Cards
              </button>
            </div>
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!set || cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
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
              <div className="text-sm font-medium text-indigo-600 mb-4">QUESTION</div>
              <p className="text-2xl font-medium text-gray-900 text-center">
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
              <div className="text-sm font-medium mb-4">ANSWER</div>
              <p className="text-2xl font-medium text-center">
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