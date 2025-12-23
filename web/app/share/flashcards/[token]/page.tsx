'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Leaf, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

interface FlashcardSet {
  id: string
  title: string
  description: string
  card_count: number
  created_at: string
}

interface Flashcard {
  id: string
  front: string
  back: string
  card_order: number
}

export default function SharedFlashcardsPage() {
  const params = useParams()
  const token = params.token as string
  
  const [set, setSet] = useState<FlashcardSet | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [studiedCount, setStudiedCount] = useState(0)

  useEffect(() => {
    loadSharedFlashcards()
  }, [token])

  const loadSharedFlashcards = async () => {
    try {
      const response = await fetch(`/api/share/flashcards?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load flashcards')
        return
      }

      setSet(data.set)
      setCards(data.cards)
    } catch (err) {
      setError('Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
      setStudiedCount(prev => Math.max(prev, currentIndex + 1))
    } else {
      setCompleted(true)
      setStudiedCount(cards.length)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setCompleted(false)
    setStudiedCount(0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Flashcards Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Leaf className="w-5 h-5" />
            Go to LeafLearning
          </Link>
        </div>
      </div>
    )
  }

  // Completion screen
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="font-bold text-emerald-600">LeafLearning</span>
            </Link>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <div className="text-center max-w-lg">
            {/* Success animation */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-900" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Great Job! 🎉</h1>
            <p className="text-lg text-gray-600 mb-2">
              You've completed all {cards.length} flashcards in
            </p>
            <p className="text-xl font-semibold text-indigo-600 mb-8">"{set?.title}"</p>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">{cards.length}</p>
                  <p className="text-sm text-gray-500">Cards Studied</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">100%</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <button
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Study Again
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-500">
                    Want to create your own?
                  </span>
                </div>
              </div>

              <Link
                href="/signup"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Leaf className="w-5 h-5" />
                Create Free Flashcards on LeafLearning
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-gray-500">
                AI-powered flashcards, quizzes, and study tools. Free to start!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100">
              <Leaf className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-bold text-emerald-600">LeafLearning</span>
          </Link>
          <Link 
            href="/signup"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Create Your Own →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{set?.title}</h1>
          {set?.description && (
            <p className="text-gray-600">{set.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Card {currentIndex + 1} of {cards.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative bg-white rounded-2xl shadow-xl cursor-pointer transition-all duration-500 hover:shadow-2xl mx-auto max-w-2xl"
            style={{
              minHeight: '350px',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-sm font-medium text-indigo-600 mb-4">QUESTION</div>
              <p className="text-2xl font-medium text-gray-900 text-center leading-relaxed">
                {currentCard.front}
              </p>
              <div className="absolute bottom-4 text-sm text-gray-400">Click to flip</div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-indigo-600 text-white rounded-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-sm font-medium opacity-75 mb-4">ANSWER</div>
              <p className="text-2xl font-medium text-center leading-relaxed">
                {currentCard.back}
              </p>
              <div className="absolute bottom-4 text-sm opacity-75">Click to flip back</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm border border-gray-200"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex gap-1">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setIsFlipped(false)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-indigo-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {currentIndex === cards.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
