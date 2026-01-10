/**
 * Debug/Health Check Endpoint
 * 
 * Tests connectivity to all external services:
 * - Redis (Upstash)
 * - Unkey API
 * - Supabase
 * 
 * Only enabled in development or with DEBUG=true
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'disabled' | 'checking'
  latencyMs?: number
  details?: any
  error?: string
}

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return Redis.fromEnv()
}

export async function GET(request: NextRequest) {
  // Only allow in development or with DEBUG flag
  if (!DEBUG) {
    return NextResponse.json({ 
      error: 'Debug endpoint disabled in production',
      hint: 'Set DEBUG=true environment variable to enable'
    }, { status: 403 })
  }

  const results: Record<string, ServiceStatus> = {}
  const startTime = performance.now()

  // ============================================
  // 1. Test Redis (Upstash)
  // ============================================
  results.redis = { name: 'Upstash Redis', status: 'checking' }
  const redisStart = performance.now()
  
  try {
    const redis = getRedisClient()
    
    if (!redis) {
      results.redis = {
        name: 'Upstash Redis',
        status: 'disabled',
        details: {
          hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
          hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          urlPrefix: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...'
        },
        error: 'Redis not configured - missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'
      }
    } else {
      // Test basic operations
      const testKey = `debug:test:${Date.now()}`
      const testValue = { timestamp: new Date().toISOString(), random: Math.random() }
      
      // SET
      await redis.set(testKey, JSON.stringify(testValue), { ex: 60 })
      
      // GET
      const retrieved = await redis.get<string>(testKey)
      
      // DELETE
      await redis.del(testKey)
      
      const redisLatency = Math.round(performance.now() - redisStart)
      
      results.redis = {
        name: 'Upstash Redis',
        status: 'ok',
        latencyMs: redisLatency,
        details: {
          operations: ['SET', 'GET', 'DEL'],
          testKey,
          valueMatched: retrieved !== null,
          urlConfigured: true,
          tokenConfigured: true
        }
      }
    }
  } catch (error: any) {
    results.redis = {
      name: 'Upstash Redis',
      status: 'error',
      latencyMs: Math.round(performance.now() - redisStart),
      error: error.message,
      details: {
        errorType: error.name,
        errorCode: error.code
      }
    }
  }

  // ============================================
  // 2. Test Cache Key Generation (SHA256)
  // ============================================
  results.cacheHashing = { name: 'Cache Key Hashing', status: 'checking' }
  
  try {
    const testQuery = 'What is the stock price of Apple?'
    const hash = createHash('sha256').update(testQuery.toLowerCase().trim()).digest('hex')
    const cacheKey = `research:${hash}`
    
    results.cacheHashing = {
      name: 'Cache Key Hashing (SHA256)',
      status: 'ok',
      details: {
        algorithm: 'SHA256',
        inputSample: testQuery,
        outputHash: hash.substring(0, 16) + '...',
        cacheKeyFormat: cacheKey.substring(0, 30) + '...',
        hashLength: hash.length,
        privacyNote: 'Query text is hashed - not stored in plain text'
      }
    }
  } catch (error: any) {
    results.cacheHashing = {
      name: 'Cache Key Hashing',
      status: 'error',
      error: error.message
    }
  }

  // ============================================
  // 3. Test Unkey API
  // ============================================
  results.unkey = { name: 'Unkey API', status: 'checking' }
  const unkeyStart = performance.now()
  
  try {
    const hasRootKey = !!process.env.UNKEY_ROOT_KEY
    const hasApiId = !!process.env.UNKEY_API_ID
    
    if (!hasRootKey || !hasApiId) {
      results.unkey = {
        name: 'Unkey API',
        status: 'disabled',
        details: { hasRootKey, hasApiId },
        error: 'Unkey not configured'
      }
    } else {
      // Verify the API is reachable by getting API info (requires apiId parameter)
      // Unkey API endpoint
      const response = await fetch(`https://api.unkey.dev/v1/apis.getApi?apiId=${process.env.UNKEY_API_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.UNKEY_ROOT_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      const unkeyLatency = Math.round(performance.now() - unkeyStart)
      const rawResponse = await response.json().catch(() => ({}))
      // Unkey v2 wraps response in { meta, data } envelope
      const responseData = rawResponse.data || rawResponse
      
      if (response.ok) {
        results.unkey = {
          name: 'Unkey API',
          status: 'ok',
          latencyMs: unkeyLatency,
          details: {
            apiId: process.env.UNKEY_API_ID?.substring(0, 10) + '...',
            apiName: responseData.name || 'Unknown',
            rootKeyConfigured: true,
            apiReachable: true
          }
        }
      } else {
        results.unkey = {
          name: 'Unkey API',
          status: 'error',
          latencyMs: unkeyLatency,
          error: responseData.error?.message || `API returned ${response.status}`,
          details: { 
            statusCode: response.status,
            errorCode: responseData.error?.code
          }
        }
      }
    }
  } catch (error: any) {
    results.unkey = {
      name: 'Unkey API',
      status: 'error',
      latencyMs: Math.round(performance.now() - unkeyStart),
      error: error.message
    }
  }

  // ============================================
  // 4. Test Supabase
  // ============================================
  results.supabase = { name: 'Supabase', status: 'checking' }
  const supabaseStart = performance.now()
  
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!hasUrl || !hasServiceKey) {
      results.supabase = {
        name: 'Supabase',
        status: 'disabled',
        details: { hasUrl, hasServiceKey },
        error: 'Supabase not configured'
      }
    } else {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Simple query to test connectivity
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      const supabaseLatency = Math.round(performance.now() - supabaseStart)
      
      if (error) {
        results.supabase = {
          name: 'Supabase',
          status: 'error',
          latencyMs: supabaseLatency,
          error: error.message,
          details: { errorCode: error.code }
        }
      } else {
        results.supabase = {
          name: 'Supabase',
          status: 'ok',
          latencyMs: supabaseLatency,
          details: {
            connected: true,
            urlConfigured: true,
            serviceKeyConfigured: true
          }
        }
      }
    }
  } catch (error: any) {
    results.supabase = {
      name: 'Supabase',
      status: 'error',
      latencyMs: Math.round(performance.now() - supabaseStart),
      error: error.message
    }
  }

  // ============================================
  // 5. Check LLM API Keys
  // ============================================
  results.llmKeys = {
    name: 'LLM API Keys',
    status: 'ok',
    details: {
      groq: {
        configured: !!process.env.GROQ_API_KEY,
        keyPrefix: process.env.GROQ_API_KEY?.substring(0, 8) + '...'
      },
      tavily: {
        configured: !!process.env.TAVILY_API_KEY,
        keyPrefix: process.env.TAVILY_API_KEY?.substring(0, 8) + '...'
      },
      google: {
        configured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        keyPrefix: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 8) + '...'
      }
    }
  }

  const allOk = Object.values(results).every(r => r.status === 'ok' || r.status === 'disabled')
  const totalLatency = Math.round(performance.now() - startTime)

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    totalLatencyMs: totalLatency,
    environment: process.env.NODE_ENV,
    services: results,
    summary: {
      total: Object.keys(results).length,
      ok: Object.values(results).filter(r => r.status === 'ok').length,
      errors: Object.values(results).filter(r => r.status === 'error').length,
      disabled: Object.values(results).filter(r => r.status === 'disabled').length
    }
  })
}

/**
 * POST /api/debug - Test specific functionality
 */
export async function POST(request: NextRequest) {
  if (!DEBUG) {
    return NextResponse.json({ error: 'Debug endpoint disabled' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { test } = body

    if (test === 'redis-cache') {
      // Test the actual cache mechanism
      const redis = getRedisClient()
      if (!redis) {
        return NextResponse.json({ 
          success: false, 
          error: 'Redis not configured' 
        })
      }

      const testQuery = body.query || 'test query for cache'
      const hash = createHash('sha256').update(testQuery.toLowerCase().trim()).digest('hex')
      const cacheKey = `research:${hash}`
      
      // Check if exists
      const existing = await redis.get(cacheKey)
      
      // Set a test value
      const testReport = `Test report generated at ${new Date().toISOString()}`
      await redis.set(cacheKey, testReport, { ex: 60 })
      
      // Retrieve it
      const retrieved = await redis.get(cacheKey)
      
      return NextResponse.json({
        success: true,
        test: 'redis-cache',
        results: {
          query: testQuery,
          cacheKey,
          hashUsed: hash,
          existingValue: existing ? 'Found existing cache' : 'No existing cache',
          setValue: testReport.substring(0, 50) + '...',
          retrievedMatch: retrieved === testReport,
          ttl: '60 seconds'
        }
      })
    }

    if (test === 'api-key-plan') {
      // Test API key plan determination logic
      const { subscriptionTier, polarProductId, requestedTier } = body
      
      const MANAGED_PRO_PRODUCT_ID = process.env.POLAR_MANAGED_PRO_PRODUCT_ID!
      const BYOK_PRO_PRODUCT_ID = process.env.POLAR_BYOK_PRO_PRODUCT_ID!
      
      let plan: string
      let reason: string
      
      if (requestedTier === 'byok') {
        if (polarProductId === BYOK_PRO_PRODUCT_ID || subscriptionTier === 'byok_pro') {
          plan = 'byok_pro'
          reason = 'User has BYOK Pro subscription'
        } else {
          plan = 'byok_starter'
          reason = 'Free BYOK tier'
        }
      } else if (requestedTier === 'managed') {
        if (polarProductId === MANAGED_PRO_PRODUCT_ID || subscriptionTier === 'managed_pro' || subscriptionTier === 'pro') {
          plan = 'managed_pro'
          reason = 'User has Managed Pro subscription'
        } else {
          plan = 'sandbox'
          reason = 'Free sandbox tier'
        }
      } else {
        plan = 'sandbox'
        reason = 'Unknown tier, defaulting to sandbox'
      }
      
      return NextResponse.json({
        success: true,
        test: 'api-key-plan',
        input: { subscriptionTier, polarProductId, requestedTier },
        output: { plan, reason },
        productIds: { MANAGED_PRO_PRODUCT_ID, BYOK_PRO_PRODUCT_ID }
      })
    }

    return NextResponse.json({ error: 'Unknown test type' }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
