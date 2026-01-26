'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import { Loader2, Rocket } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'

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
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#111827] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A86B]" />
      </div>
    )
  }

  return (
    <AuthLayout
      headline={
        <>
          Almost there! <br />
          <span className="text-[#00A86B]">Set up your workspace.</span>
        </>
      }
      subtitle="Create your workspace to organize your API keys, projects, and team collaborations all in one place."
      features={[
        'Organize multiple projects',
        'Invite team members',
        'Centralized API management',
      ]}
      showSteps={true}
      currentStep={2}
      stepLabels={['Account', 'Workspace', 'Finish']}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create your workspace</h2>
        <p className="text-slate-500 dark:text-slate-400">Let's give your new digital headquarters a name.</p>
      </div>

      <div className="space-y-6">
        {/* Workspace Name Field */}
        <div className="space-y-2">
          <label htmlFor="workspace_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Workspace Name
          </label>
          <div className="relative">
            <input
              id="workspace_name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#111827] text-slate-900 dark:text-white py-3 px-4 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 focus:border-[#00A86B]"
              placeholder="e.g. Acme Corp Engineering"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            This will be the name displayed to your team members.
          </p>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={createWorkspace}
          disabled={isCreating || !workspaceName.trim()}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#008f5b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A86B] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Create Workspace
            </>
          )}
        </button>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          You can rename your workspace later in settings.
        </p>
      </div>
    </AuthLayout>
  )
}
