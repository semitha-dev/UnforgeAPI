// app/api/schedule/delete/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify schedule belongs to user before deleting
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 403 }
      );
    }

    // Delete related records first (in case cascade is not set up)
    // Delete quiz mistakes first (they reference schedule_id)
    const { error: mistakesError } = await supabase
      .from('quiz_mistakes')
      .delete()
      .eq('schedule_id', scheduleId);

    if (mistakesError) {
      console.error('Error deleting quiz mistakes:', mistakesError);
      // Continue anyway as the table might not have any records
    }

    // Delete schedule tasks
    const { error: tasksError } = await supabase
      .from('schedule_tasks')
      .delete()
      .eq('schedule_id', scheduleId);

    if (tasksError) {
      console.error('Error deleting schedule tasks:', tasksError);
      throw new Error('Failed to delete schedule tasks');
    }

    // Delete the schedule itself
    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting schedule:', deleteError);
      throw new Error('Failed to delete schedule');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}