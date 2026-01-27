import { createClient } from '@/app/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('[Auth Callback] ========== START ==========')
  console.log('[Auth Callback] Code present:', !!code)
  console.log('[Auth Callback] Next:', next)
  console.log('[Auth Callback] Origin:', origin)

  if (code) {
    const supabase = await createClient()
    console.log('[Auth Callback] Exchanging code for session...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Session exchange error:', error)
    }
    
    if (!error) {
      console.log('[Auth Callback] Session exchange successful')
      
      // Check if user has a profile and workspace
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      console.log('[Auth Callback] User fetch result:', {
        userId: user?.id,
        email: user?.email,
        userError: userError?.message,
        metadata: user?.user_metadata
      })
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, default_workspace_id, onboarding_completed')
          .eq('id', user.id)
          .single()
        
        console.log('[Auth Callback] Profile fetch result:', {
          profile,
          profileError: profileError?.message,
          profileErrorCode: profileError?.code
        })
        
        // Auto-create profile if it doesn't exist
        if (!profile) {
          // Get name from Google metadata or email
          const userName = user.user_metadata?.full_name 
            || user.user_metadata?.name 
            || user.email?.split('@')[0] 
            || 'User'
          
          console.log('[Auth Callback] Creating profile for new user:', {
            userId: user.id,
            userName,
            email: user.email
          })
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              name: userName,
              education_level: 'other',
              subscription_tier: 'free',
              subscription_status: 'inactive',
              onboarding_completed: false
            })
          
          if (createError) {
            console.error('[Auth Callback] Profile creation error:', {
              code: createError.code,
              message: createError.message,
              details: createError.details,
              hint: createError.hint
            })
          } else {
            console.log('[Auth Callback] Profile created successfully')
          }
          
          // Redirect to workspace creation for new users
          console.log('[Auth Callback] Redirecting to onboarding (new user)')
          return NextResponse.redirect(`${origin}/onboarding/workspace`)
        }
        
        // Redirect to workspace creation if no workspace exists
        if (!profile.default_workspace_id || !profile.onboarding_completed) {
          console.log('[Auth Callback] Redirecting to onboarding (no workspace or incomplete)')
          return NextResponse.redirect(`${origin}/onboarding/workspace`)
        }

        // Redirect to dashboard (the dashboard page will handle workspace routing)
        if (next === '/dashboard' && profile.default_workspace_id) {
          console.log('[Auth Callback] Redirecting to dashboard')
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
      
      console.log('[Auth Callback] Redirecting to:', next)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  
  console.log('[Auth Callback] No code or error, redirecting to signin with error')

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
