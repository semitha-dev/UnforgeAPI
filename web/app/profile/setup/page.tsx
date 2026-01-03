'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import { User, GraduationCap, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface FormData {
  name: string
  educationLevel: string
}

interface FormErrors {
  name?: string
  educationLevel?: string
  general?: string
}

const educationLevels = [
  { value: '', label: 'Select your education level' },
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor\'s Degree' },
  { value: 'master', label: 'Master\'s Degree' },
  { value: 'doctorate', label: 'Doctorate/PhD' },
  { value: 'other', label: 'Other' }
]

export default function ProfileSetupPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    educationLevel: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error('User authentication error:', userError)
          router.push('/signin')
          return
        }

        setUserEmail(user.email || '')

        // Check if user already has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new users
          console.error('Profile fetch error:', profileError)
          setErrors({ general: 'Failed to load user data. Please try again.' })
          return
        }

        if (profile) {
          // User already has a profile, redirect to overview
          router.push('/overview')
          return
        }
      } catch (error) {
        console.error('Initialization error:', error)
        setErrors({ general: 'An error occurred while loading. Please refresh the page.' })
      } finally {
        setIsInitializing(false)
      }
    }

    initializeUser()
  }, [supabase, router])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long'
    }

    // Education level validation
    if (!formData.educationLevel) {
      newErrors.educationLevel = 'Please select your education level'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing/selecting
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        router.push('/signin')
        return
      }

      // Call server-side API to create profile
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: userEmail,
          education_level: formData.educationLevel
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Profile already exists
          setErrors({ general: 'Profile already exists. Redirecting...' })
          setTimeout(() => router.push('/overview'), 1500)
        } else {
          setErrors({ general: data.error || 'Failed to create profile. Please try again.' })
        }
        return
      }

      // Success! Redirect to overview
      router.push('/overview')
    } catch (error: any) {
      console.error('Unexpected error:', error)
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto" />
          <p className="mt-4 text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">UnforgeAPI</span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 mb-6 mx-auto">
              <User className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Complete Your Profile
            </h1>
            <p className="text-neutral-400">
              Just a few more details to personalize your experience
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Email address
              </label>
              <div className="w-full px-4 py-3 text-neutral-500 bg-neutral-800/50 border border-neutral-700 rounded-xl">
                {userEmail}
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">This cannot be changed</p>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-neutral-500" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-11 pr-4 py-3 bg-neutral-800 text-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-neutral-500 ${
                    errors.name ? 'border-red-500' : 'border-neutral-700'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Education Level Field */}
            <div>
              <label htmlFor="educationLevel" className="block text-sm font-medium text-neutral-300 mb-2">
                Education level
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <GraduationCap className="h-4 w-4 text-neutral-500" />
                </div>
                <select
                  id="educationLevel"
                  name="educationLevel"
                  value={formData.educationLevel}
                  onChange={handleInputChange}
                  className={`w-full pl-11 pr-4 py-3 bg-neutral-800 text-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer ${
                    errors.educationLevel ? 'border-red-500' : 'border-neutral-700'
                  } ${!formData.educationLevel ? 'text-neutral-500' : ''}`}
                >
                  {educationLevels.map((level) => (
                    <option key={level.value} value={level.value} className="bg-neutral-800 text-white">
                      {level.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {errors.educationLevel && (
                <p className="mt-1.5 text-sm text-red-400">{errors.educationLevel}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          {/* Welcome note */}
          <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-violet-300">Almost there!</p>
                <p className="text-xs text-violet-400/70 mt-0.5">Complete your profile to access your dashboard.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500">
            Need help?{' '}
            <Link
              href="/support"
              className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
            >
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}