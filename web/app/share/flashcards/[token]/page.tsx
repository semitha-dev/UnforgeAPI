'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  ArrowRight, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Trophy,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Leaf
} from 'lucide-react'

interface FlashcardSet {
  title: string
  description?: string
}

interface Flashcard {
  front: string
  back: string
}

/**
 * SharedFlashcardsPage
 * Premium UI for shared study sets.
 * Updated to be compatible with both Next.js and preview environments.
 */

export default function SharedFlashcardsPage() {
  // Use state to handle token if useParams is unavailable in the current environment
  const [token, setToken] = useState('')
  
  const [set, setSet] = useState<FlashcardSet | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    // Logic to extract token from URL in standard browser environments
    const queryToken = new URLSearchParams(window.location.search).get('token')
    // Fallback for Next.js folder structure /share/[token]
    const pathToken = window.location.pathname.split('/').pop()
    
    const activeToken = queryToken || pathToken || 'sample-token'
    setToken(activeToken)
    loadSharedFlashcards(activeToken)
  }, [])

  const loadSharedFlashcards = async (tokenToUse: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/share/flashcards?token=${tokenToUse}`)
      const data = await response.json()

      if (!response.ok) {
        // For preview purposes, if the API doesn't exist yet, we'll show a friendly message 
        // but the code below is exactly what you need for production
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
    } else {
      setCompleted(true)
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <Image src="/new_logo.png" alt="LeafLearning" width={24} height={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Growing your cards...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Flashcards Not Found</h1>
          <p className="text-slate-500 mb-8">{error}</p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            <Image src="/new_logo.png" alt="LeafLearning" width={18} height={18} className="object-contain" />
            Back to LeafLearning
          </a>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl shadow-emerald-200/40 p-6 sm:p-10 relative overflow-hidden border border-slate-100">
          <div className="absolute -top-16 -right-16 sm:-top-24 sm:-right-24 w-32 h-32 sm:w-48 sm:h-48 bg-emerald-50 rounded-full" />
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-2xl sm:rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg shadow-emerald-200">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white -rotate-12" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Great Job! 🎉</h1>
            <p className="text-sm sm:text-base text-slate-500 mb-6 sm:mb-8">You mastered <span className="font-semibold text-emerald-600">"{set?.title}"</span></p>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{cards.length}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider sm:tracking-widest font-black">Cards</div>
              </div>
              <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">100%</div>
                <div className="text-[9px] sm:text-[10px] text-emerald-400 uppercase tracking-wider sm:tracking-widest font-black">Completed</div>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              <button
                onClick={handleRestart}
                className="w-full py-3 sm:py-4 bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <RotateCcw size={16} className="sm:w-[18px] sm:h-[18px]" />
                Study Again
              </button>
              <div className="h-px bg-slate-100 my-3 sm:my-4" />
              <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 font-medium">Ready for your own deck?</p>
              <a
                href="/"
                className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group text-sm sm:text-base"
              >
                <Leaf size={16} className="sm:w-[18px] sm:h-[18px]" />
                Create on LeafLearning
                <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px] group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-[9px] sm:text-[10px] text-slate-400 mt-3 sm:mt-4 leading-relaxed uppercase tracking-wider font-bold">
                AI-powered study tools. Free to start.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 selection:bg-emerald-100">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-200 overflow-hidden">
              <Image src="/new_logo.png" alt="LeafLearning" width={20} height={20} className="object-contain" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">LeafLearning</span>
          </a>
          <a href="/" className="text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors whitespace-nowrap">
            Create Yours Free
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase mb-3 sm:mb-4 tracking-[0.15em] sm:tracking-[0.2em]">
            <BookOpen size={12} /> Shared Set
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3 px-2">{set?.title || 'Untitled Set'}</h1>
          <p className="text-sm sm:text-base text-slate-500 text-balance max-w-lg mx-auto px-2">{set?.description}</p>
        </div>

        <div className="max-w-xl mx-auto mb-6 sm:mb-10">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mb-2 sm:mb-3 uppercase tracking-wider sm:tracking-widest">
            <span>Progress</span>
            <span>{currentIndex + 1} / {cards.length}</span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="relative group perspective-1000 max-w-xl mx-auto mb-8 sm:mb-12">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`relative w-full aspect-[3/4] sm:aspect-[4/3] cursor-pointer transition-all duration-700 preserve-3d shadow-xl sm:shadow-2xl shadow-emerald-100/40 rounded-[1.5rem] sm:rounded-[2.5rem] ${isFlipped ? 'rotate-y-180' : ''}`}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 md:p-10 flex flex-col">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 flex-shrink-0">Question</div>
              <div className="flex-1 overflow-y-auto flex items-center justify-center min-h-0 px-1">
                <p className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold text-slate-800 leading-relaxed text-center break-words">
                  {currentCard?.front}
                </p>
              </div>
              <div className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 sm:gap-2 mt-2 flex-shrink-0">
                <RotateCcw size={10} className="sm:w-3 sm:h-3" /> Tap to reveal
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-emerald-600 text-white rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 md:p-10 flex flex-col rotate-y-180">
              <div className="text-[9px] sm:text-[10px] font-black text-emerald-200/50 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-2 flex-shrink-0">Answer</div>
              <div className="flex-1 overflow-y-auto flex items-center justify-center min-h-0 px-1">
                <p className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold leading-relaxed text-center break-words">
                  {currentCard?.back}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-emerald-100/70 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mt-2 flex-shrink-0 self-center">
                <CheckCircle2 size={10} className="sm:w-3 sm:h-3" /> Verified
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between max-w-xl mx-auto gap-2 sm:gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:bg-slate-50 disabled:opacity-20 transition-all shadow-sm flex-shrink-0"
          >
            <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/50 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl overflow-hidden">
            {cards.length > 0 && Array.from({ length: Math.min(cards.length, 5) }).map((_, idx) => (
              <div 
                key={idx}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 sm:w-6 bg-emerald-500' : 'w-1 sm:w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 sm:px-8 h-11 sm:h-14 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-bold flex items-center gap-1.5 sm:gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-sm sm:text-base flex-shrink-0"
          >
            {currentIndex === cards.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </main>

      <footer className="mt-12 sm:mt-20 border-t border-slate-100 bg-white py-8 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 bg-gradient-to-br from-emerald-50 to-indigo-50 p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[3rem] border border-white">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-600 font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest mb-2 sm:mb-3">
              <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" /> AI Study Assistant
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-slate-900 mb-1.5 sm:mb-2">Build your own decks.</h3>
            <p className="text-sm sm:text-base text-slate-500">Transform any notes or PDFs into quiz cards in seconds.</p>
          </div>
          <a 
            href="/" 
            className="w-full sm:w-auto text-center whitespace-nowrap px-6 sm:px-8 py-3.5 sm:py-5 bg-emerald-500 text-white font-black rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            Start for Free
            <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
          </a>
        </div>
        <div className="max-w-4xl mx-auto mt-8 sm:mt-12 text-center text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
          &copy; {new Date().getFullYear()} LeafLearning.app
        </div>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}