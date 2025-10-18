// app/project/[id]/qa/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'

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

  const handleQuizCreated = () => {
    setShowCreateModal(false)
    loadQuizzes()
  }

  if (selectedQuiz) {
    return <QuizTaker quizId={selectedQuiz} onBack={() => setSelectedQuiz(null)} />
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quizzes</h1>
          <p className="text-gray-600">Create AI-generated quizzes from your study materials</p>
        </div>

        {/* Create Quiz Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="mb-8 w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create New Quiz</span>
        </button>

        {/* Quizzes Grid */}
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No quizzes yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first quiz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => setSelectedQuiz(quiz.id)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{quiz.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{quiz.question_count} questions</span>
                  <span className="text-indigo-600 font-medium">Start Quiz →</span>
                </div>
              </div>
            ))}
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
  onSuccess: () => void
}

function CreateQuizModal({ projectId, onClose, onSuccess }: CreateQuizModalProps) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [studyMaterial, setStudyMaterial] = useState('')
  const [questionCount, setQuestionCount] = useState<5 | 10>(5)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
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
      setStudyMaterial(note.content || '')
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

      onSuccess()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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

          {/* Select from Notes */}
          {notes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Or Select from Notes</label>
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
            </div>
          )}

          {/* Study Material */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Study Material *</label>
            <textarea
              value={studyMaterial}
              onChange={(e) => setStudyMaterial(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste or type your study material here..."
            />
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setQuestionCount(5)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  questionCount === 5
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                5 Questions
              </button>
              <button
                onClick={() => setQuestionCount(10)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  questionCount === 10
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                10 Questions
              </button>
            </div>
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{currentQ?.question_text}</h2>

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
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
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
                    <span className="flex-1">{optionText}</span>
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