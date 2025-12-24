'use client'

import React, { useState, useEffect } from 'react'
import { 
  Leaf, 
  ArrowRight, 
  RotateCcw, 
  ChevronRight, 
  Sparkles, 
  BookOpen, 
  Trophy,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
  Brain
} from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description?: string
  question_count: number
  created_at: string
}

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation?: string
  question_order: number
}

interface Answer {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
}

/**
 * SharedQuizPage
 * Premium UI for shared quizzes.
 * Matches the design language of SharedFlashcardsPage.
 */

export default function SharedQuizPage() {
  const [token, setToken] = useState('')
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get('token')
    const pathToken = window.location.pathname.split('/').pop()
    
    const activeToken = queryToken || pathToken || 'sample-token'
    setToken(activeToken)
    loadSharedQuiz(activeToken)
  }, [])

  const loadSharedQuiz = async (tokenToUse: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/share/quiz?token=${tokenToUse}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load quiz')
        return
      }

      setQuiz(data.quiz)
      setQuestions(data.questions)
    } catch (err) {
      setError('Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return

    const currentQuestion = questions[currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    setAnswers([...answers, {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect
    }])
    setShowResult(true)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setCompleted(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setCompleted(false)
  }

  const getScore = () => answers.filter(a => a.isCorrect).length
  const getScorePercentage = () => Math.round((getScore() / questions.length) * 100)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-6 h-6" />
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Loading your quiz...</p>
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
          <h1 className="text-2xl font-black text-slate-900 mb-2">Quiz Not Found</h1>
          <p className="text-slate-500 mb-8">{error}</p>
          <a 
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            <Leaf size={18} />
            Back to LeafLearning
          </a>
        </div>
      </div>
    )
  }

  if (completed) {
    const score = getScore()
    const percentage = getScorePercentage()
    const isPassing = percentage >= 70

    return (
      <div className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-200/40 p-10 relative overflow-hidden border border-slate-100">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full" />
          <div className="relative">
            <div className={`w-20 h-20 ${isPassing ? 'bg-emerald-500' : 'bg-amber-500'} rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-8 shadow-lg ${isPassing ? 'shadow-emerald-200' : 'shadow-amber-200'}`}>
              <Trophy className="w-10 h-10 text-white -rotate-12" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              {isPassing ? 'Great Job! 🎉' : 'Keep Practicing! 💪'}
            </h1>
            <p className="text-slate-500 mb-8">You scored <span className={`font-semibold ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>{percentage}%</span> on <span className="font-semibold text-indigo-600">"{quiz?.title}"</span></p>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-emerald-50 p-4 rounded-2xl">
                <div className="text-2xl font-bold text-emerald-600">{score}</div>
                <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Correct</div>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl">
                <div className="text-2xl font-bold text-red-500">{questions.length - score}</div>
                <div className="text-[10px] text-red-400 uppercase tracking-widest font-black">Wrong</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="text-2xl font-bold text-slate-900">{questions.length}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Total</div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRestart}
                className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Try Again
              </button>
              <div className="h-px bg-slate-100 my-4" />
              <p className="text-sm text-slate-400 mb-4 font-medium">Ready for your own quiz?</p>
              <a
                href="/"
                className="w-full py-4 px-6 bg-indigo-500 text-white rounded-2xl font-black hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group"
              >
                <Leaf size={18} />
                Create on LeafLearning
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed uppercase tracking-wider font-bold">
                AI-powered study tools. Free to start.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
  const options = [
    { key: 'A', value: currentQuestion.option_a },
    { key: 'B', value: currentQuestion.option_b },
    { key: 'C', value: currentQuestion.option_c },
    { key: 'D', value: currentQuestion.option_d },
  ]

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 selection:bg-indigo-100">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-200">
              <Leaf className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">LeafLearning</span>
          </a>
          <a href="/" className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full transition-colors">
            Create Yours Free
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase mb-4 tracking-[0.2em]">
            <Brain size={12} /> Shared Quiz
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">{quiz?.title || 'Untitled Quiz'}</h1>
          <p className="text-slate-500 text-balance max-w-lg mx-auto">{quiz?.description}</p>
        </div>

        <div className="max-w-xl mx-auto mb-10">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">
            <span>Progress</span>
            <span>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/40">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6">Question {currentIndex + 1}</div>
            <p className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed mb-8">
              {currentQuestion.question_text}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = selectedAnswer === option.key
                const isCorrect = option.key === currentQuestion.correct_answer
                const showCorrectness = showResult

                let bgColor = 'bg-slate-50 hover:bg-slate-100'
                let borderColor = 'border-slate-200'
                let textColor = 'text-slate-700'
                let keyBg = 'bg-white'
                let keyText = 'text-slate-500'

                if (showCorrectness) {
                  if (isCorrect) {
                    bgColor = 'bg-emerald-50'
                    borderColor = 'border-emerald-400'
                    textColor = 'text-emerald-900'
                    keyBg = 'bg-emerald-500'
                    keyText = 'text-white'
                  } else if (isSelected && !isCorrect) {
                    bgColor = 'bg-red-50'
                    borderColor = 'border-red-400'
                    textColor = 'text-red-900'
                    keyBg = 'bg-red-500'
                    keyText = 'text-white'
                  }
                } else if (isSelected) {
                  bgColor = 'bg-indigo-50'
                  borderColor = 'border-indigo-400'
                  textColor = 'text-indigo-900'
                  keyBg = 'bg-indigo-500'
                  keyText = 'text-white'
                }

                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelectAnswer(option.key)}
                    disabled={showResult}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${bgColor} ${borderColor} ${textColor} ${showResult ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${keyBg} ${keyText} transition-all`}>
                      {showCorrectness && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                       showCorrectness && isSelected && !isCorrect ? <XCircle className="w-5 h-5" /> :
                       option.key}
                    </span>
                    <span className="text-left flex-1 font-medium">{option.value}</span>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {showResult && currentQuestion.explanation && (
              <div className="mt-6 p-5 bg-sky-50 rounded-2xl border border-sky-200">
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2">Explanation</p>
                <p className="text-sm text-sky-800 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center max-w-xl mx-auto">
          {!showResult ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="px-12 h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
            >
              Submit Answer
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-12 h-14 bg-indigo-500 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-100 bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-indigo-50 to-purple-50 p-10 rounded-[3rem] border border-white">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-3">
              <Sparkles size={14} /> AI Quiz Generator
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2">Create your own quizzes.</h3>
            <p className="text-slate-500">Transform any notes or PDFs into quizzes in seconds.</p>
          </div>
          <a 
            href="/" 
            className="whitespace-nowrap px-8 py-5 bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-600 hover:scale-105 transition-all flex items-center gap-2"
          >
            Start for Free
            <ExternalLink size={18} />
          </a>
        </div>
        <div className="max-w-4xl mx-auto mt-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} LeafLearning.app
        </div>
      </footer>
    </div>
  )
}
