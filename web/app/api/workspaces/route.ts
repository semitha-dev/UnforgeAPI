/**
 * Workspace Management API
 * 
 * Allows users to create and manage multiple workspaces
 * Each workspace can have its own API keys and usage tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [Workspaces:${tag}]`, JSON.stringify(data, null, 2))
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to get user from session
async function getUserFromSession() {
  const cookieStore = await cookies()
  const supabaseCookies = cookieStore.getAll()
  const authCookie = supabaseCookies.find(c => c.name.includes('auth-token'))
  
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value)
      if (parsed?.access_token) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(parsed.access_token)
        return user
      }
    } catch (e) {
      // Continue
    }
  }
  
  const accessToken = cookieStore.get('sb-access-token')?.value
  if (accessToken) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
    return user
  }
  
  return null
}

// Generate a URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * GET /api/workspaces - List user's workspaces
 */
export async function GET(request: NextRequest) {
  debug('GET:start', { timestamp: new Date().toISOString() })
  
  try {
    const user = await getUserFromSession()
    
    if (!user) {
      debug('GET:auth:fail', { reason: 'No user session' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    debug('GET:user', { userId: user.id })
    
    // Get workspaces where user is owner or member
    const { data: ownedWorkspaces, error: ownedError } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    
    if (ownedError) {
      debug('GET:error', { error: ownedError.message })
      throw ownedError
    }
    
    // Get workspaces where user is a member (not owner)
    const { data: memberWorkspaces, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select(`
        workspace:workspaces (*)
      `)
      .eq('user_id', user.id)
    
    if (memberError) {
      debug('GET:memberError', { error: memberError.message })
    }
    
    // Combine and deduplicate
    const memberWs = memberWorkspaces?.map(m => m.workspace).filter(Boolean) || []
    const allWorkspaces = [...(ownedWorkspaces || []), ...memberWs]
    
    // Get current default workspace from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single()
    
    debug('GET:success', { 
      workspaceCount: allWorkspaces.length,
      defaultWorkspaceId: profile?.default_workspace_id 
    })
    
    return NextResponse.json({
      workspaces: allWorkspaces,
      defaultWorkspaceId: profile?.default_workspace_id
    })
    
  } catch (error: any) {
    debug('GET:error', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/workspaces - Create a new workspace
 */
export async function POST(request: NextRequest) {
  debug('POST:start', { timestamp: new Date().toISOString() })
  
  try {
    const user = await getUserFromSession()
    
    if (!user) {
      debug('POST:auth:fail', { reason: 'No user session' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, description } = body
    
    debug('POST:body', { name, description, userId: user.id })
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
    }
    
    if (name.length > 100) {
      return NextResponse.json({ error: 'Workspace name too long (max 100 characters)' }, { status: 400 })
    }
    
    // Check workspace limit (max 5 per user on free plan)
    const { count: existingCount } = await supabaseAdmin
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    
    const MAX_WORKSPACES = 10 // Can be adjusted based on plan
    if (existingCount && existingCount >= MAX_WORKSPACES) {
      debug('POST:limit', { existingCount, max: MAX_WORKSPACES })
      return NextResponse.json({ 
        error: `Maximum ${MAX_WORKSPACES} workspaces allowed per account` 
      }, { status: 400 })
    }
    
    // Generate unique slug
    let baseSlug = generateSlug(name)
    let slug = baseSlug
    let counter = 1
    
    // Check for slug uniqueness
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .single()
      
      if (!existing) break
      slug = `${baseSlug}-${counter}`
      counter++
      
      if (counter > 100) {
        slug = `${baseSlug}-${Date.now()}`
        break
      }
    }
    
    debug('POST:creating', { name, slug, ownerId: user.id })
    
    // Create workspace
    const { data: workspace, error: createError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: name.trim(),
        slug,
        owner_id: user.id,
        description: description?.trim() || null,
        settings: {}
      })
      .select()
      .single()
    
    if (createError) {
      debug('POST:createError', { error: createError.message })
      throw createError
    }
    
    debug('POST:success', { workspaceId: workspace.id, slug: workspace.slug })
    
    return NextResponse.json({
      workspace,
      message: 'Workspace created successfully'
    })
    
  } catch (error: any) {
    debug('POST:error', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/workspaces - Update workspace or set default
 */
export async function PATCH(request: NextRequest) {
  debug('PATCH:start', { timestamp: new Date().toISOString() })
  
  try {
    const user = await getUserFromSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { workspaceId, setDefault, name, description } = body
    
    debug('PATCH:body', { workspaceId, setDefault, name, description })
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }
    
    // If setting default workspace
    if (setDefault) {
      // Verify user has access to this workspace
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('id, owner_id')
        .eq('id', workspaceId)
        .single()
      
      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
      
      // Check if owner or member
      if (workspace.owner_id !== user.id) {
        const { data: membership } = await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single()
        
        if (!membership) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
      
      // Update user's default workspace
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ default_workspace_id: workspaceId })
        .eq('id', user.id)
      
      if (updateError) {
        debug('PATCH:updateError', { error: updateError.message })
        throw updateError
      }
      
      debug('PATCH:setDefault:success', { workspaceId })
      return NextResponse.json({ success: true, message: 'Default workspace updated' })
    }
    
    // Update workspace details
    if (name || description !== undefined) {
      // Verify ownership
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single()
      
      if (!workspace || workspace.owner_id !== user.id) {
        return NextResponse.json({ error: 'Only workspace owner can update details' }, { status: 403 })
      }
      
      const updateData: any = { updated_at: new Date().toISOString() }
      if (name) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      
      const { error: updateError } = await supabaseAdmin
        .from('workspaces')
        .update(updateData)
        .eq('id', workspaceId)
      
      if (updateError) throw updateError
      
      debug('PATCH:update:success', { workspaceId })
      return NextResponse.json({ success: true, message: 'Workspace updated' })
    }
    
    return NextResponse.json({ error: 'No update action specified' }, { status: 400 })
    
  } catch (error: any) {
    debug('PATCH:error', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workspaces - Delete a workspace
 */
export async function DELETE(request: NextRequest) {
  debug('DELETE:start', { timestamp: new Date().toISOString() })
  
  try {
    const user = await getUserFromSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('id')
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }
    
    // Verify ownership
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }
    
    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only workspace owner can delete' }, { status: 403 })
    }
    
    // Check if this is the user's only workspace
    const { count } = await supabaseAdmin
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    
    if (count && count <= 1) {
      return NextResponse.json({ error: 'Cannot delete your only workspace' }, { status: 400 })
    }
    
    // Get user's default workspace
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single()
    
    // Delete workspace (cascades to api_keys, usage_logs, etc.)
    const { error: deleteError } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
    
    if (deleteError) {
      debug('DELETE:error', { error: deleteError.message })
      throw deleteError
    }
    
    // If this was the default workspace, set a new default
    if (profile?.default_workspace_id === workspaceId) {
      const { data: newDefault } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single()
      
      if (newDefault) {
        await supabaseAdmin
          .from('profiles')
          .update({ default_workspace_id: newDefault.id })
          .eq('id', user.id)
      }
    }
    
    debug('DELETE:success', { workspaceId })
    return NextResponse.json({ success: true, message: 'Workspace deleted' })
    
  } catch (error: any) {
    debug('DELETE:error', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
