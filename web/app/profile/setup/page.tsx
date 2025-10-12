'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient' // Adjust path as needed

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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User authentication error:', userError)
        router.push('/signin')
        return
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: userEmail,
          name: formData.name.trim(),
          education_level: formData.educationLevel
        })

      if (insertError) {
        console.error('Profile creation error:', insertError)
        if (insertError.code === '23505') {
          // Unique violation - profile already exists
          setErrors({ general: 'Profile already exists. Redirecting...' })
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          setErrors({ general: 'Failed to create profile. Please try again.' })
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                <svg
                  className="animate-spin h-8 w-8 text-indigo-600"
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
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Loading...
              </h2>
              <p className="text-gray-600 mt-2">
                Setting up your profile
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-600">
              Just a few more details to get started
            </p>
          </div>

          {/* Welcome Message */}
          <div className="bg-indigo-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">Welcome!</span> We need some basic information to personalize your experience.
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                {userEmail}
              </div>
              <p className="mt-1 text-xs text-gray-500">This cannot be changed</p>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
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
              <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Education Level *
              </label>
              <select
                id="educationLevel"
                name="educationLevel"
                value={formData.educationLevel}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
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

            {/* Privacy Notice */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-xs text-gray-600">
                    Your information is secure and will only be used to personalize your experience. 
                    You can update this information later in your profile settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Creating Profile...
                </>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>

          {/* Required Fields Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              * Required fields
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}