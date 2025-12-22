'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

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
    <div className="min-h-screen flex">
      {/* Left Side - Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Email Icon */}
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#4A7C59]/10 mb-6">
            <Mail className="h-8 w-8 text-[#4A7C59]" />
          </div>

          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Check Your Email
          </h1>
          <p className="text-gray-600 mb-1">
            We've sent a verification link to
          </p>
          <p className="text-[#4A7C59] font-semibold mb-8">
            {maskEmail(userEmail)}
          </p>

          {/* Success/Error Message */}
          {resendMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              resendSuccess
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {resendSuccess ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${resendSuccess ? 'text-green-700' : 'text-red-600'}`}>
                {resendMessage}
              </p>
            </div>
          )}

          {/* Instructions Card */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              What's next?
            </h3>
            <ol className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-[#4A7C59] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  1
                </span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-[#4A7C59] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  2
                </span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-[#4A7C59] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 font-medium">
                  3
                </span>
                <span>You'll be automatically redirected to your dashboard</span>
              </li>
            </ol>
          </div>

          {/* Resend Email Button */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the email?
            </p>
            <button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[#4A7C59] text-sm font-medium rounded-full text-[#4A7C59] bg-white hover:bg-[#4A7C59]/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A7C59] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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

          {/* Tips Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 text-sm mb-1">
                  Email not arriving?
                </h4>
                <ul className="text-xs text-amber-700 space-y-1">
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
            className="inline-flex items-center text-sm text-gray-600 hover:text-[#4A7C59] transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Link>

          {/* Support Link */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Need help?{' '}
              <Link
                href="/support"
                className="text-[#4A7C59] font-medium hover:underline inline-flex items-center gap-1"
              >
                <HelpCircle className="h-4 w-4" />
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        {/* Glassy blur with gradient edges */}
        <div className="absolute inset-y-0 left-0 w-16 z-10" style={{
          background: 'linear-gradient(to right, white 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 80%, transparent 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, black 40%, transparent 100%)'
        }}></div>
        <Image
          src="/leaf3.jpg"
          alt="Leaf"
          fill
          className="object-cover object-right"
          priority
        />
      </div>
    </div>
  )
}