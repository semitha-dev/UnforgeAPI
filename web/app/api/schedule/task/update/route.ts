// app/api/schedule/task/update/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// SM-2 Algorithm quality ratings
type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;
// 0-2: "Again" (Failed) - Reset repetition
// 3: "Hard" - Correct with difficulty
// 4: "Good" - Correct
// 5: "Easy" - Perfect recall

interface SM2Result {
  easinessFactor: number;
  repetitionNumber: number;
  intervalDays: number;
  nextReviewDate: Date;
}

// Calculate SM-2 algorithm results
function calculateSM2(
  currentEF: number,
  currentRep: number,
  currentInterval: number,
  quality: SM2Quality
): SM2Result {
  let newEF = currentEF;
  let newRep = currentRep;
  let newInterval = currentInterval;

  // Update easiness factor
  newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Clamp EF to minimum 1.3
  if (newEF < 1.3) newEF = 1.3;

  if (quality < 3) {
    // Failed - reset repetition count
    newRep = 0;
    newInterval = 1;
  } else {
    // Passed
    newRep = currentRep + 1;
    
    if (newRep === 1) {
      newInterval = 1;
    } else if (newRep === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEF);
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easinessFactor: Math.round(newEF * 100) / 100,
    repetitionNumber: newRep,
    intervalDays: newInterval,
    nextReviewDate
  };
}

// Map user-friendly quality to SM-2 numeric quality
function mapQualityToSM2(feedback: string): SM2Quality {
  switch (feedback) {
    case 'again':
    case 'hard':
      return 3; // Correct but difficult
    case 'good':
    case 'understood':
      return 4; // Correct
    case 'easy':
      return 5; // Perfect
    case 'need_work':
    case 'forgot':
      return 1; // Failed
    default:
      return 4; // Default to "good"
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      taskId, 
      status, 
      scheduleId, 
      isReset,
      feedback,        // New: SM-2 quality feedback (easy/good/hard/again)
      actualMinutes    // New: actual time spent on task
    } = body;

    if (!taskId || !status || !scheduleId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['understood', 'need_work', 'pending'].includes(status)) {
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

    // Get current task to access SM-2 fields
    const { data: currentTask, error: fetchError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add actual minutes if provided
    if (actualMinutes !== undefined) {
      updateData.actual_minutes = actualMinutes;
    }

    // Calculate SM-2 if feedback provided and marking as understood
    let sm2Result: SM2Result | null = null;
    if (feedback && status === 'understood') {
      const quality = mapQualityToSM2(feedback);
      sm2Result = calculateSM2(
        currentTask.easiness_factor || 2.5,
        currentTask.repetition_number || 0,
        currentTask.interval_days || 1,
        quality
      );

      updateData.easiness_factor = sm2Result.easinessFactor;
      updateData.repetition_number = sm2Result.repetitionNumber;
      updateData.interval_days = sm2Result.intervalDays;
      updateData.last_review_quality = quality;
      updateData.next_review_date = sm2Result.nextReviewDate.toISOString().split('T')[0];
    }

    // Update task status
    const { data: task, error: updateError } = await supabase
      .from('schedule_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      throw new Error('Failed to update task status');
    }

    // If marked as "need_work", reschedule it (only if not resetting)
    if (status === 'need_work' && !isReset) {
      await rescheduleTask(supabase, task, scheduleId, user.id);
    }

    // If SM-2 calculated and needs future review, schedule it
    if (sm2Result && status === 'understood' && feedback !== 'easy') {
      await scheduleNextReview(supabase, task, schedule, sm2Result);
    }

    return NextResponse.json({ 
      success: true,
      message: status === 'pending' 
        ? 'Task status reset'
        : status === 'need_work' 
          ? 'Task marked as need work and rescheduled' 
          : 'Task marked as understood',
      sm2Result: sm2Result ? {
        nextReviewDate: sm2Result.nextReviewDate.toISOString().split('T')[0],
        intervalDays: sm2Result.intervalDays,
        easinessFactor: sm2Result.easinessFactor
      } : null
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// Schedule next review based on SM-2 calculation
async function scheduleNextReview(
  supabase: any,
  task: any,
  schedule: any,
  sm2Result: SM2Result
) {
  try {
    const examDate = new Date(schedule.exam_date);
    const nextReviewDate = sm2Result.nextReviewDate;
    
    // Only schedule if before exam date
    if (nextReviewDate >= examDate) {
      console.log('Next review is after exam date, skipping');
      return;
    }

    // Check if there's already a future review for this lesson
    const { data: existingReview, error: checkError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', schedule.id)
      .eq('lesson_reference', task.lesson_reference)
      .eq('status', 'pending')
      .gt('task_date', task.task_date)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing review:', checkError);
      return;
    }

    // If already scheduled, update its date instead
    if (existingReview) {
      await supabase
        .from('schedule_tasks')
        .update({ 
          task_date: nextReviewDate.toISOString().split('T')[0],
          easiness_factor: sm2Result.easinessFactor,
          interval_days: sm2Result.intervalDays
        })
        .eq('id', existingReview.id);
      return;
    }

    // Create new review task
    await supabase
      .from('schedule_tasks')
      .insert({
        schedule_id: schedule.id,
        task_date: nextReviewDate.toISOString().split('T')[0],
        task_type: 'flashcard',
        task_name: `Review: ${task.task_name.replace('Review: ', '')}`,
        project_id: task.project_id,
        project_name: task.project_name,
        priority: task.priority,
        lesson_reference: task.lesson_reference,
        status: 'pending',
        estimated_minutes: 15,
        easiness_factor: sm2Result.easinessFactor,
        repetition_number: sm2Result.repetitionNumber,
        interval_days: sm2Result.intervalDays
      });

    console.log(`Scheduled next review for ${nextReviewDate.toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('Error scheduling next review:', error);
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