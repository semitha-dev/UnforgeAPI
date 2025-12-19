import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const { name, email, education_level } = await request.json()

    if (!name || !education_level) {
      return NextResponse.json({ error: 'Name and education level are required' }, { status: 400 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
    }

    // Create profile with signup tokens
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: email || user.email,
        name: name.trim(),
        education_level,
        tokens_balance: 500 // Give new users 500 free tokens (launch promotion)
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      if (profileError.code === '23505') {
        return NextResponse.json({ error: 'Profile already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Create token transaction for signup tokens (no expiration) - using service role
    const { error: tokenError } = await supabaseAdmin
      .from('token_transactions')
      .insert({
        user_id: user.id,
        amount: 500,
        remaining: 500,
        source: 'signup',
        expires_at: null // Signup tokens never expire
      })

    if (tokenError) {
      console.error('Token transaction creation error:', tokenError)
      // Non-critical - profile is already created, but log for monitoring
      // We could potentially roll back the profile here, but the token balance
      // is already set in profiles table, so user can still use the app
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile created successfully' 
    })

  } catch (error) {
    console.error('Profile setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
