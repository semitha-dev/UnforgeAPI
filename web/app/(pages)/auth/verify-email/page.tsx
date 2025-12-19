'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [countdown, setCountdown] = useState(0)

  const router = useRouter()
  const supabase = createClientComponentClient()

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
        router.push('/dashboard')
      }
    }
    checkVerification()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        router.push('/dashboard')
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

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      })

      if (error) {
        setResendMessage('Failed to resend email. Please try again.')
      } else {
        setResendMessage('Verification email sent! Check your inbox.')
        setCountdown(60) // 60 second cooldown
      }
    } catch (error) {
      setResendMessage('An error occurred. Please try again.')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          {/* Email Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
            <svg
              className="h-8 w-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 text-lg">
              We've sent a verification link to
            </p>
            <p className="text-indigo-600 font-semibold mt-2">
              {maskEmail(userEmail)}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              What's next?
            </h3>
            <ol className="text-sm text-gray-600 text-left space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                  1
                </span>
                Check your email inbox (and spam folder)
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                  2
                </span>
                Click the verification link in the email
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5">
                  3
                </span>
                You'll be automatically redirected to your dashboard
              </li>
            </ol>
          </div>

          {/* Resend Email Section */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="inline-flex items-center px-4 py-2 border border-indigo-600 text-sm font-medium rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isResending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                'Resend Email'
              )}
            </button>
          </div>

          {/* Resend Message */}
          {resendMessage && (
            <div className={`mb-6 p-3 rounded-lg text-sm ${
              resendMessage.includes('Failed') || resendMessage.includes('error')
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}>
              {resendMessage}
            </div>
          )}

          {/* Helpful Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-left">
                <h4 className="font-medium text-amber-800 text-sm">
                  Email not arriving?
                </h4>
                <ul className="mt-1 text-xs text-amber-700 space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Add our email to your contacts</li>
                  <li>• Wait a few minutes for delivery</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 transition-colors duration-200"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Sign In
            </Link>
            
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500">
                Need help?{' '}
                <Link
                  href="/support"
                  className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}