'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'

interface FormData {
  name: string
  email: string
  password: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  terms?: string
  general?: string
}

export default function SignUpPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name) {
      newErrors.name = 'Name is required'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms & policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('[Signup] ========== START ==========')
    console.log('[Signup] Name:', formData.name)
    console.log('[Signup] Email:', formData.email)

    if (!validateForm()) {
      console.log('[Signup] Form validation failed')
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      console.log('[Signup] Attempting signUp...')
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
      })

      console.log('[Signup] Auth result:', {
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
        error: error?.message
      })

      if (error) {
        console.error('[Signup] Auth error:', error)
        setErrors({ general: error.message })
        return
      }

      if (data.user) {
        // Auto-create profile with the name from signup form
        console.log('[Signup] Creating profile for new user:', {
          userId: data.user.id,
          name: formData.name,
          email: formData.email
        })

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            education_level: 'other',
            subscription_tier: 'free',
            subscription_status: 'inactive',
            onboarding_completed: false
          })

        if (profileError) {
          console.error('[Signup] Profile creation error:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          })
        } else {
          console.log('[Signup] Profile created successfully')
        }

        if (data.user.email_confirmed_at) {
          // Email already confirmed, go to workspace creation
          console.log('[Signup] Email confirmed, redirecting to onboarding')
          router.push('/onboarding/workspace')
        } else {
          // Need to verify email first
          console.log('[Signup] Email not confirmed, redirecting to verify-email')
          router.push('/auth/verify-email')
        }
      }
    } catch (error: any) {
      console.error('[Signup] Unexpected error:', error)
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    console.log('[Signup] Google OAuth starting...')
    try {
      // Use environment variable for production, fallback to window.location.origin for local dev
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/auth/callback?next=/onboarding/workspace`
        }
      })
      if (error) {
        setErrors({ general: error.message })
      }
    } catch (error: any) {
      setErrors({ general: 'Failed to sign in with Google' })
    }
  }

  return (
    <AuthLayout
      headline={
        <>
          Start building with <br />
          <span className="text-[#00A86B]">UnforgeAPI today.</span>
        </>
      }
      subtitle="Create your free account and start building powerful AI applications in minutes."
      features={[
        'Free tier with generous limits',
        'No credit card required',
        'Full API access from day one',
      ]}
      showSteps={true}
      currentStep={1}
      stepLabels={['Account', 'Workspace', 'Finish']}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create your account</h2>
        <p className="text-slate-500 dark:text-slate-400">Get started with UnforgeAPI for free</p>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`block w-full rounded-lg border bg-white dark:bg-[#111827] text-slate-900 dark:text-white py-3 px-4 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B] ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            placeholder="Enter your name"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`block w-full rounded-lg border bg-white dark:bg-[#111827] text-slate-900 dark:text-white py-3 px-4 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B] ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              className={`block w-full rounded-lg border bg-white dark:bg-[#111827] text-slate-900 dark:text-white py-3 px-4 pr-12 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B] ${errors.password ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked)
              if (errors.terms) {
                setErrors(prev => ({ ...prev, terms: undefined }))
              }
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#00A86B] focus:ring-[#00A86B]/50 bg-white dark:bg-[#111827]"
          />
          <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
            I am at least 18 years old and agree to the{' '}
            <Link href="/terms" className="text-[#00A86B] hover:text-[#008f5b] transition-colors">
              terms & policy
            </Link>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-red-500 -mt-2">{errors.terms}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#008f5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A86B] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-[#1F2937] text-slate-500">Or continue with</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-slate-700 dark:text-white font-medium">Sign up with Google</span>
      </button>

      {/* Sign In Link */}
      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link href="/signin" className="text-[#00A86B] font-medium hover:text-[#008f5b] transition-colors">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  )
}
