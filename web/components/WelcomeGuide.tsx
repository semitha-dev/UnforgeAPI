'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Sparkles, 
  Search, 
  BookOpen, 
  Zap,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  FileText,
  BarChart3,
  Clock,
  MessageSquare,
  Target
} from 'lucide-react'
import Image from 'next/image'

interface WelcomeGuideProps {
  isOpen: boolean
  onClose: () => void
  userName?: string
}

const WELCOME_GUIDE_KEY = 'leaf_welcome_guide_seen'

export function WelcomeGuide({ isOpen, onClose, userName }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    {
      id: 'welcome',
      title: `Welcome to Leaf${userName ? `, ${userName}` : ''}!`,
      subtitle: 'Your AI-Powered Learning Companion',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#13eca4]/20 to-[#7c3aed]/20 flex items-center justify-center">
              <Image 
                src="/new_logo.png" 
                alt="Leaf Logo" 
                width={64} 
                height={64}
                className="rounded-xl"
              />
            </div>
            <p className="text-[#9db9b0] text-base leading-relaxed max-w-md mx-auto">
              Leaf is an intelligent study platform that transforms how you learn. 
              Upload your notes, ask questions, and let our AI help you master any subject.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933]">
              <Search className="w-6 h-6 text-[#13eca4] mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Smart Search</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933]">
              <BookOpen className="w-6 h-6 text-[#13eca4] mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Study Tools</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933]">
              <BarChart3 className="w-6 h-6 text-[#13eca4] mx-auto mb-2" />
              <p className="text-white text-sm font-medium">AI Insights</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'atlas',
      title: 'Meet Atlas Intelligence™',
      subtitle: 'The Brain Behind Leaf',
      content: (
        <div className="space-y-6">
          <div className="relative">
            {/* Atlas visualization */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#13eca4] to-[#7c3aed] flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">Atlas</span>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h4 className="text-[#13eca4] font-bold text-lg mb-2">Atlas Intelligence System</h4>
              <p className="text-[#9db9b0] text-sm leading-relaxed max-w-md mx-auto">
                Atlas analyzes your learning patterns using cognitive science principles 
                to identify knowledge gaps and optimize your retention through the 
                Ebbinghaus Forgetting Curve formula.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#1c2723]/80 border border-[#283933]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#13eca4]" />
                  <span className="text-white text-sm font-medium">Context Gaps</span>
                </div>
                <p className="text-[#9db9b0] text-xs">Identifies missing connections between concepts in your notes</p>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2723]/80 border border-[#283933]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#7c3aed]" />
                  <span className="text-white text-sm font-medium">Study Rhythm</span>
                </div>
                <p className="text-[#9db9b0] text-xs">Tracks your learning patterns and optimal study times</p>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2723]/80 border border-[#283933]">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-[#f59e0b]" />
                  <span className="text-white text-sm font-medium">Untested Learning</span>
                </div>
                <p className="text-[#9db9b0] text-xs">Finds knowledge you haven't been quizzed on yet</p>
              </div>
              <div className="p-3 rounded-xl bg-[#1c2723]/80 border border-[#283933]">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#13eca4]" />
                  <span className="text-white text-sm font-medium">Forgetting Curve</span>
                </div>
                <p className="text-[#9db9b0] text-xs">R = e^(-t/S) formula predicts when you'll forget material</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'What You Can Do',
      subtitle: 'Powerful Features at Your Fingertips',
      content: (
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933] hover:border-[#13eca4]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#13eca4]/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-[#13eca4]" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">LeafAI Chat</h4>
              <p className="text-[#9db9b0] text-sm">Ask anything - get instant, accurate answers with citations from the web</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933] hover:border-[#13eca4]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#7c3aed]" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Smart Notes</h4>
              <p className="text-[#9db9b0] text-sm">Create spaces, upload PDFs, and organize your study materials</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933] hover:border-[#13eca4]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Flashcards & Quizzes</h4>
              <p className="text-[#9db9b0] text-sm">Auto-generate study materials from your notes with one click</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-[#1c2723]/50 border border-[#283933] hover:border-[#13eca4]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#ec4899]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#ec4899]" />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-1">Daily Insights</h4>
              <p className="text-[#9db9b0] text-sm">Get AI-powered analysis of your learning progress and personalized tips</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'getStarted',
      title: "Let's Get Started! 🎉",
      subtitle: 'You\'re Ready to Learn Smarter',
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#13eca4] to-[#7c3aed] flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <p className="text-[#9db9b0] text-base leading-relaxed max-w-md mx-auto mb-6">
              You're all set! Start by asking a question in the chat below, or create 
              a new space to organize your study materials.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#13eca4]/10 to-[#7c3aed]/10 border border-[#13eca4]/30">
              <p className="text-white font-medium mb-2">💡 Quick Tip</p>
              <p className="text-[#9db9b0] text-sm">
                Try asking LeafAI: <span className="text-[#13eca4] italic">"Explain photosynthesis"</span> or 
                <span className="text-[#13eca4] italic">"Help me understand quantum physics"</span>
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[#9db9b0] text-sm">
              <Clock className="w-4 h-4" />
              <span>Free users get 3 research queries per day</span>
            </div>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    // Mark as seen in localStorage
    localStorage.setItem(WELCOME_GUIDE_KEY, 'true')
    onClose()
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!isOpen) return null

  const currentStepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#111816] border border-[#283933] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-[#9db9b0] hover:text-white hover:bg-[#283933] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold mb-1">{currentStepData.title}</h2>
            <p className="text-[#9db9b0] text-sm">{currentStepData.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#283933] flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? 'bg-[#13eca4] w-6' 
                    : index < currentStep
                      ? 'bg-[#13eca4]/50'
                      : 'bg-[#283933]'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-[#9db9b0] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#13eca4] text-[#111816] rounded-xl font-semibold hover:bg-[#0ebf84] transition-colors"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to check if user should see the welcome guide
export function useWelcomeGuide() {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Check if user has seen the welcome guide
    const hasSeenGuide = localStorage.getItem(WELCOME_GUIDE_KEY)
    if (!hasSeenGuide) {
      // Small delay so the page loads first
      const timer = setTimeout(() => {
        setShowWelcome(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const closeWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem(WELCOME_GUIDE_KEY, 'true')
  }

  const resetWelcome = () => {
    localStorage.removeItem(WELCOME_GUIDE_KEY)
    setShowWelcome(true)
  }

  return { showWelcome, closeWelcome, resetWelcome }
}
