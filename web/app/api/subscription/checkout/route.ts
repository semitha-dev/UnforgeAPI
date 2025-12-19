import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// Use sandbox API for testing, production API for live
const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true' 
  ? 'https://sandbox-api.polar.sh/v1' 
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

// Product IDs - You need to create these in Polar dashboard and update these values
// Go to polar.sh > Products > Create Product
const POLAR_PRODUCTS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID || '', // $10/month product ID
  premium: process.env.POLAR_PREMIUM_PRODUCT_ID || '', // $100/month product ID
};

export async function POST(request: NextRequest) {
  // Only log debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('=== CHECKOUT API CALLED ===');
    console.log('Environment check:');
    console.log('- POLAR_ACCESS_TOKEN exists:', !!POLAR_ACCESS_TOKEN);
    console.log('- Products configured:', { pro: !!process.env.POLAR_PRO_PRODUCT_ID, premium: !!process.env.POLAR_PREMIUM_PRODUCT_ID });
  }
  
  try {
    const supabase = await createClient();
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth result:', { user: user?.id, email: user?.email, error: authError?.message });

    if (!user) {
      console.log('ERROR: User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { plan } = body; // 'pro' or 'premium'

    if (!plan || !['pro', 'premium'].includes(plan)) {
      console.log('ERROR: Invalid plan:', plan);
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      console.log('ERROR: POLAR_ACCESS_TOKEN is not set');
      return NextResponse.json({ error: 'Polar not configured - missing access token' }, { status: 500 });
    }

    const productId = POLAR_PRODUCTS[plan as keyof typeof POLAR_PRODUCTS];
    console.log('Product ID for plan', plan, ':', productId);
    
    if (!productId) {
      console.log('ERROR: Product ID not configured for plan:', plan);
      return NextResponse.json({ error: `Product not configured for plan: ${plan}` }, { status: 500 });
    }

    // Get user email from auth
    const customerEmail = user.email;
    console.log('Customer email:', customerEmail);
    
    if (!customerEmail) {
      console.log('ERROR: No email found for user');
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const checkoutPayload = {
      products: [productId],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings?subscription=success`,
      customer_email: customerEmail,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
    };
    
    console.log('Polar checkout payload:', JSON.stringify(checkoutPayload, null, 2));
    console.log('Polar API URL:', `${POLAR_API_URL}/checkouts/`);

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
    if (process.env.NODE_ENV === 'development') {
      console.log('Polar API response status:', response.status);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.log('ERROR: Polar API returned error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to create checkout session', 
        details: errorData,
        status: response.status 
      }, { status: 500 });
    }

    const checkoutData = JSON.parse(responseText);
    console.log('SUCCESS: Checkout created');
    console.log('Checkout URL:', checkoutData.url);
    console.log('Checkout ID:', checkoutData.id);

    return NextResponse.json({
      checkoutUrl: checkoutData.url,
      checkoutId: checkoutData.id,
    });
  } catch (error: any) {
    console.log('=== UNEXPECTED ERROR ===');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
