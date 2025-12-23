'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Leaf, ArrowRight, RotateCcw, Sparkles, CheckCircle, XCircle } from 'lucide-react'

interface Quiz {
  id: string
  title: string
  description: string
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
  explanation: string
  question_order: number
}

interface Answer {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
}

export default function SharedQuizPage() {
  const params = useParams()
  const token = params.token as string
  
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
    loadSharedQuiz()
  }, [token])

  const loadSharedQuiz = async () => {
    try {
      const response = await fetch(`/api/share/quiz?token=${token}`)
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

  const getScore = () => {
    return answers.filter(a => a.isCorrect).length
  }

  const getScorePercentage = () => {
    return Math.round((getScore() / questions.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Leaf className="w-5 h-5" />
            Go to LeafLearning
          </Link>
        </div>
      </div>
    )
  }

  // Completion screen with results
  if (completed) {
    const score = getScore()
    const percentage = getScorePercentage()
    const isPassing = percentage >= 70

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
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
          <div className="text-center max-w-lg w-full">
            {/* Success/Fail animation */}
            <div className="relative mb-8">
              <div className={`w-24 h-24 ${isPassing ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-orange-400 to-red-500'} rounded-full flex items-center justify-center mx-auto shadow-lg`}>
                {isPassing ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <span className="text-3xl font-bold text-white">{percentage}%</span>
                )}
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-900" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isPassing ? 'Great Job! 🎉' : 'Keep Practicing! 💪'}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              You scored {score} out of {questions.length} on
            </p>
            <p className="text-xl font-semibold text-purple-600 mb-8">"{quiz?.title}"</p>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{score}</p>
                  <p className="text-sm text-gray-500">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-400">{questions.length - score}</p>
                  <p className="text-sm text-gray-500">Incorrect</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${isPassing ? 'text-green-600' : 'text-orange-600'}`}>{percentage}%</p>
                  <p className="text-sm text-gray-500">Score</p>
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
                Try Again
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-br from-purple-50 via-white to-indigo-50 text-gray-500">
                    Want to create your own?
                  </span>
                </div>
              </div>

              <Link
                href="/signup"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Leaf className="w-5 h-5" />
                Create Free Quizzes on LeafLearning
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-xs text-gray-500">
                AI-powered quizzes, flashcards, and study tools. Free to start!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const options = [
    { key: 'A', value: currentQuestion.option_a },
    { key: 'B', value: currentQuestion.option_b },
    { key: 'C', value: currentQuestion.option_c },
    { key: 'D', value: currentQuestion.option_d },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
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
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Create Your Own →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{quiz?.title}</h1>
          <p className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <p className="text-lg font-medium text-gray-900 mb-6">
            {currentQuestion.question_text}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key
              const isCorrect = option.key === currentQuestion.correct_answer
              const showCorrectness = showResult

              let bgColor = 'bg-white hover:bg-gray-50'
              let borderColor = 'border-gray-200'
              let textColor = 'text-gray-900'

              if (showCorrectness) {
                if (isCorrect) {
                  bgColor = 'bg-green-50'
                  borderColor = 'border-green-500'
                  textColor = 'text-green-900'
                } else if (isSelected && !isCorrect) {
                  bgColor = 'bg-red-50'
                  borderColor = 'border-red-500'
                  textColor = 'text-red-900'
                }
              } else if (isSelected) {
                bgColor = 'bg-purple-50'
                borderColor = 'border-purple-500'
                textColor = 'text-purple-900'
              }

              return (
                <button
                  key={option.key}
                  onClick={() => handleSelectAnswer(option.key)}
                  disabled={showResult}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${bgColor} ${borderColor} ${textColor} ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                    showCorrectness && isCorrect ? 'bg-green-500 text-white' :
                    showCorrectness && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                    isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {showCorrectness && isCorrect ? <CheckCircle className="w-5 h-5" /> :
                     showCorrectness && isSelected && !isCorrect ? <XCircle className="w-5 h-5" /> :
                     option.key}
                  </span>
                  <span className="text-left flex-1">{option.value}</span>
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showResult && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
              <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          {!showResult ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
            >
              {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
