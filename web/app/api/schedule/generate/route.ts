// app/api/schedule/generate/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

interface Lesson {
  name: string;
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes?: number; // New: time boxing
}

interface ProjectSelection {
  projectId: string;
  projectName: string;
  lessons: Lesson[];
}

// Difficulty to daily study minutes mapping
const DIFFICULTY_MINUTES: Record<string, number> = {
  low: 60,      // 1 hour/day
  medium: 120,  // 2 hours/day
  high: 180     // 3 hours/day
};

// Default task durations by type
const DEFAULT_TASK_MINUTES: Record<string, number> = {
  lesson: 30,
  flashcard: 15,
  qa: 20,
  revision: 45,
  revise_mistake: 20
};

export async function POST(request: NextRequest) {
  console.log('=== SCHEDULE GENERATION V2 START ===');
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const {
      examDate,
      difficulty,
      preferredDays,
      preferredTimes,
      projects,
      bufferDay = 0, // New: buffer day for catch-up (default Sunday)
      isEdit,
      existingScheduleId
    } = body;

    console.log('📋 Request body:', JSON.stringify({
      examDate,
      difficulty,
      preferredDays,
      preferredTimes,
      bufferDay,
      projectCount: projects?.length,
      projects: projects?.map((p: ProjectSelection) => ({
        id: p.projectId,
        name: p.projectName,
        lessonCount: p.lessons?.length,
        lessons: p.lessons
      })),
      isEdit,
      existingScheduleId
    }, null, 2));

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.id);

    // Validate inputs
    if (!examDate || !difficulty || !preferredDays || !preferredTimes || !projects) {
      console.log('❌ Missing required fields:', {
        hasExamDate: !!examDate,
        hasDifficulty: !!difficulty,
        hasPreferredDays: !!preferredDays,
        hasPreferredTimes: !!preferredTimes,
        hasProjects: !!projects
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dailyStudyMinutes = DIFFICULTY_MINUTES[difficulty] || 120;
    let scheduleId = existingScheduleId;

    // Create or get existing schedule
    if (!isEdit) {
      console.log('📝 Creating new schedule...');
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          user_id: user.id,
          exam_date: examDate,
          difficulty,
          preferred_days: preferredDays,
          preferred_times: preferredTimes,
          buffer_day: bufferDay,
          daily_study_minutes: dailyStudyMinutes
        })
        .select()
        .single();

      if (scheduleError) {
        console.log('❌ Schedule creation error:', scheduleError);
        throw scheduleError;
      }
      scheduleId = schedule.id;
      console.log('✅ Schedule created with ID:', scheduleId);
    }

    // Generate schedule using V2 algorithm with time-boxing
    console.log('🔄 Generating schedule tasks with time-boxing...');
    const scheduleTasks = generateScheduleV2(
      examDate,
      difficulty,
      preferredDays,
      preferredTimes,
      projects,
      bufferDay,
      dailyStudyMinutes,
      isEdit
    );
    console.log('📊 Generated tasks count:', scheduleTasks.length);
    console.log('📊 Generated tasks sample:', scheduleTasks.slice(0, 3));

    // Insert tasks into database with new fields
    const tasksToInsert = scheduleTasks
      .filter(task => task.projectId && task.projectId !== '')
      .map(task => ({
        schedule_id: scheduleId,
        task_date: task.date,
        task_type: task.type,
        task_name: task.name,
        project_id: task.projectId,
        project_name: task.projectName,
        priority: task.priority,
        lesson_reference: task.lessonReference,
        status: 'pending',
        // New V2 fields
        estimated_minutes: task.estimatedMinutes,
        easiness_factor: 2.5,
        repetition_number: 0,
        interval_days: 1,
        next_review_date: task.nextReviewDate || null
      }));

    console.log('📊 Tasks after filtering:', tasksToInsert.length);

    if (tasksToInsert.length === 0) {
      console.log('❌ No valid tasks to insert');
      return NextResponse.json({ error: 'No tasks could be generated' }, { status: 400 });
    }

    console.log('💾 Inserting tasks into database...');
    const { error: tasksError } = await supabase
      .from('schedule_tasks')
      .insert(tasksToInsert);

    if (tasksError) {
      console.error('❌ Error inserting tasks:', tasksError);
      throw new Error('Failed to create schedule tasks');
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.SCHEDULE_GENERATE,
      endpoint: '/api/schedule/generate',
      method: 'POST',
      tokens_used: 0,
      metadata: { 
        scheduleId, 
        taskCount: tasksToInsert.length, 
        projectCount: projects.length,
        difficulty,
        dailyStudyMinutes,
        bufferDay,
        examDate 
      },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 201,
      duration_ms: Date.now() - startTime,
    });

    console.log('✅ Schedule generation V2 complete!');
    return NextResponse.json({ success: true, scheduleId }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error generating schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}

// V2 Schedule Generation with Time-Boxing
function generateScheduleV2(
  examDate: string,
  difficulty: string,
  preferredDays: number[],
  preferredTimes: string[],
  projects: ProjectSelection[],
  bufferDay: number,
  dailyStudyMinutes: number,
  isEdit: boolean
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(23, 59, 59, 999);
  
  const daysUntilExam = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Collect all lessons with metadata and estimated duration
  const allLessons: Array<{ 
    project: ProjectSelection; 
    lesson: Lesson;
    weight: number;
    estimatedMinutes: number;
  }> = [];

  const priorityWeights = { high: 3, medium: 2, low: 1 };

  projects.forEach(project => {
    project.lessons.forEach(lesson => {
      allLessons.push({ 
        project, 
        lesson,
        weight: priorityWeights[lesson.priority],
        estimatedMinutes: lesson.estimatedMinutes || DEFAULT_TASK_MINUTES.lesson
      });
    });
  });

  // Sort by priority (high first)
  allLessons.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.project.projectName.localeCompare(b.project.projectName);
  });

  // Get all available study dates (excluding buffer days for regular scheduling)
  const studyDates: Date[] = [];
  const bufferDates: Date[] = [];
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + 1);
  
  while (currentDate < exam) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === bufferDay && bufferDay !== -1) {
      // This is a buffer day - keep it light
      bufferDates.push(new Date(currentDate));
    } else if (preferredDays.includes(dayOfWeek)) {
      studyDates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (studyDates.length === 0) {
    return [];
  }

  // Calculate phases
  const totalStudyDays = studyDates.length;
  const revisionDays = Math.max(2, Math.min(7, Math.floor(totalStudyDays * 0.2)));
  const learningDays = totalStudyDays - revisionDays;

  const tasks: Array<{
    date: string;
    type: string;
    name: string;
    projectId: string;
    projectName: string;
    priority: string;
    lessonReference: string;
    estimatedMinutes: number;
    nextReviewDate?: string;
  }> = [];

  // Track daily time budget
  const dayTimeUsed: Map<string, number> = new Map();
  
  const getDateKey = (date: Date) => date.toISOString().split('T')[0];
  
  const getRemainingTime = (date: Date) => {
    const key = getDateKey(date);
    const used = dayTimeUsed.get(key) || 0;
    // Buffer days get 30% of normal time
    const isBuffer = bufferDates.some(d => d.getTime() === date.getTime());
    const maxTime = isBuffer ? dailyStudyMinutes * 0.3 : dailyStudyMinutes;
    return maxTime - used;
  };

  const addTask = (date: Date, task: typeof tasks[0]): boolean => {
    const remaining = getRemainingTime(date);
    if (remaining >= task.estimatedMinutes) {
      const key = getDateKey(date);
      tasks.push({ ...task, date: key });
      dayTimeUsed.set(key, (dayTimeUsed.get(key) || 0) + task.estimatedMinutes);
      return true;
    }
    return false;
  };

  // Find next date with enough time
  const findNextSlot = (startDate: Date, maxDate: Date, requiredMinutes: number, includeBuffer = false): Date | null => {
    let checkDate = new Date(startDate);
    const datesToCheck = includeBuffer ? [...studyDates, ...bufferDates].sort((a, b) => a.getTime() - b.getTime()) : studyDates;
    
    for (const date of datesToCheck) {
      if (date >= checkDate && date <= maxDate) {
        if (getRemainingTime(date) >= requiredMinutes) {
          return date;
        }
      }
    }
    return null;
  };

  // Phase 1: Schedule initial learning of all lessons
  let lessonDateIndex = 0;
  const lessonScheduledDates: Map<number, Date> = new Map();
  
  for (let i = 0; i < allLessons.length; i++) {
    const { project, lesson, estimatedMinutes } = allLessons[i];
    
    const learningEndDate = studyDates[Math.min(learningDays - 1, studyDates.length - 1)];
    const startSearchDate = lessonDateIndex < studyDates.length ? studyDates[lessonDateIndex] : studyDates[0];
    const slotDate = findNextSlot(startSearchDate, learningEndDate, estimatedMinutes);
    
    if (slotDate) {
      addTask(slotDate, {
        date: '',
        type: 'lesson',
        name: lesson.name,
        projectId: project.projectId,
        projectName: project.projectName,
        priority: lesson.priority,
        lessonReference: lesson.name,
        estimatedMinutes
      });
      lessonScheduledDates.set(i, new Date(slotDate));
      
      // Move forward based on time used
      const idx = studyDates.findIndex(d => d >= slotDate);
      lessonDateIndex = idx + 1;
    }
  }

  // Phase 2: Add spaced repetition reviews (SM-2 initial intervals)
  // Initial review after 1 day, then calculated based on feedback
  lessonScheduledDates.forEach((learnDate, lessonIdx) => {
    const { project, lesson, estimatedMinutes } = allLessons[lessonIdx];
    const reviewMinutes = DEFAULT_TASK_MINUTES.flashcard;
    
    // First review after 1 day
    const firstReview = new Date(learnDate);
    firstReview.setDate(firstReview.getDate() + 1);
    
    const revisionStartDate = studyDates[studyDates.length - revisionDays];
    if (firstReview <= exam && firstReview < revisionStartDate) {
      // Try buffer day first, then regular days
      let slotDate = findNextSlot(firstReview, revisionStartDate, reviewMinutes, true);
      if (slotDate) {
        // Calculate next review date based on SM-2 (Good response assumed)
        const nextReview = new Date(slotDate);
        nextReview.setDate(nextReview.getDate() + 4); // SM-2: Good = 4 days
        
        addTask(slotDate, {
          date: '',
          type: 'flashcard',
          name: `Review: ${lesson.name}`,
          projectId: project.projectId,
          projectName: project.projectName,
          priority: lesson.priority,
          lessonReference: lesson.name,
          estimatedMinutes: reviewMinutes,
          nextReviewDate: nextReview <= exam ? getDateKey(nextReview) : undefined
        });
      }
    }
  });

  // Phase 3: Add Q&A practice sessions
  const qaMinutes = DEFAULT_TASK_MINUTES.qa;
  const qaInterval = Math.max(3, Math.floor(learningDays / Math.min(allLessons.length, 5)));
  let qaDateIndex = qaInterval;
  
  for (let i = 0; i < Math.min(allLessons.length, Math.floor(learningDays / qaInterval)); i++) {
    if (qaDateIndex < learningDays && qaDateIndex < studyDates.length) {
      const { project, lesson } = allLessons[i % allLessons.length];
      const qaDate = studyDates[qaDateIndex];
      
      const slotDate = findNextSlot(qaDate, studyDates[learningDays - 1] || qaDate, qaMinutes, true);
      if (slotDate) {
        addTask(slotDate, {
          date: '',
          type: 'qa',
          name: `Practice Q&A: ${lesson.name}`,
          projectId: project.projectId,
          projectName: project.projectName,
          priority: lesson.priority,
          lessonReference: lesson.name,
          estimatedMinutes: qaMinutes
        });
      }
      qaDateIndex += qaInterval;
    }
  }

  // Phase 4: Final revision period
  const revisionMinutes = DEFAULT_TASK_MINUTES.revision;
  const revisionStartIndex = studyDates.length - revisionDays;
  
  if (revisionStartIndex >= 0 && revisionStartIndex < studyDates.length) {
    // Group lessons by project
    const projectLessons = new Map<string, typeof allLessons>();
    allLessons.forEach(item => {
      const key = item.project.projectId;
      if (!projectLessons.has(key)) {
        projectLessons.set(key, []);
      }
      projectLessons.get(key)!.push(item);
    });

    let revisionDayIdx = revisionStartIndex;
    
    projectLessons.forEach((lessons, projectId) => {
      if (revisionDayIdx < studyDates.length) {
        const project = lessons[0].project;
        const slotDate = findNextSlot(studyDates[revisionDayIdx], exam, revisionMinutes);
        
        if (slotDate) {
          addTask(slotDate, {
            date: '',
            type: 'revision',
            name: `Full Review: ${project.projectName}`,
            projectId: project.projectId,
            projectName: project.projectName,
            priority: 'high',
            lessonReference: 'comprehensive_review',
            estimatedMinutes: revisionMinutes
          });
        }
        revisionDayIdx++;
      }
    });

    // Final day task
    const finalDayDate = studyDates[studyDates.length - 1];
    if (finalDayDate && allLessons.length > 0) {
      const firstProject = allLessons[0].project;
      addTask(finalDayDate, {
        date: '',
        type: 'revision',
        name: 'Final Review & Rest',
        projectId: firstProject.projectId,
        projectName: 'All Subjects',
        priority: 'high',
        lessonReference: 'final_review',
        estimatedMinutes: 30
      });
    }

    // Day before exam - quick high-priority reviews
    if (studyDates.length >= 2) {
      const dayBeforeExam = studyDates[studyDates.length - 2];
      if (dayBeforeExam) {
        const highPriorityLessons = allLessons.filter(l => l.lesson.priority === 'high').slice(0, 3);
        highPriorityLessons.forEach(item => {
          addTask(dayBeforeExam, {
            date: '',
            type: 'flashcard',
            name: `Quick Review: ${item.lesson.name}`,
            projectId: item.project.projectId,
            projectName: item.project.projectName,
            priority: 'high',
            lessonReference: item.lesson.name,
            estimatedMinutes: 10
          });
        });
      }
    }
  }

  // Sort tasks by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));

  return tasks;
}

// Legacy function for backwards compatibility
function generateSchedule(
  examDate: string,
  difficulty: string,
  preferredDays: number[],
  preferredTimes: string[],
  projects: ProjectSelection[],
  isEdit: boolean
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(23, 59, 59, 999);
  
  const daysUntilExam = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Sessions per day based on difficulty
  const sessionsPerDay = difficulty === 'low' ? 1 : difficulty === 'medium' ? 2 : 3;

  // Collect all lessons with metadata
  const allLessons: Array<{ 
    project: ProjectSelection; 
    lesson: Lesson;
    weight: number;
  }> = [];

  const priorityWeights = { high: 3, medium: 2, low: 1 };

  projects.forEach(project => {
    project.lessons.forEach(lesson => {
      allLessons.push({ 
        project, 
        lesson,
        weight: priorityWeights[lesson.priority]
      });
    });
  });

  // Sort by priority (high first), then by project name for grouping
  allLessons.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.project.projectName.localeCompare(b.project.projectName);
  });

  // Get all available study dates (excluding exam day - no study tasks on exam day)
  const studyDates: Date[] = [];
  let currentDate = new Date(today);
  currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow
  
  while (currentDate < exam) {
    if (preferredDays.includes(currentDate.getDay())) {
      studyDates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (studyDates.length === 0) {
    return [];
  }

  // Calculate how to distribute tasks
  const totalLessons = allLessons.length;
  const totalStudyDays = studyDates.length;
  
  // Reserve last 20% of time for final revision (minimum 2 days, maximum 7 days)
  const revisionDays = Math.max(2, Math.min(7, Math.floor(totalStudyDays * 0.2)));
  const learningDays = totalStudyDays - revisionDays;
  
  // Calculate spaced repetition intervals (in days)
  const spacedIntervals = [1, 3, 7]; // Review after 1 day, 3 days, 7 days

  const tasks: Array<{
    date: string;
    type: string;
    name: string;
    projectId: string;
    projectName: string;
    priority: string;
    lessonReference: string;
  }> = [];

  // Track what's scheduled on each day
  const daySchedule: Map<string, number> = new Map();
  
  const getDateKey = (date: Date) => date.toISOString().split('T')[0];
  const addTask = (date: Date, task: typeof tasks[0]) => {
    const key = getDateKey(date);
    const count = daySchedule.get(key) || 0;
    if (count < sessionsPerDay) {
      tasks.push({ ...task, date: key });
      daySchedule.set(key, count + 1);
      return true;
    }
    return false;
  };

  // Find next available slot on or after given date
  const findNextSlot = (startDate: Date, maxDate: Date): Date | null => {
    let checkDate = new Date(startDate);
    while (checkDate <= maxDate) {
      const key = getDateKey(checkDate);
      const count = daySchedule.get(key) || 0;
      if (preferredDays.includes(checkDate.getDay()) && count < sessionsPerDay) {
        return checkDate;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return null;
  };

  // Phase 1: Schedule initial learning of all lessons
  let lessonDateIndex = 0;
  const lessonScheduledDates: Map<number, Date> = new Map(); // Track when each lesson was taught
  
  for (let i = 0; i < allLessons.length; i++) {
    const { project, lesson, weight } = allLessons[i];
    
    // Find next available date for learning
    const learningEndDate = new Date(studyDates[Math.min(learningDays - 1, studyDates.length - 1)]);
    const slotDate = findNextSlot(
      lessonDateIndex < studyDates.length ? studyDates[lessonDateIndex] : studyDates[0],
      learningEndDate
    );
    
    if (slotDate) {
      addTask(slotDate, {
        date: '',
        type: 'lesson',
        name: lesson.name,
        projectId: project.projectId,
        projectName: project.projectName,
        priority: lesson.priority,
        lessonReference: lesson.name
      });
      lessonScheduledDates.set(i, new Date(slotDate));
      
      // Move to next day for next lesson (distribute evenly)
      const daysPerLesson = Math.max(1, Math.floor(learningDays / totalLessons));
      lessonDateIndex = Math.min(
        studyDates.findIndex(d => d >= slotDate) + daysPerLesson,
        studyDates.length - 1
      );
    }
  }

  // Phase 2: Add spaced repetition reviews (flashcards)
  lessonScheduledDates.forEach((learnDate, lessonIdx) => {
    const { project, lesson } = allLessons[lessonIdx];
    
    spacedIntervals.forEach(interval => {
      const reviewDate = new Date(learnDate);
      reviewDate.setDate(reviewDate.getDate() + interval);
      
      // Only add if before exam and not in final revision period
      const revisionStartDate = studyDates[studyDates.length - revisionDays];
      if (reviewDate <= exam && reviewDate < revisionStartDate) {
        const slotDate = findNextSlot(reviewDate, revisionStartDate);
        if (slotDate) {
          addTask(slotDate, {
            date: '',
            type: 'flashcard',
            name: `Review: ${lesson.name}`,
            projectId: project.projectId,
            projectName: project.projectName,
            priority: lesson.priority,
            lessonReference: lesson.name
          });
        }
      }
    });
  });

  // Phase 3: Add Q&A practice sessions (spread throughout)
  const qaInterval = Math.max(3, Math.floor(learningDays / Math.min(totalLessons, 5)));
  let qaDateIndex = qaInterval;
  
  for (let i = 0; i < Math.min(totalLessons, Math.floor(learningDays / qaInterval)); i++) {
    if (qaDateIndex < learningDays && qaDateIndex < studyDates.length) {
      const { project, lesson } = allLessons[i % allLessons.length];
      const qaDate = studyDates[qaDateIndex];
      
      const slotDate = findNextSlot(qaDate, studyDates[learningDays - 1] || qaDate);
      if (slotDate) {
        addTask(slotDate, {
          date: '',
          type: 'qa',
          name: `Practice Q&A: ${lesson.name}`,
          projectId: project.projectId,
          projectName: project.projectName,
          priority: lesson.priority,
          lessonReference: lesson.name
        });
      }
      qaDateIndex += qaInterval;
    }
  }

  // Phase 4: Final revision period - focus on high priority topics
  const revisionStartIndex = studyDates.length - revisionDays;
  if (revisionStartIndex >= 0 && revisionStartIndex < studyDates.length) {
    // Group lessons by project for organized revision
    const projectLessons = new Map<string, typeof allLessons>();
    allLessons.forEach(item => {
      const key = item.project.projectId;
      if (!projectLessons.has(key)) {
        projectLessons.set(key, []);
      }
      projectLessons.get(key)!.push(item);
    });

    let revisionDayIdx = revisionStartIndex;
    
    // Add comprehensive revision for each project
    projectLessons.forEach((lessons, projectId) => {
      if (revisionDayIdx < studyDates.length) {
        const project = lessons[0].project;
        const slotDate = findNextSlot(studyDates[revisionDayIdx], exam);
        
        if (slotDate) {
          addTask(slotDate, {
            date: '',
            type: 'revision',
            name: `Full Review: ${project.projectName}`,
            projectId: project.projectId,
            projectName: project.projectName,
            priority: 'high',
            lessonReference: 'comprehensive_review'
          });
        }
        revisionDayIdx++;
      }
    });

    // Add final day tasks - use first project as reference
    const finalDayDate = studyDates[studyDates.length - 1];
    if (finalDayDate && allLessons.length > 0) {
      const firstProject = allLessons[0].project;
      addTask(finalDayDate, {
        date: '',
        type: 'revision',
        name: 'Final Review & Rest',
        projectId: firstProject.projectId,
        projectName: 'All Subjects',
        priority: 'high',
        lessonReference: 'final_review'
      });
    }

    // Day before exam - light review
    if (studyDates.length >= 2) {
      const dayBeforeExam = studyDates[studyDates.length - 2];
      if (dayBeforeExam) {
        // Add high-priority topic quick reviews
        const highPriorityLessons = allLessons.filter(l => l.lesson.priority === 'high').slice(0, 3);
        highPriorityLessons.forEach(item => {
          addTask(dayBeforeExam, {
            date: '',
            type: 'flashcard',
            name: `Quick Review: ${item.lesson.name}`,
            projectId: item.project.projectId,
            projectName: item.project.projectName,
            priority: 'high',
            lessonReference: item.lesson.name
          });
        });
      }
    }
  }

  // Sort tasks by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));

  return tasks;
}