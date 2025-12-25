// app/api/schedule/cram/route.ts
// Cram Mode: Emergency compression of schedule when running out of time
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, action } = body; // action: 'activate' | 'deactivate'

    if (!scheduleId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify schedule belongs to user
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found or access denied' },
        { status: 403 }
      );
    }

    if (action === 'activate') {
      return activateCramMode(supabase, schedule, scheduleId);
    } else if (action === 'deactivate') {
      return deactivateCramMode(supabase, scheduleId);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in cram mode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process cram mode' },
      { status: 500 }
    );
  }
}

async function activateCramMode(supabase: any, schedule: any, scheduleId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(schedule.exam_date);
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Get all pending tasks
  const { data: pendingTasks, error: tasksError } = await supabase
    .from('schedule_tasks')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('status', 'pending')
    .order('priority', { ascending: false }); // High priority first

  if (tasksError) {
    throw new Error('Failed to fetch tasks');
  }

  if (!pendingTasks || pendingTasks.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No pending tasks to compress',
      cramMode: false
    });
  }

  // Calculate cramming strategy based on days remaining
  const totalMinutes = pendingTasks.reduce(
    (sum: number, t: any) => sum + (t.estimated_minutes || 30), 
    0
  );
  const dailyCramMinutes = daysUntilExam > 0 
    ? Math.min(360, Math.ceil(totalMinutes / daysUntilExam)) // Max 6 hours/day
    : 360;

  // Prioritize tasks for cramming
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...pendingTasks].sort((a: any, b: any) => {
    const aP = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bP = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    return aP - bP;
  });

  // Generate cram schedule - pack tasks into remaining days
  const cramDates: string[] = [];
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + 1); // Start tomorrow

  while (currentDate <= examDate) {
    cramDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (cramDates.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'No days remaining before exam',
      cramMode: false
    });
  }

  // Assign tasks to cram days
  const dayTimeUsed: Map<string, number> = new Map();
  const tasksToUpdate: Array<{ id: string; newDate: string; isCram: boolean }> = [];

  for (const task of sortedTasks) {
    const taskMinutes = Math.max(10, Math.floor((task.estimated_minutes || 30) * 0.7)); // Reduce time by 30% in cram mode
    
    for (const date of cramDates) {
      const used = dayTimeUsed.get(date) || 0;
      if (used + taskMinutes <= dailyCramMinutes) {
        tasksToUpdate.push({
          id: task.id,
          newDate: date,
          isCram: true
        });
        dayTimeUsed.set(date, used + taskMinutes);
        break;
      }
    }
  }

  // Apply updates
  let updatedCount = 0;
  for (const update of tasksToUpdate) {
    const { error } = await supabase
      .from('schedule_tasks')
      .update({
        task_date: update.newDate,
        is_cram_task: true,
        original_date: null, // Store original if needed
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id);

    if (!error) updatedCount++;
  }

  // Mark schedule as in cram mode
  await supabase
    .from('schedules')
    .update({
      cram_mode_enabled: true,
      cram_mode_activated_at: new Date().toISOString()
    })
    .eq('id', scheduleId);

  return NextResponse.json({
    success: true,
    cramMode: true,
    message: `Cram mode activated! ${updatedCount} tasks compressed into ${cramDates.length} days`,
    dailyStudyMinutes: dailyCramMinutes,
    daysRemaining: cramDates.length,
    tasksCompressed: updatedCount,
    totalTasks: pendingTasks.length
  });
}

async function deactivateCramMode(supabase: any, scheduleId: string) {
  // Simply mark cram mode as disabled
  // Tasks remain where they are - user can regenerate if needed
  await supabase
    .from('schedules')
    .update({
      cram_mode_enabled: false
    })
    .eq('id', scheduleId);

  // Reset cram flags on tasks
  await supabase
    .from('schedule_tasks')
    .update({
      is_cram_task: false
    })
    .eq('schedule_id', scheduleId)
    .eq('is_cram_task', true);

  return NextResponse.json({
    success: true,
    cramMode: false,
    message: 'Cram mode deactivated'
  });
}

// GET endpoint to check cram mode recommendation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Missing schedule ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('user_id', user.id)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(schedule.exam_date);
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get pending task count and total time
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('estimated_minutes')
      .eq('schedule_id', scheduleId)
      .eq('status', 'pending');

    if (tasksError) {
      throw new Error('Failed to fetch tasks');
    }

    const totalMinutes = pendingTasks?.reduce(
      (sum: number, t: any) => sum + (t.estimated_minutes || 30), 
      0
    ) || 0;
    const pendingCount = pendingTasks?.length || 0;
    
    // Calculate if cram mode is recommended
    const normalDailyMinutes = schedule.daily_study_minutes || 120;
    const availableMinutes = daysUntilExam * normalDailyMinutes;
    const completionRate = availableMinutes > 0 ? (totalMinutes / availableMinutes) * 100 : 100;

    // Recommend cram if need more than 120% of available time
    const recommendCram = completionRate > 120 && daysUntilExam <= 7;

    return NextResponse.json({
      cramModeEnabled: schedule.cram_mode_enabled || false,
      cramModeActivatedAt: schedule.cram_mode_activated_at,
      recommendation: {
        shouldActivate: recommendCram,
        reason: recommendCram 
          ? `You have ${pendingCount} tasks (${Math.round(totalMinutes/60)}h) left with only ${daysUntilExam} days until the exam`
          : 'Your schedule is on track',
        daysUntilExam,
        pendingTasks: pendingCount,
        estimatedHoursRemaining: Math.round(totalMinutes / 60),
        requiredDailyHours: daysUntilExam > 0 ? Math.round(totalMinutes / daysUntilExam / 60 * 10) / 10 : 0,
        completionRate: Math.round(completionRate)
      }
    });

  } catch (error: any) {
    console.error('Error checking cram mode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check cram mode status' },
      { status: 500 }
    );
  }
}
