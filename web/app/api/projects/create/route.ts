import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabaseServer'
import { getUserSubscription, isPro, LIMITS } from '@/lib/subscription'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Check space limit for free users
    const subscription = await getUserSubscription(user.id)
    const isUserPro = isPro(subscription)
    const limit = isUserPro ? LIMITS.pro.spaces : LIMITS.free.spaces

    console.log('[Create Project] User:', user.id)
    console.log('[Create Project] Subscription:', subscription.subscription_tier, subscription.subscription_status)
    console.log('[Create Project] isPro:', isUserPro)
    console.log('[Create Project] Space limit:', limit)

    // Count existing projects
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting projects:', countError)
      return NextResponse.json(
        { error: 'Failed to check space limit' },
        { status: 500 }
      )
    }

    console.log('[Create Project] Current count:', count, 'Limit:', limit)

    if (count !== null && count >= limit) {
      console.log('[Create Project] BLOCKED - limit reached')
      return NextResponse.json(
        { error: `Space limit reached (${count}/${limit}). Upgrade to Pro for unlimited spaces.`, limit, count },
        { status: 403 }
      )
    }

    // Create the project
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || '',
        color: color || '#6366f1',
        icon: icon || 'book'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
