'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loader2, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'

export default function OnboardingWorkspacePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('My Workspace')
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/signin')
          return
        }

        // Check if user already has a workspace
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_workspace_id, onboarding_completed, full_name')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed && profile?.default_workspace_id) {
          router.push('/dashboard')
          return
        }

        // Pre-fill workspace name with user's name if available
        if (profile?.full_name) {
          setWorkspaceName(`${profile.full_name}'s Workspace`)
        } else if (user.email) {
          const emailName = user.email.split('@')[0]
          setWorkspaceName(`${emailName}'s Workspace`)
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Error checking user:', err)
        setError('Failed to load user data')
        setIsLoading(false)
      }
    }

    checkUser()
  }, [supabase, router])

  const createWorkspace = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[Onboarding] User:', user?.id, user?.email)
      
      if (!user) {
        router.push('/signin')
        return
      }

      // First, ensure profile exists (foreign key requirement)
      console.log('[Onboarding] Ensuring profile exists...')
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        console.log('[Onboarding] Creating profile...')
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            education_level: 'other',
            subscription_tier: 'free',
            subscription_status: 'inactive'
          })

        if (profileCreateError) {
          console.error('[Onboarding] Profile creation error:', profileCreateError)
          if (profileCreateError.code !== '23505') {
            throw new Error(`Failed to create profile: ${profileCreateError.message}`)
          }
        }
      }

      // Check if user already has a workspace
      console.log('[Onboarding] Checking for existing workspace...')
      const { data: existingWorkspace, error: existingError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      console.log('[Onboarding] Existing workspace check:', { existingWorkspace, existingError })

      let workspaceId = existingWorkspace?.id

      if (!workspaceId) {
        const slug = workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 30) || 'workspace'
        const uniqueSlug = `${slug}-${user.id.substring(0, 8)}`

        console.log('[Onboarding] Creating workspace with slug:', uniqueSlug)

        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            name: workspaceName,
            slug: uniqueSlug,
            owner_id: user.id,
            settings: {}
          })
          .select()
          .single()

        console.log('[Onboarding] Workspace creation result:', { workspace, workspaceError })

        if (workspaceError) {
          console.error('[Onboarding] Workspace creation error:', workspaceError)
          
          if (workspaceError.code === '23505' || workspaceError.code === '409') {
            const { data: existing } = await supabase
              .from('workspaces')
              .select('id')
              .eq('owner_id', user.id)
              .single()
            workspaceId = existing?.id
          }
          
          if (!workspaceId) {
            throw new Error(`Failed to create workspace: ${workspaceError.message}`)
          }
        } else {
          workspaceId = workspace.id
        }
      }

      console.log('[Onboarding] Using workspace ID:', workspaceId)

      // Update profile with workspace ID and mark onboarding as completed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          default_workspace_id: workspaceId,
          onboarding_completed: true
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('[Onboarding] Profile update error:', profileError)
        throw new Error(`Failed to update profile: ${profileError.message}`)
      }

      console.log('[Onboarding] Success! Redirecting to dashboard...')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('[Onboarding] Error:', err)
      setError(err.message || 'Failed to create workspace')
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to UnforgeAPI
          </h1>
          <p className="text-neutral-400">
            Let's set up your workspace to get started
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="My Workspace"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={createWorkspace}
            disabled={isCreating || !workspaceName.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Continue
              </>
            )}
          </button>
        </div>

        <p className="text-center text-neutral-500 text-sm mt-6">
          You can rename your workspace later in settings
        </p>
      </motion.div>
    </div>
  )
}
