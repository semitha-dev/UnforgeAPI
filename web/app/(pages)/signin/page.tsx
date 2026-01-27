'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export default function SignInPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
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

    console.log('[Signin] ========== START ==========')
    console.log('[Signin] Email:', formData.email)

    if (!validateForm()) {
      console.log('[Signin] Form validation failed')
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      console.log('[Signin] Attempting signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      console.log('[Signin] Auth result:', {
        userId: data.user?.id,
        email: data.user?.email,
        hasSession: !!data.session,
        error: error?.message
      })

      if (error) {
        console.error('[Signin] Auth error:', error)
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Invalid email or password. Please check your credentials and try again.' })
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Please check your email and click the confirmation link before signing in.' })
        } else {
          setErrors({ general: error.message })
        }
        return
      }

      if (data.user && data.session) {
        try {
          console.log('[Signin] Fetching profile for user:', data.user.id)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          console.log('[Signin] Profile result:', {
            profile: profile ? { id: profile.id, workspace: profile.default_workspace_id, onboarded: profile.onboarding_completed } : null,
            error: profileError?.message,
            errorCode: profileError?.code
          })

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('[Signin] Profile check error:', profileError)
            setErrors({ general: 'An error occurred. Please try again.' })
            return
          }

          await new Promise(resolve => setTimeout(resolve, 100))

          if (!profile) {
            // Auto-create profile for existing auth user without profile
            const userName = data.user.user_metadata?.full_name
              || data.user.email?.split('@')[0]
              || 'User'

            console.log('[Signin] Creating profile for user without one:', {
              userId: data.user.id,
              userName,
              email: data.user.email
            })

            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                name: userName,
                education_level: 'other',
                subscription_tier: 'free',
                subscription_status: 'inactive',
                onboarding_completed: false
              })

            if (createError) {
              console.error('[Signin] Profile creation error:', createError)
            } else {
              console.log('[Signin] Profile created successfully')
            }

            console.log('[Signin] Redirecting to onboarding (no profile)')
            router.push('/onboarding/workspace')
          } else if (!profile.default_workspace_id) {
            console.log('[Signin] Redirecting to onboarding (no workspace)')
            router.push('/onboarding/workspace')
          } else {
            // Get workspace slug
            console.log('[Signin] Fetching workspace:', profile.default_workspace_id)
            const { data: workspace, error: wsError } = await supabase
              .from('workspaces')
              .select('slug')
              .eq('id', profile.default_workspace_id)
              .single()

            console.log('[Signin] Workspace result:', { workspace, error: wsError?.message })

            if (workspace) {
              console.log('[Signin] Redirecting to dashboard:', workspace.slug)
              router.push(`/dashboard/${workspace.slug}`)
            } else {
              console.log('[Signin] Redirecting to onboarding (no workspace found)')
              router.push('/onboarding/workspace')
            }
          }
        } catch (profileError) {
          console.error('[Signin] Profile check error:', profileError)
          setErrors({ general: 'An error occurred while checking your profile. Please try again.' })
        }
      }
    } catch (error: any) {
      console.error('[Signin] Unexpected error:', error)
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    console.log('========================================')
    console.log('[Signin] Google OAuth Flow Starting')
    console.log('========================================')

    console.log('[Signin] Step 1: Environment Check')
    console.log('[Signin] - process.env.NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    console.log('[Signin] - window.location.origin:', window.location.origin)
    console.log('[Signin] - window.location.href:', window.location.href)

    try {
      // Use environment variable for production, fallback to window.location.origin for local dev
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const redirectUrl = `${baseUrl}/auth/callback?next=/dashboard`

      console.log('[Signin] Step 2: Redirect URL Configuration')
      console.log('[Signin] - baseUrl:', baseUrl)
      console.log('[Signin] - Full redirectTo URL:', redirectUrl)

      console.log('[Signin] Step 3: Calling supabase.auth.signInWithOAuth...')
      console.log('[Signin] - Provider: google')
      console.log('[Signin] - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      console.log('[Signin] Step 4: OAuth Response Received')
      console.log('[Signin] - Data:', data)
      console.log('[Signin] - Error:', error)

      if (error) {
        console.error('[Signin] ❌ OAuth Error Details:')
        console.error('[Signin] - Error Message:', error.message)
        console.error('[Signin] - Error Name:', error.name)
        console.error('[Signin] - Error Status:', error.status)
        console.error('[Signin] - Full Error Object:', JSON.stringify(error, null, 2))
        setErrors({ general: `Google Sign-In Error: ${error.message}` })
      } else {
        console.log('[Signin] ✅ OAuth call successful, should redirect to Google now...')
        console.log('[Signin] - If you are still on this page, check:')
        console.log('[Signin]   1. Is Google provider enabled in Supabase Dashboard?')
        console.log('[Signin]   2. Are Client ID and Secret configured in Supabase?')
        console.log('[Signin]   3. Check Network tab for any failed requests')
      }
    } catch (error: any) {
      console.error('[Signin] ❌ Unexpected Error in Google OAuth')
      console.error('[Signin] - Error Message:', error.message)
      console.error('[Signin] - Error Stack:', error.stack)
      console.error('[Signin] - Full Error:', error)
      setErrors({ general: `Failed to sign in with Google: ${error.message || 'Unknown error'}` })
    }

    console.log('========================================')
    console.log('[Signin] Google OAuth Flow End')
    console.log('========================================')
  }

  return (
    <AuthLayout
      headline={
        <>
          Welcome back to <br />
          <span className="text-[#00A86B]">UnforgeAPI.</span>
        </>
      }
      subtitle="Sign in to access your dashboard and continue building amazing applications."
      features={[
        'AI-powered deep research',
        'Lightning fast API responses',
        'Comprehensive documentation',
      ]}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign in to your account</h2>
        <p className="text-slate-500">Enter your credentials to access your dashboard</p>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`block w-full rounded-lg border bg-white text-slate-900 py-3 px-4 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B] ${errors.email ? 'border-red-500' : 'border-slate-300'
              }`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              className={`block w-full rounded-lg border bg-white text-slate-900 py-3 px-4 pr-12 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B] ${errors.password ? 'border-red-500' : 'border-slate-300'
                }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#008f5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A86B] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-slate-500">Or continue with</span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
        <span className="text-slate-700 font-medium">Sign in with Google</span>
      </button>

      {/* Sign Up Link */}
      <p className="mt-8 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link href="/signup" className="text-[#00A86B] font-medium hover:text-[#008f5b] transition-colors">
          Sign Up
        </Link>
      </p>
    </AuthLayout>
  )
}
