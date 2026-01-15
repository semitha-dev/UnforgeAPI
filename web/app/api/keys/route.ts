/**
 * API Key Management Endpoint
 * Uses Unkey HTTP API for key creation/deletion
 * Database tracks key metadata for dashboard display
 * 
 * 4-Tier Pricing Structure:
 * - sandbox: 50/day (Managed, 3 search/day, 5 deep research/day)
 * - managed_pro: 1000/month (Managed, Search enabled)
 * - byok_starter: 100/day (BYOK, Search enabled, requires user keys)
 * - byok_pro: 10/sec rate limit (BYOK, Unlimited, requires user keys)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Debug helper - Enhanced with more detail
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [API/keys:${tag}]`, JSON.stringify(data, null, 2))
  }
}

function debugSuccess(tag: string, data: any) {
  const timestamp = new Date().toISOString()
  console.log(`${timestamp} ✅ [API/keys:${tag}]`, JSON.stringify(data, null, 2))
}

function debugError(tag: string, data: any) {
  const timestamp = new Date().toISOString()
  console.error(`${timestamp} ❌ [API/keys:${tag}:ERROR]`, JSON.stringify(data, null, 2))
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
      // 50,000 requests per month (fair usage policy)
      return { type: 'fast' as const, limit: 50000, duration: 2592000000 };
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
    
    debug('POST:body:raw', { name, tier, workspaceId })

    if (!workspaceId || !name) {
      debug('POST:validation:fail', { missingWorkspaceId: !workspaceId, missingName: !name })
      return NextResponse.json(
        { error: 'workspaceId and name are required' }, 
        { status: 400 }
      )
    }

    // Get workspace owner to check their subscription
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()

    let userSubscriptionTier = 'free'
    let polarProductId: string | null = null
    
    if (workspace?.owner_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_tier, subscription_status, polar_subscription_id')
        .eq('id', workspace.owner_id)
        .single()
      
      if (profile?.subscription_status === 'active' && profile?.subscription_tier) {
        userSubscriptionTier = profile.subscription_tier
      }

      // Get the product ID from Polar if user has active subscription
      if (profile?.polar_subscription_id) {
        // Check webhook_events for the product ID
        const { data: webhookEvent } = await supabaseAdmin
          .from('webhook_events')
          .select('payload')
          .eq('event_type', 'subscription.active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (webhookEvent?.payload?.data?.product_id) {
          polarProductId = webhookEvent.payload.data.product_id
        }
      }
    }

    debug('POST:subscription', { 
      userSubscriptionTier, 
      polarProductId,
      subscriptionStatus: 'Retrieved from profile'
    })

    // Determine the API plan based on user selection and subscription
    // tier from UI: 'byok' | 'managed'
    // plan to use: 'sandbox' | 'managed_pro' | 'byok_starter' | 'byok_pro'
    let plan: ApiPlan
    
    const MANAGED_PRO_PRODUCT_ID = process.env.POLAR_MANAGED_PRO_PRODUCT_ID!
    const BYOK_PRO_PRODUCT_ID = process.env.POLAR_BYOK_PRO_PRODUCT_ID!
    
    debug('POST:planDetermination:start', {
      requestedTier: tier,
      userSubscriptionTier,
      polarProductId,
      MANAGED_PRO_PRODUCT_ID,
      BYOK_PRO_PRODUCT_ID,
      isManagedProMatch: polarProductId === MANAGED_PRO_PRODUCT_ID || userSubscriptionTier === 'managed_pro',
      isByokProMatch: polarProductId === BYOK_PRO_PRODUCT_ID || userSubscriptionTier === 'byok_pro'
    })
    
    if (tier === 'byok') {
      // User wants BYOK key
      // Check if they have BYOK Pro subscription
      if (polarProductId === BYOK_PRO_PRODUCT_ID || userSubscriptionTier === 'byok_pro') {
        plan = 'byok_pro'
        debugSuccess('POST:planDetermination', { 
          decision: 'BYOK Pro - User has BYOK Pro subscription',
          tier,
          plan,
          reason: polarProductId === BYOK_PRO_PRODUCT_ID ? 'Matched BYOK_PRO_PRODUCT_ID' : 'Matched byok_pro tier'
        })
      } else {
        plan = 'byok_starter' // Free BYOK tier (100 req/day)
        debug('POST:planDetermination', { 
          decision: 'BYOK Starter - No pro subscription',
          tier,
          plan,
          reason: 'Fallback to free BYOK tier'
        })
      }
    } else if (tier === 'managed') {
      // User wants Managed key
      // Check if they have Managed Pro subscription
      if (polarProductId === MANAGED_PRO_PRODUCT_ID || userSubscriptionTier === 'managed_pro' || userSubscriptionTier === 'pro') {
        plan = 'managed_pro'
        debugSuccess('POST:planDetermination', { 
          decision: 'Managed Pro - User has Pro subscription',
          tier,
          plan,
          reason: polarProductId === MANAGED_PRO_PRODUCT_ID ? 'Matched MANAGED_PRO_PRODUCT_ID' : `Matched tier: ${userSubscriptionTier}`
        })
      } else {
        plan = 'sandbox' // Free Managed tier (50 req/day)
        debug('POST:planDetermination', { 
          decision: 'Sandbox - No pro subscription',
          tier,
          plan,
          reason: 'Fallback to free sandbox tier'
        })
      }
    } else {
      // Direct plan specification (for backward compatibility)
      const validTiers: ApiPlan[] = ['sandbox', 'managed_pro', 'byok_starter', 'byok_pro']
      plan = validTiers.includes(tier as ApiPlan) ? (tier as ApiPlan) : 'sandbox'
      debug('POST:planDetermination', { 
        decision: 'Direct plan specification',
        tier,
        plan,
        reason: 'Backward compatibility mode'
      })
    }
    
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
          searchEnabled: true, // All plans have search enabled
          requiresUserKeys: plan === 'byok_starter' || plan === 'byok_pro'
        },
        ratelimit: limitConfig,
        enabled: true
      })
    })

    // Handle response - first get raw text to debug any parsing issues
    const responseText = await unkeyResponse.text()
    debug('POST:unkey:rawResponse', { status: unkeyResponse.status, text: responseText.substring(0, 500) })
    
    let rawResult
    try {
      rawResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[API/keys:POST:JSON_PARSE_ERROR]', { responseText: responseText.substring(0, 500), error: (parseError as Error).message })
      return NextResponse.json(
        { error: 'Failed to parse Unkey API response', details: responseText.substring(0, 200) }, 
        { status: 500 }
      )
    }
    
    // Unkey v2 wraps response in { meta, data } envelope
    const unkeyResult = rawResult.data || rawResult
    debug('POST:unkey:response', { ok: unkeyResponse.ok, keyId: unkeyResult.keyId, requestId: rawResult.meta?.requestId })

    if (!unkeyResponse.ok) {
      console.error('[API/keys:POST:unkey:ERROR]', rawResult)
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
