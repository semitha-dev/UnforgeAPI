import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { PRO_PRODUCT_ID } from '@/lib/subscription';

// Debug helper
const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
function debug(tag: string, data: any) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`${timestamp} [Checkout:${tag}]`, JSON.stringify(data, null, 2))
  }
}

// Detailed debug for checkout payload inspection
function debugPayload(tag: string, payload: any, maxDepth: number = 3) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    const simplified = simplifyObject(payload, maxDepth)
    console.log(`${timestamp} [Checkout:${tag}]`, JSON.stringify(simplified, null, 2))
  }
}

// Helper to simplify large objects for logging
function simplifyObject(obj: any, depth: number, currentDepth: number = 0): any {
  if (currentDepth >= depth) {
    return '[truncated]'
  }
  
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 5).map(item => simplifyObject(item, depth, currentDepth + 1))
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = simplifyObject(value, depth, currentDepth + 1)
    }
    return result
  }
  
  return obj
}

// Use sandbox API for testing, production API for live
const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true' 
  ? 'https://sandbox-api.polar.sh/v1' 
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  debug('POST:start', { timestamp: new Date().toISOString() })
  
  try {
    const supabase = await createClient();
    debug('supabase:created', {})
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    debug('auth:result', { userId: user?.id, email: user?.email, error: authError?.message });

    if (!user) {
      debug('auth:fail', { reason: 'User not authenticated' })
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    debug('body:raw', body);
    const { productId, productType } = body;

    debug('body:parsed', { productId, productType, hasProductId: !!productId, hasProductType: !!productType })

    // Determine product ID from type or use provided ID
    let finalProductId = productId;
    
    if (!finalProductId && productType) {
      // Map product type to product ID from environment
      if (productType === 'managed' || productType === 'managed_pro') {
        finalProductId = process.env.POLAR_MANAGED_PRO_PRODUCT_ID;
        debug('productId:fromType', { type: 'managed_pro', productId: finalProductId })
      } else if (productType === 'managed_expert') {
        finalProductId = process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID;
        debug('productId:fromType', { type: 'managed_expert', productId: finalProductId })
      } else if (productType === 'byok') {
        finalProductId = process.env.POLAR_BYOK_PRO_PRODUCT_ID;
        debug('productId:fromType', { type: 'byok', productId: finalProductId })
      }
    }
    
    // Fallback to legacy PRO_PRODUCT_ID
    if (!finalProductId) {
      finalProductId = PRO_PRODUCT_ID;
      debug('productId:fallback', { productId: finalProductId })
    }
    
    debug('productId:final', { 
      finalProductId, 
      source: productId ? 'provided' : productType ? 'mapped' : 'fallback',
      environment: {
        POLAR_MANAGED_PRO_PRODUCT_ID: process.env.POLAR_MANAGED_PRO_PRODUCT_ID,
        POLAR_MANAGED_EXPERT_PRODUCT_ID: process.env.POLAR_MANAGED_EXPERT_PRODUCT_ID,
        POLAR_BYOK_PRO_PRODUCT_ID: process.env.POLAR_BYOK_PRO_PRODUCT_ID,
      }
    })
    
    if (!finalProductId) {
      debug('validation:fail', { reason: 'No product ID provided or configured' })
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      debug('config:fail', { reason: 'POLAR_ACCESS_TOKEN not set' })
      return NextResponse.json({ error: 'Polar not configured - missing access token' }, { status: 500 });
    }

    // Get user email from auth
    const customerEmail = user.email;
    debug('customer', { email: customerEmail });
    
    if (!customerEmail) {
      debug('validation:fail', { reason: 'No email found for user' })
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?subscription=success`;
    const checkoutPayload = {
      products: [finalProductId],
      success_url: successUrl,
      customer_email: customerEmail,
      metadata: {
        user_id: user.id,
        product_type: productType || 'unknown'
      },
    };
    
    debug('polar:request:prepared', { 
      url: `${POLAR_API_URL}/checkouts/`,
      payload: checkoutPayload,
      sandboxMode: process.env.POLAR_SANDBOX === 'true',
      polarApiUrl: POLAR_API_URL
    });

    // Create checkout session with Polar (new API format)
    const response = await fetch(`${POLAR_API_URL}/checkouts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const responseText = await response.text();
    debug('polar:response:raw', { status: response.status, statusText: response.statusText, bodyLength: responseText.length })
    debugPayload('polar:response:body', { status: response.status, body: responseText }, 3)

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      debug('polar:error', errorData);
      return NextResponse.json({ 
        error: 'Failed to create checkout session', 
        details: errorData,
        status: response.status 
      }, { status: 500 });
    }

    const checkoutData = JSON.parse(responseText);
    debug('polar:success', { 
      checkoutId: checkoutData.id, 
      url: checkoutData.url,
      checkoutUrl: checkoutData.checkout_url,
      hasUrl: !!checkoutData.url || !!checkoutData.checkout_url
    });

    return NextResponse.json({
      url: checkoutData.url || checkoutData.checkout_url,
      checkoutId: checkoutData.id,
    });
  } catch (error: any) {
    debug('error:caught', { 
      name: error.name, 
      message: error.message, 
      stack: error.stack?.substring(0, 500) 
    })
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
