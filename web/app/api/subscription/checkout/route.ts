import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { PRO_PRODUCT_ID } from '@/lib/subscription';

// Use sandbox API for testing, production API for live
const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true' 
  ? 'https://sandbox-api.polar.sh/v1' 
  : 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;

export async function POST(request: NextRequest) {
  // Only log debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('=== CHECKOUT API CALLED ===');
    console.log('Environment check:');
    console.log('- POLAR_ACCESS_TOKEN exists:', !!POLAR_ACCESS_TOKEN);
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
    const { productId } = body;

    // Use provided productId or default to Pro
    const finalProductId = productId || PRO_PRODUCT_ID;
    
    if (!finalProductId) {
      console.log('ERROR: No product ID provided');
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      console.log('ERROR: POLAR_ACCESS_TOKEN is not set');
      return NextResponse.json({ error: 'Polar not configured - missing access token' }, { status: 500 });
    }

    // Get user email from auth
    const customerEmail = user.email;
    console.log('Customer email:', customerEmail);
    
    if (!customerEmail) {
      console.log('ERROR: No email found for user');
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    const checkoutPayload = {
      products: [finalProductId],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?subscription=success`,
      customer_email: customerEmail,
      metadata: {
        user_id: user.id,
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
      url: checkoutData.url,
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
