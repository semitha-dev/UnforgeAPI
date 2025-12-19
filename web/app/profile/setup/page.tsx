'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'

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
          // User already has a profile, redirect to dashboard
          router.push('/dashboard')
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

      // Call server-side API to create profile and token transaction
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
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          setErrors({ general: data.error || 'Failed to create profile. Please try again.' })
        }
        return
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A7C59] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 mb-8">
            Just a few more details to personalize your experience
          </p>

          {/* General Error */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="w-full px-4 py-2.5 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                {userEmail}
              </div>
              <p className="mt-1 text-xs text-gray-400">This cannot be changed</p>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 text-gray-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4A7C59] focus:border-[#4A7C59] ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Education Level Field */}
            <div>
              <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-1.5">
                Education level
              </label>
              <select
                id="educationLevel"
                name="educationLevel"
                value={formData.educationLevel}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 text-gray-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4A7C59] focus:border-[#4A7C59] bg-white ${
                  errors.educationLevel ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {educationLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {errors.educationLevel && (
                <p className="mt-1 text-sm text-red-600">{errors.educationLevel}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-full text-white bg-[#4A7C59] hover:bg-[#3d6649] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A7C59] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          {/* Welcome bonus note */}
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">Welcome bonus!</p>
                <p className="text-xs text-emerald-600 mt-0.5">You'll receive 500 free tokens to get started with LeafLearning.</p>
              </div>
            </div>
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