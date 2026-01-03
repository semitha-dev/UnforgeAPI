'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Zap, Building2, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface FormData {
  workspaceName: string
  companyName: string
  useCase: string
}

const useCases = [
  { id: 'chatbot', label: 'AI Chatbot / Assistant', icon: '🤖' },
  { id: 'rag', label: 'RAG Application', icon: '📚' },
  { id: 'search', label: 'Semantic Search', icon: '🔍' },
  { id: 'automation', label: 'Workflow Automation', icon: '⚡' },
  { id: 'other', label: 'Something Else', icon: '✨' },
]

export default function WorkspaceOnboardingPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    workspaceName: '',
    companyName: '',
    useCase: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }
      setUser(user)
      
      // Pre-fill workspace name from user's name
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      setFormData(prev => ({
        ...prev,
        workspaceName: `${userName}'s Workspace`
      }))
    }
    checkUser()
  }, [router, supabase])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  const handleSubmit = async () => {
    if (!formData.workspaceName.trim()) {
      setError('Please enter a workspace name')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create workspace
      const slug = generateSlug(formData.workspaceName) + '-' + Math.random().toString(36).substring(2, 7)
      
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: formData.workspaceName,
          slug: slug,
          owner_id: user.id,
          description: formData.useCase ? `Use case: ${formData.useCase}` : null,
          settings: {
            use_case: formData.useCase,
            company_name: formData.companyName
          }
        })
        .select()
        .single()

      if (workspaceError) throw workspaceError

      // Add user as workspace member (owner)
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner'
        })

      // Update user profile with default workspace and onboarding status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          default_workspace_id: workspace.id,
          onboarding_completed: true,
          company_name: formData.companyName || null,
          use_case: formData.useCase || null
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Generate first API key via Unkey
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const keyResponse = await fetch('/api/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
            name: 'Default Key',
            tier: 'sandbox'
          })
        })

        if (keyResponse.ok) {
          const keyResult = await keyResponse.json()
          // Store the API key temporarily in sessionStorage for the dashboard to display
          sessionStorage.setItem('new_api_key', keyResult.key)
        }
      }

      // Redirect to dashboard
      router.push(`/dashboard/${workspace.slug}`)
    } catch (err: any) {
      console.error('Error creating workspace:', err)
      setError(err.message || 'Failed to create workspace. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">UnforgeAPI</span>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-violet-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-3">Create Your Workspace</h1>
                <p className="text-gray-400">
                  A workspace is where you'll manage your API keys, view usage, and configure settings.
                </p>
              </div>

              {/* Workspace Name */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    value={formData.workspaceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, workspaceName: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                    placeholder="My AI Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name (Optional)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={() => {
                  if (!formData.workspaceName.trim()) {
                    setError('Please enter a workspace name')
                    return
                  }
                  setError('')
                  setStep(2)
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-3">What are you building?</h1>
                <p className="text-gray-400">
                  This helps us optimize your experience. You can change this later.
                </p>
              </div>

              {/* Use Case Selection */}
              <div className="grid grid-cols-1 gap-3">
                {useCases.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => setFormData(prev => ({ ...prev, useCase: useCase.id }))}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      formData.useCase === useCase.id
                        ? 'bg-violet-500/20 border-violet-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{useCase.icon}</span>
                    <span className="font-medium">{useCase.label}</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Create Workspace
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
