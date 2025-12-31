'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, Sparkles } from 'lucide-react'

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendSuccess, setResendSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [countdown, setCountdown] = useState(0)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get user email from session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()

    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        router.push('/overview')
      }
    }
    checkVerification()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        router.push('/overview')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (countdown > 0) return

    setIsResending(true)
    setResendMessage('')
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      })

      if (error) {
        setResendMessage('Failed to resend email. Please try again.')
        setResendSuccess(false)
      } else {
        setResendMessage('Verification email sent! Check your inbox.')
        setResendSuccess(true)
        setCountdown(60) // 60 second cooldown
      }
    } catch (error) {
      setResendMessage('An error occurred. Please try again.')
      setResendSuccess(false)
    } finally {
      setIsResending(false)
    }
  }

  const maskEmail = (email: string) => {
    if (!email) return ''
    const [localPart, domain] = email.split('@')
    if (localPart.length <= 2) return email
    const maskedLocal = localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.slice(-1)
    return `${maskedLocal}@${domain}`
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">leaflearning</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
          {/* Email Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-6 mx-auto">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Check Your Email
            </h1>
            <p className="text-neutral-400 mb-1">
              We've sent a verification link to
            </p>
            <p className="text-emerald-400 font-semibold">
              {maskEmail(userEmail)}
            </p>
          </div>

          {/* Success/Error Message */}
          {resendMessage && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              resendSuccess
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {resendSuccess ? (
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${resendSuccess ? 'text-emerald-300' : 'text-red-300'}`}>
                {resendMessage}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-neutral-800/50 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-white mb-4">
              What's next?
            </h3>
            <ol className="text-sm text-neutral-400 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  1
                </span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  2
                </span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  3
                </span>
                <span>You'll be automatically redirected</span>
              </li>
            </ol>
          </div>

          {/* Resend Email Button */}
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-3">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 border border-neutral-700 text-sm font-medium rounded-xl text-white bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resend Email
                </>
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-300 text-sm mb-1">
                  Email not arriving?
                </h4>
                <ul className="text-xs text-amber-200/70 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Add our email to your contacts</li>
                  <li>• Wait a few minutes for delivery</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Back to Sign In */}
          <Link
            href="/signin"
            className="inline-flex items-center text-sm text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Link>
        </div>

        {/* Support Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">
            Need help?{' '}
            <Link
              href="/support"
              className="text-emerald-400 font-medium hover:text-emerald-300 inline-flex items-center gap-1"
            >
              <HelpCircle className="h-4 w-4" />
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}