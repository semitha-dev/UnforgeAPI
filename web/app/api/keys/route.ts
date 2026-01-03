/**
 * API Key Management Endpoint
 * Uses Unkey HTTP API for key creation/deletion
 * Database tracks key metadata for dashboard display
 * 
 * 4-Tier Pricing Structure:
 * - sandbox: 50/day (Managed, Search disabled)
 * - managed_pro: 1000/month (Managed, Search enabled)
 * - byok_starter: 100/day (BYOK, Search enabled, requires user keys)
 * - byok_pro: 10/sec rate limit (BYOK, Unlimited, requires user keys)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development'
function debug(tag: string, data: any) {
  if (DEBUG) {
    console.log(`[API/keys:${tag}]`, JSON.stringify(data, null, 2))
  }
}

// Hash function for key storage
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UNKEY_API_URL = 'https://api.unkey.dev'

// Valid plan types
type ApiPlan = 'sandbox' | 'managed_pro' | 'byok_starter' | 'byok_pro';

// Rate limit configuration based on plan
function getRateLimitConfig(plan: ApiPlan) {
  switch (plan) {
    case 'sandbox':
      // 50 requests per day
      return { type: 'fast' as const, limit: 50, duration: 86400000 };
    case 'managed_pro':
      // 1000 search requests per month
      return { type: 'fast' as const, limit: 1000, duration: 2592000000 };
    case 'byok_starter':
      // 100 requests per day
      return { type: 'fast' as const, limit: 100, duration: 86400000 };
    case 'byok_pro':
      // 10 requests per second (speed limit only)
      return { type: 'fast' as const, limit: 10, duration: 1000 };
    default:
      // Default to sandbox limits
      return { type: 'fast' as const, limit: 50, duration: 86400000 };
  }
}

// Helper to get user from session cookie
async function getUserFromSession() {
  debug('getUserFromSession:start', {})
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value
  
  debug('getUserFromSession:cookies', { 
    hasAccessToken: !!accessToken, 
    hasRefreshToken: !!refreshToken 
  })

  if (!accessToken) {
    // Try to get from Supabase auth cookie format
    const supabaseCookies = cookieStore.getAll()
    const authCookie = supabaseCookies.find(c => c.name.includes('auth-token'))
    debug('getUserFromSession:authCookie', { found: !!authCookie })
    
    if (authCookie) {
      try {
        const parsed = JSON.parse(authCookie.value)
        if (parsed?.access_token) {
          const { data: { user } } = await supabaseAdmin.auth.getUser(parsed.access_token)
          debug('getUserFromSession:fromAuthCookie', { userId: user?.id })
          return user
        }
      } catch (e) {
        debug('getUserFromSession:parseError', { error: (e as Error).message })
        // Continue to other methods
      }
    }
  }

  // Try direct token
  if (accessToken) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
    debug('getUserFromSession:fromAccessToken', { userId: user?.id })
    return user
  }

  debug('getUserFromSession:noUser', {})
  return null
}

// Create a new API key
export async function POST(request: NextRequest) {
  debug('POST:start', { timestamp: new Date().toISOString() })
  
  try {
    const body = await request.json()
    const { name, tier = 'sandbox', workspaceId } = body
    
    // Validate tier
    const validTiers: ApiPlan[] = ['sandbox', 'managed_pro', 'byok_starter', 'byok_pro']
    const plan: ApiPlan = validTiers.includes(tier) ? tier : 'sandbox'
    
    debug('POST:body', { name, tier, plan, workspaceId })

    if (!workspaceId || !name) {
      debug('POST:validation:fail', { missingWorkspaceId: !workspaceId, missingName: !name })
      return NextResponse.json(
        { error: 'workspaceId and name are required' }, 
        { status: 400 }
      )
    }

    // Get rate limit configuration based on plan
    const limitConfig = getRateLimitConfig(plan)
    
    debug('POST:ratelimits', { plan, limitConfig })

    // Create key via Unkey HTTP API
    debug('POST:unkey:creating', { apiId: process.env.UNKEY_API_ID })
    const unkeyResponse = await fetch(`${UNKEY_API_URL}/v1/keys.createKey`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UNKEY_ROOT_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiId: process.env.UNKEY_API_ID,
        prefix: 'uf',
        name,
        meta: {
          workspaceId: workspaceId,
          plan, // Use 'plan' instead of 'tier' for clarity
          tier: plan, // Keep 'tier' for backward compatibility
          searchEnabled: plan !== 'sandbox', // Search disabled only for sandbox
          requiresUserKeys: plan === 'byok_starter' || plan === 'byok_pro'
        },
        ratelimit: limitConfig,
        enabled: true
      })
    })

    const unkeyResult = await unkeyResponse.json()
    debug('POST:unkey:response', { ok: unkeyResponse.ok, keyId: unkeyResult.keyId })

    if (!unkeyResponse.ok) {
      console.error('[API/keys:POST:unkey:ERROR]', unkeyResult)
      return NextResponse.json(
        { error: 'Failed to create API key' }, 
        { status: 500 }
      )
    }

    // Store reference in our database for dashboard display
    debug('POST:supabase:inserting', { keyId: unkeyResult.keyId, workspaceId })
    
    const { data: insertedKey, error: insertError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        workspace_id: workspaceId,
        name,
        key_prefix: unkeyResult.key.substring(0, 10),
        key_hash: hashKey(unkeyResult.key), // Hash the full key for verification
        tier: plan, // Store the plan as tier for backward compatibility
        is_active: true,
        unkey_id: unkeyResult.keyId,
        metadata: {
          plan,
          searchEnabled: plan !== 'sandbox',
          requiresUserKeys: plan === 'byok_starter' || plan === 'byok_pro'
        }
      })
      .select()
      .single()
    
    if (insertError) {
      debug('POST:supabase:error', { 
        error: insertError.message, 
        code: insertError.code,
        details: insertError.details
      })
      // Key was created in Unkey but failed to save to our DB
      // We should still return the key but warn
      console.error('[API/keys:POST:supabase:ERROR]', insertError)
      return NextResponse.json({
        key: unkeyResult.key,
        keyId: unkeyResult.keyId,
        warning: 'Key created but failed to save to database. Please contact support.',
        message: 'API key created. Save this key - it will not be shown again.'
      })
    }
    
    debug('POST:supabase:success', { dbKeyId: insertedKey?.id })
    debug('POST:success', { keyId: unkeyResult.keyId })

    return NextResponse.json({
      key: unkeyResult.key,
      keyId: unkeyResult.keyId,
      message: 'API key created. Save this key - it will not be shown again.'
    })

  } catch (error: any) {
    console.error('[API/keys:POST:ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Delete/revoke an API key
export async function DELETE(request: NextRequest) {
  debug('DELETE:start', { timestamp: new Date().toISOString() })
  
  try {
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    
    debug('DELETE:params', { keyId })

    if (!keyId) {
      debug('DELETE:validation:fail', { reason: 'missing id' })
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Revoke in Unkey via HTTP API
    debug('DELETE:unkey:revoking', { keyId })
    const unkeyResponse = await fetch(`${UNKEY_API_URL}/v1/keys.deleteKey`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.UNKEY_ROOT_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyId })
    })
    
    debug('DELETE:unkey:response', { ok: unkeyResponse.ok })

    if (!unkeyResponse.ok) {
      console.warn('[API/keys:DELETE:unkey:WARN] Failed to revoke key in Unkey')
    }

    // Mark as inactive in our database
    debug('DELETE:supabase:updating', { keyId })
    await supabaseAdmin
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('unkey_id', keyId)
    
    debug('DELETE:success', { keyId })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API/keys:DELETE:ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// List API keys for a workspace
export async function GET(request: NextRequest) {
  debug('GET:start', { timestamp: new Date().toISOString() })
  
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    
    debug('GET:params', { workspaceId })

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Get API keys for this workspace (using admin client to bypass RLS)
    const { data: keys, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      debug('GET:supabase:error', { error: error.message })
      throw error
    }

    debug('GET:success', { keyCount: keys?.length || 0 })

    return NextResponse.json({ keys: keys || [] })

  } catch (error: any) {
    console.error('[API/keys:GET:ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
