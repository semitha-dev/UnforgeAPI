// app/api/schedule/task/update/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, status, scheduleId } = body;

    if (!taskId || !status || !scheduleId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['understood', 'need_work'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
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

    // Update task status
    const { data: task, error: updateError } = await supabase
      .from('schedule_tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      throw new Error('Failed to update task status');
    }

    // If marked as "need_work", reschedule it
    if (status === 'need_work') {
      await rescheduleTask(supabase, task, scheduleId, user.id);
    }

    return NextResponse.json({ 
      success: true,
      message: status === 'need_work' 
        ? 'Task marked as need work and rescheduled' 
        : 'Task marked as understood'
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

async function rescheduleTask(supabase: any, task: any, scheduleId: string, userId: string) {
  try {
    // Get schedule details
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      console.error('Error fetching schedule for rescheduling:', scheduleError);
      return;
    }

    const examDate = new Date(schedule.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from the day after the original task date
    let nextDate = new Date(task.task_date);
    nextDate.setDate(nextDate.getDate() + 1);

    let foundSlot = false;
    let attempts = 0;
    const maxAttempts = 90; // Check up to 90 days ahead

    // Try to find next available study day
    while (nextDate <= examDate && !foundSlot && attempts < maxAttempts) {
      const dayOfWeek = nextDate.getDay();
      
      // Check if this is a preferred study day (not Sunday - revision day)
      if (schedule.preferred_days.includes(dayOfWeek) && dayOfWeek !== 0) {
        // Check existing tasks for this day
        const { data: existingTasks, error: tasksError } = await supabase
          .from('schedule_tasks')
          .select('*')
          .eq('schedule_id', scheduleId)
          .eq('task_date', nextDate.toISOString().split('T')[0]);

        if (tasksError) {
          console.error('Error checking existing tasks:', tasksError);
          nextDate.setDate(nextDate.getDate() + 1);
          attempts++;
          continue;
        }

        // If day has space (less than 4 tasks), add the rescheduled task
        if (!existingTasks || existingTasks.length < 4) {
          const { error: insertError } = await supabase
            .from('schedule_tasks')
            .insert({
              schedule_id: scheduleId,
              task_date: nextDate.toISOString().split('T')[0],
              task_type: 'revise_mistake',
              task_name: `Revise: ${task.task_name}`,
              project_id: task.project_id,
              project_name: task.project_name,
              priority: 'high', // Rescheduled tasks get high priority
              lesson_reference: task.lesson_reference,
              status: 'pending'
            });

          if (!insertError) {
            foundSlot = true;
            console.log(`Successfully rescheduled task to ${nextDate.toISOString().split('T')[0]}`);
          } else {
            console.error('Error inserting rescheduled task:', insertError);
          }
        }
      }

      nextDate.setDate(nextDate.getDate() + 1);
      attempts++;
    }

    // If no slot found after checking all days, replace lowest priority task
    if (!foundSlot) {
      console.log('No free slot found, attempting to replace low-priority task');
      
      const { data: allTasks, error: allTasksError } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', scheduleId)
        .eq('status', 'pending')
        .gte('task_date', today.toISOString().split('T')[0])
        .lte('task_date', examDate.toISOString().split('T')[0])
        .order('task_date', { ascending: true });

      if (allTasksError) {
        console.error('Error fetching tasks for replacement:', allTasksError);
        return;
      }

      if (allTasks && allTasks.length > 0) {
        // Find lowest priority task that's not a mistake revision
        const lowPriorityTasks = allTasks
          .filter((t: any) => 
            t.priority === 'low' && 
            t.task_type !== 'revise_mistake' &&
            t.id !== task.id // Don't replace the same task
          );

        if (lowPriorityTasks.length > 0) {
          // Get the furthest low-priority task
          const lowestPriorityTask = lowPriorityTasks[lowPriorityTasks.length - 1];

          // Delete the lowest priority task
          const { error: deleteError } = await supabase
            .from('schedule_tasks')
            .delete()
            .eq('id', lowestPriorityTask.id);

          if (deleteError) {
            console.error('Error deleting low-priority task:', deleteError);
            return;
          }

          // Add the rescheduled task in its place
          const { error: insertError } = await supabase
            .from('schedule_tasks')
            .insert({
              schedule_id: scheduleId,
              task_date: lowestPriorityTask.task_date,
              task_type: 'revise_mistake',
              task_name: `Revise: ${task.task_name}`,
              project_id: task.project_id,
              project_name: task.project_name,
              priority: 'high',
              lesson_reference: task.lesson_reference,
              status: 'pending'
            });

          if (!insertError) {
            console.log(`Replaced low-priority task on ${lowestPriorityTask.task_date}`);
          } else {
            console.error('Error inserting replacement task:', insertError);
          }
        } else {
          console.log('No low-priority tasks available to replace');
        }
      }
    }
  } catch (error) {
    console.error('Error in rescheduleTask:', error);
  }
}