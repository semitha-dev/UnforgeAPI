import { createClient } from '@/app/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has a profile and workspace
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, default_workspace_id, onboarding_completed')
          .eq('id', user.id)
          .single()
        
        // Redirect to workspace creation if no profile or workspace exists
        if (!profile || !profile.default_workspace_id || !profile.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding/workspace`)
        }

        // Get workspace slug for redirect
        if (next === '/dashboard' && profile.default_workspace_id) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('slug')
            .eq('id', profile.default_workspace_id)
            .single()
          
          if (workspace) {
            return NextResponse.redirect(`${origin}/dashboard/${workspace.slug}`)
          }
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
