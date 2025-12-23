import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// Token pack product IDs
const TOKEN_PACKS: Record<string, { tokens: number; price: number }> = {
  '5ac0c69a-501f-4f9f-a17e-592e50bb45a8': { tokens: 500, price: 200 },    // $2
  '743c222a-bee4-4272-8011-12f6089a9c01': { tokens: 1000, price: 300 },   // $3
  'ffc789b3-4e5a-4e3f-8afc-8e310973fd57': { tokens: 2500, price: 500 },   // $5
  '367064f3-6219-4e15-8142-705e7267d75e': { tokens: 10000, price: 800 },  // $8
};

const POLAR_API_URL = process.env.POLAR_SANDBOX === 'true' 
  ? 'https://sandbox-api.polar.sh/v1'
  : 'https://api.polar.sh/v1';

export async function POST(request: NextRequest) {
  console.log('=== TOKEN PACK CHECKOUT ===');
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;
    
    console.log('Product ID:', productId);
    
    // Validate pack ID
    if (!productId || !TOKEN_PACKS[productId]) {
      return NextResponse.json({ 
        error: 'Invalid token pack',
        validPacks: Object.keys(TOKEN_PACKS)
      }, { status: 400 });
    }

    const pack = TOKEN_PACKS[productId];
    console.log('Token pack:', pack);

    // Create checkout with Polar
    const checkoutPayload = {
      products: [productId],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tokens=success`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        pack_id: productId,
        tokens: pack.tokens.toString(),
      }
    };

    console.log('Polar checkout payload:', JSON.stringify(checkoutPayload, null, 2));

    const response = await fetch(`${POLAR_API_URL}/checkouts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Polar API error:', response.status, responseData);
      return NextResponse.json({ 
        error: 'Failed to create checkout',
        details: responseData 
      }, { status: 500 });
    }

    console.log('Checkout created:', responseData.url);

    return NextResponse.json({ 
      checkoutUrl: responseData.url,
      checkoutId: responseData.id,
      tokens: pack.tokens,
      price: pack.price,
    });

  } catch (error: any) {
    console.error('Token pack checkout error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// GET - List available token packs
export async function GET() {
  const packs = Object.entries(TOKEN_PACKS).map(([id, pack]) => ({
    id,
    tokens: pack.tokens,
    price: pack.price,
    priceDisplay: `$${(pack.price / 100).toFixed(0)}`,
    costPerToken: (pack.price / pack.tokens).toFixed(4),
  }));

  return NextResponse.json({ packs });
}
