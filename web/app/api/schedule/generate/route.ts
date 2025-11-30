// app/api/schedule/generate/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserSubscription, hasActiveAccess, LIMITS, SubscriptionProfile, getEffectiveTier } from '@/lib/subscription';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Lesson {
  name: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProjectSelection {
  projectId: string;
  projectName: string;
  lessons: Lesson[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      examDate,
      difficulty,
      preferredDays,
      preferredTime,
      projects,
      isEdit,
      existingScheduleId
    } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check subscription for schedule access (premium feature)
    const subscription = await getUserSubscription(user.id);
    const effectiveTier = getEffectiveTier(subscription as SubscriptionProfile);
    const tierLimits = LIMITS[effectiveTier];
    
    if (!tierLimits.schedule) {
      return NextResponse.json(
        { error: 'Schedule feature requires Pro or Premium subscription. Please upgrade to access this feature.' },
        { status: 403 }
      );
    }

    // Validate inputs
    if (!examDate || !difficulty || !preferredDays || !preferredTime || !projects) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let scheduleId = existingScheduleId;

    // Create or get existing schedule
    if (!isEdit) {
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          user_id: user.id,
          exam_date: examDate,
          difficulty,
          preferred_days: preferredDays,
          preferred_time: preferredTime
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;
      scheduleId = schedule.id;
    }

    // Generate schedule using Gemini
    const scheduleTasks = await generateScheduleWithGemini(
      examDate,
      difficulty,
      preferredDays,
      preferredTime,
      projects,
      isEdit
    );

    // Insert tasks into database
    const tasksToInsert = scheduleTasks.map(task => ({
      schedule_id: scheduleId,
      task_date: task.date,
      task_type: task.type,
      task_name: task.name,
      project_id: task.projectId,
      project_name: task.projectName,
      priority: task.priority,
      lesson_reference: task.lessonReference,
      status: 'pending'
    }));

    const { error: tasksError } = await supabase
      .from('schedule_tasks')
      .insert(tasksToInsert);

    if (tasksError) {
      console.error('Error inserting tasks:', tasksError);
      throw new Error('Failed to create schedule tasks');
    }

    return NextResponse.json({ success: true, scheduleId }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}

async function generateScheduleWithGemini(
  examDate: string,
  difficulty: string,
  preferredDays: number[],
  preferredTime: string,
  projects: ProjectSelection[],
  isEdit: boolean
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  
  const daysUntilExam = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const hoursPerDay = difficulty === 'low' ? 1 : difficulty === 'medium' ? 2 : 4;

  // Calculate priority weights
  const priorityWeights = { high: 3, medium: 2, low: 1 };
  let totalWeight = 0;
  const allLessons: Array<{ project: ProjectSelection; lesson: Lesson }> = [];

  projects.forEach(project => {
    project.lessons.forEach(lesson => {
      allLessons.push({ project, lesson });
      totalWeight += priorityWeights[lesson.priority];
    });
  });

  // Generate schedule
  const tasks: Array<{
    date: string;
    type: string;
    name: string;
    projectId: string;
    projectName: string;
    priority: string;
    lessonReference: string;
  }> = [];

  let currentDate = new Date(today);
  let lessonIndex = 0;
  let weekTasksAdded = 0;

  // Sort lessons by priority
  allLessons.sort((a, b) => {
    const aWeight = priorityWeights[a.lesson.priority];
    const bWeight = priorityWeights[b.lesson.priority];
    return bWeight - aWeight;
  });

  while (currentDate <= exam && lessonIndex < allLessons.length) {
    const dayOfWeek = currentDate.getDay();

    // Check if this is a preferred study day
    if (preferredDays.includes(dayOfWeek)) {
      // Check if it's Sunday - add revision day
      if (dayOfWeek === 0 && weekTasksAdded > 0) {
        tasks.push({
          date: currentDate.toISOString().split('T')[0],
          type: 'revision',
          name: 'Weekly Revision',
          projectId: '',
          projectName: 'All Subjects',
          priority: 'high',
          lessonReference: 'week_review'
        });

        // Add flashcard and QA tasks for previous lessons
        const recentLessons = allLessons.slice(Math.max(0, lessonIndex - 5), lessonIndex);
        recentLessons.forEach((item, idx) => {
          if (idx < 3) {
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            
            if (nextDate <= exam) {
              tasks.push({
                date: nextDate.toISOString().split('T')[0],
                type: 'flashcard',
                name: `Flashcards: ${item.lesson.name}`,
                projectId: item.project.projectId,
                projectName: item.project.projectName,
                priority: item.lesson.priority,
                lessonReference: item.lesson.name
              });

              const qaDate = new Date(nextDate);
              qaDate.setDate(qaDate.getDate() + 1);
              
              if (qaDate <= exam) {
                tasks.push({
                  date: qaDate.toISOString().split('T')[0],
                  type: 'qa',
                  name: `QA: ${item.lesson.name}`,
                  projectId: item.project.projectId,
                  projectName: item.project.projectName,
                  priority: item.lesson.priority,
                  lessonReference: item.lesson.name
                });
              }
            }
          }
        });

        weekTasksAdded = 0;
      } else if (dayOfWeek !== 0) {
        // Add regular lesson
        const { project, lesson } = allLessons[lessonIndex];
        
        tasks.push({
          date: currentDate.toISOString().split('T')[0],
          type: 'lesson',
          name: lesson.name,
          projectId: project.projectId,
          projectName: project.projectName,
          priority: lesson.priority,
          lessonReference: lesson.name
        });

        lessonIndex++;
        weekTasksAdded++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return tasks;
}