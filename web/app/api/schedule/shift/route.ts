// app/api/schedule/shift/route.ts
// Domino Effect: Shift all pending tasks forward when days are missed
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, fromDate, reason } = body;

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftFromDate = fromDate ? new Date(fromDate) : today;
    shiftFromDate.setHours(0, 0, 0, 0);
    const examDate = new Date(schedule.exam_date);
    examDate.setHours(23, 59, 59, 999);

    // Get all pending tasks from the shift date onwards
    const { data: pendingTasks, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('status', 'pending')
      .gte('task_date', shiftFromDate.toISOString().split('T')[0])
      .order('task_date', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw new Error('Failed to fetch tasks');
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending tasks to shift',
        shifted: 0
      });
    }

    // Calculate available study days
    const preferredDays = schedule.preferred_days || [1, 2, 3, 4, 5, 6]; // Mon-Sat default
    const bufferDay = schedule.buffer_day ?? 0; // Sunday default
    const dailyStudyMinutes = schedule.daily_study_minutes || 120;

    // Get all available dates from tomorrow until exam
    const availableDates: string[] = [];
    let checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow

    while (checkDate < examDate) {
      const dayOfWeek = checkDate.getDay();
      // Include day if it's a preferred day and not a buffer day (or buffer is disabled)
      if (preferredDays.includes(dayOfWeek) && (bufferDay === -1 || dayOfWeek !== bufferDay)) {
        availableDates.push(checkDate.toISOString().split('T')[0]);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Group tasks by current date to maintain daily structure
    const tasksByDate = new Map<string, typeof pendingTasks>();
    pendingTasks.forEach(task => {
      const date = task.task_date;
      if (!tasksByDate.has(date)) {
        tasksByDate.set(date, []);
      }
      tasksByDate.get(date)!.push(task);
    });

    // Calculate time budget per day
    const dayTimeUsed: Map<string, number> = new Map();
    
    const getRemainingTime = (date: string) => {
      const used = dayTimeUsed.get(date) || 0;
      return dailyStudyMinutes - used;
    };

    // Redistribute tasks using time-boxing
    const tasksToUpdate: Array<{ id: string; newDate: string; originalDate: string }> = [];
    let availableDateIndex = 0;

    // Sort tasks by priority and date
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.task_date).getTime() - new Date(b.task_date).getTime();
    });

    for (const task of sortedTasks) {
      const taskMinutes = task.estimated_minutes || 30;
      let scheduled = false;

      // Find a day with enough time
      while (availableDateIndex < availableDates.length) {
        const targetDate = availableDates[availableDateIndex];
        const remaining = getRemainingTime(targetDate);

        if (remaining >= taskMinutes) {
          // Schedule task on this day
          tasksToUpdate.push({
            id: task.id,
            newDate: targetDate,
            originalDate: task.task_date
          });
          dayTimeUsed.set(targetDate, (dayTimeUsed.get(targetDate) || 0) + taskMinutes);
          scheduled = true;
          break;
        }

        // Day is full, move to next day
        availableDateIndex++;
      }

      // If couldn't schedule, try to fit in any remaining day
      if (!scheduled) {
        for (let i = availableDateIndex; i < availableDates.length; i++) {
          const targetDate = availableDates[i];
          const remaining = getRemainingTime(targetDate);
          
          if (remaining >= taskMinutes) {
            tasksToUpdate.push({
              id: task.id,
              newDate: targetDate,
              originalDate: task.task_date
            });
            dayTimeUsed.set(targetDate, (dayTimeUsed.get(targetDate) || 0) + taskMinutes);
            scheduled = true;
            break;
          }
        }
      }

      // If still couldn't schedule (not enough days), keep on last available day
      if (!scheduled && availableDates.length > 0) {
        const lastDate = availableDates[availableDates.length - 1];
        tasksToUpdate.push({
          id: task.id,
          newDate: lastDate,
          originalDate: task.task_date
        });
        dayTimeUsed.set(lastDate, (dayTimeUsed.get(lastDate) || 0) + taskMinutes);
      }
    }

    // Update tasks in database
    let shiftedCount = 0;
    for (const update of tasksToUpdate) {
      if (update.newDate !== update.originalDate) {
        const { error } = await supabase
          .from('schedule_tasks')
          .update({
            task_date: update.newDate,
            shifted_from: update.originalDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (!error) {
          shiftedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully shifted ${shiftedCount} tasks`,
      shifted: shiftedCount,
      totalTasks: pendingTasks.length,
      availableDays: availableDates.length,
      reason: reason || 'Manual shift requested'
    });

  } catch (error: any) {
    console.error('Error shifting schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to shift schedule' },
      { status: 500 }
    );
  }
}

// GET endpoint to preview shift without applying it
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

    // Get schedule with tasks
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

    // Get overdue tasks
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('status', 'pending')
      .lt('task_date', today.toISOString().split('T')[0])
      .order('task_date', { ascending: true });

    if (overdueError) {
      throw new Error('Failed to fetch overdue tasks');
    }

    // Get total pending tasks
    const { count: pendingCount, error: countError } = await supabase
      .from('schedule_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId)
      .eq('status', 'pending');

    const examDate = new Date(schedule.exam_date);
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      needsShift: overdueTasks && overdueTasks.length > 0,
      overdueTaskCount: overdueTasks?.length || 0,
      pendingTaskCount: pendingCount || 0,
      daysUntilExam,
      overdueTasks: overdueTasks?.map(t => ({
        id: t.id,
        name: t.task_name,
        date: t.task_date,
        priority: t.priority
      }))
    });

  } catch (error: any) {
    console.error('Error checking shift status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check shift status' },
      { status: 500 }
    );
  }
}
