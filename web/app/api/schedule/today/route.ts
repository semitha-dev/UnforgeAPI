// app/api/schedule/today/route.ts
// Today's Focus View: All tasks for today with progress tracking
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const date = searchParams.get('date'); // Optional: specific date, defaults to today

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Build query
    let query = supabase
      .from('schedule_tasks')
      .select(`
        *,
        schedules!inner (
          id,
          exam_date,
          difficulty,
          daily_study_minutes,
          cram_mode_enabled,
          user_id
        )
      `)
      .eq('task_date', targetDate)
      .eq('schedules.user_id', user.id)
      .order('priority', { ascending: false }); // High priority first

    if (scheduleId) {
      query = query.eq('schedule_id', scheduleId);
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Error fetching today tasks:', tasksError);
      throw new Error('Failed to fetch tasks');
    }

    // Group tasks by schedule
    const tasksBySchedule = new Map<string, any[]>();
    tasks?.forEach(task => {
      const sid = task.schedule_id;
      if (!tasksBySchedule.has(sid)) {
        tasksBySchedule.set(sid, []);
      }
      tasksBySchedule.get(sid)!.push(task);
    });

    // Calculate focus data for each schedule
    const focusData: any[] = [];

    tasksBySchedule.forEach((scheduleTasks, sid) => {
      const schedule = scheduleTasks[0].schedules;
      const completed = scheduleTasks.filter(t => t.status === 'understood').length;
      const total = scheduleTasks.length;
      const pending = scheduleTasks.filter(t => t.status === 'pending');
      const needWork = scheduleTasks.filter(t => t.status === 'need_work');

      // Time calculations
      const totalMinutes = scheduleTasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);
      const completedMinutes = scheduleTasks
        .filter(t => t.status === 'understood')
        .reduce((sum, t) => sum + (t.actual_minutes || t.estimated_minutes || 30), 0);
      const remainingMinutes = totalMinutes - completedMinutes;

      // Calculate days until exam
      const examDate = new Date(schedule.exam_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      focusData.push({
        scheduleId: sid,
        examDate: schedule.exam_date,
        daysUntilExam,
        cramModeEnabled: schedule.cram_mode_enabled,
        progress: {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        },
        time: {
          totalMinutes,
          completedMinutes,
          remainingMinutes
        },
        tasks: {
          pending: pending.map(formatTask),
          needWork: needWork.map(formatTask),
          completed: scheduleTasks.filter(t => t.status === 'understood').map(formatTask)
        },
        nextTask: pending.length > 0 ? formatTask(pending[0]) : null
      });
    });

    // If requesting for a specific schedule, return single object
    if (scheduleId && focusData.length === 1) {
      return NextResponse.json(focusData[0]);
    }

    // Calculate overall focus stats
    const allPending = tasks?.filter(t => t.status === 'pending') || [];
    const allCompleted = tasks?.filter(t => t.status === 'understood') || [];
    const totalTasks = tasks?.length || 0;

    return NextResponse.json({
      date: targetDate,
      isToday: targetDate === new Date().toISOString().split('T')[0],
      summary: {
        totalTasks,
        completed: allCompleted.length,
        pending: allPending.length,
        percentage: totalTasks > 0 ? Math.round((allCompleted.length / totalTasks) * 100) : 0
      },
      schedules: focusData,
      motivationalMessage: getMotivationalMessage(allCompleted.length, totalTasks)
    });

  } catch (error: any) {
    console.error('Error fetching today view:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch today view' },
      { status: 500 }
    );
  }
}

function formatTask(task: any) {
  return {
    id: task.id,
    name: task.task_name,
    type: task.task_type,
    status: task.status,
    priority: task.priority,
    projectId: task.project_id,
    projectName: task.project_name,
    lessonReference: task.lesson_reference,
    estimatedMinutes: task.estimated_minutes || 30,
    actualMinutes: task.actual_minutes,
    isCramTask: task.is_cram_task,
    // SM-2 data
    easinessFactor: task.easiness_factor,
    repetitionNumber: task.repetition_number,
    intervalDays: task.interval_days,
    nextReviewDate: task.next_review_date
  };
}

function getMotivationalMessage(completed: number, total: number): string {
  if (total === 0) {
    return "No tasks scheduled for today. Enjoy your rest! 🌟";
  }
  
  const percentage = Math.round((completed / total) * 100);
  
  if (percentage === 0) {
    return "Let's get started! Every journey begins with a single step. 🚀";
  } else if (percentage < 25) {
    return "Great start! Keep the momentum going! 💪";
  } else if (percentage < 50) {
    return "You're making progress! Stay focused! 📚";
  } else if (percentage < 75) {
    return "Over halfway there! You've got this! 🎯";
  } else if (percentage < 100) {
    return "Almost done! The finish line is in sight! 🏁";
  } else {
    return "Amazing! You've completed all tasks for today! 🎉";
  }
}

// PATCH endpoint to reschedule a task to another day (drag-drop)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, newDate, scheduleId } = body;

    if (!taskId || !newDate) {
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

    // Get task and verify ownership
    const { data: task, error: taskError } = await supabase
      .from('schedule_tasks')
      .select(`
        *,
        schedules!inner (user_id, exam_date)
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.schedules.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Validate new date is before exam
    const examDate = new Date(task.schedules.exam_date);
    const targetDate = new Date(newDate);
    
    if (targetDate >= examDate) {
      return NextResponse.json(
        { error: 'Cannot schedule task on or after exam date' },
        { status: 400 }
      );
    }

    // Update task with new date
    const { error: updateError } = await supabase
      .from('schedule_tasks')
      .update({
        task_date: newDate,
        original_date: task.original_date || task.task_date, // Preserve first original
        shifted_from: task.task_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (updateError) {
      console.error('Error updating task:', updateError);
      throw new Error('Failed to reschedule task');
    }

    return NextResponse.json({
      success: true,
      message: `Task moved to ${newDate}`,
      taskId,
      newDate,
      previousDate: task.task_date
    });

  } catch (error: any) {
    console.error('Error rescheduling task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reschedule task' },
      { status: 500 }
    );
  }
}
