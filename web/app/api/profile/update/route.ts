// app/api/profile/update/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, education_level } = body;

    if (!name || !education_level) {
      return NextResponse.json(
        { error: 'Name and education level are required' },
        { status: 400 }
      );
    }

    const validLevels = ['high_school', 'bachelor', 'master', 'phd', 'other'];
    if (!validLevels.includes(education_level)) {
      return NextResponse.json(
        { error: 'Invalid education level' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        name,
        education_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, name, email, education_level, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update profile');
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// -------------------------------------------
// app/api/profile/route.ts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, name, email, education_level, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      throw new Error('Failed to fetch profile');
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// -------------------------------------------
// app/api/subscription/delete/route.ts
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify subscription belongs to user before deleting
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or access denied' },
        { status: 403 }
      );
    }

    // Update subscription status to cancelled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error cancelling subscription:', updateError);
      throw new Error('Failed to cancel subscription');
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}