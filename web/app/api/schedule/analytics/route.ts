// app/api/schedule/analytics/route.ts
// Schedule analytics: Exam Readiness Score, Burn-down chart data, etc.
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get schedule
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

    // Get all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('task_date', { ascending: true });

    if (tasksError) {
      throw new Error('Failed to fetch tasks');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(schedule.exam_date);
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate analytics
    const analytics = calculateAnalytics(tasks || [], schedule, today, daysUntilExam);

    return NextResponse.json({
      scheduleId,
      examDate: schedule.exam_date,
      daysUntilExam,
      ...analytics
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateAnalytics(tasks: any[], schedule: any, today: Date, daysUntilExam: number) {
  const todayStr = today.toISOString().split('T')[0];

  // Task counts
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'understood').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const needWorkTasks = tasks.filter(t => t.status === 'need_work').length;

  // Time-based calculations
  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0);
  const completedMinutes = tasks
    .filter(t => t.status === 'understood')
    .reduce((sum, t) => sum + (t.actual_minutes || t.estimated_minutes || 30), 0);
  const remainingMinutes = totalEstimatedMinutes - completedMinutes;

  // Overdue tasks
  const overdueTasks = tasks.filter(
    t => t.status === 'pending' && t.task_date < todayStr
  );

  // Today's tasks
  const todaysTasks = tasks.filter(t => t.task_date === todayStr);
  const todaysCompleted = todaysTasks.filter(t => t.status === 'understood').length;
  const todaysTotal = todaysTasks.length;

  // Priority breakdown
  const byPriority = {
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low')
  };

  const completedByPriority = {
    high: byPriority.high.filter(t => t.status === 'understood').length,
    medium: byPriority.medium.filter(t => t.status === 'understood').length,
    low: byPriority.low.filter(t => t.status === 'understood').length
  };

  // Calculate Exam Readiness Score (0-100)
  const readinessScore = calculateReadinessScore(
    tasks,
    completedTasks,
    totalTasks,
    daysUntilExam,
    overdueTasks.length,
    completedByPriority,
    byPriority
  );

  // Generate burn-down data
  const burnDownData = generateBurnDownData(tasks, schedule.created_at, schedule.exam_date, today);

  // Streak calculation
  const streak = calculateStreak(tasks, todayStr);

  // SM-2 statistics
  const sm2Stats = calculateSM2Stats(tasks);

  return {
    readinessScore,
    progress: {
      completed: completedTasks,
      pending: pendingTasks,
      needWork: needWorkTasks,
      total: totalTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    time: {
      totalEstimatedMinutes,
      completedMinutes,
      remainingMinutes,
      averageMinutesPerDay: daysUntilExam > 0 ? Math.round(remainingMinutes / daysUntilExam) : remainingMinutes
    },
    today: {
      completed: todaysCompleted,
      total: todaysTotal,
      tasks: todaysTasks.map(t => ({
        id: t.id,
        name: t.task_name,
        type: t.task_type,
        status: t.status,
        priority: t.priority,
        estimatedMinutes: t.estimated_minutes
      }))
    },
    overdue: {
      count: overdueTasks.length,
      tasks: overdueTasks.map(t => ({
        id: t.id,
        name: t.task_name,
        date: t.task_date,
        priority: t.priority
      }))
    },
    priority: {
      high: { total: byPriority.high.length, completed: completedByPriority.high },
      medium: { total: byPriority.medium.length, completed: completedByPriority.medium },
      low: { total: byPriority.low.length, completed: completedByPriority.low }
    },
    burnDown: burnDownData,
    streak,
    sm2: sm2Stats
  };
}

function calculateReadinessScore(
  tasks: any[],
  completedTasks: number,
  totalTasks: number,
  daysUntilExam: number,
  overdueTasks: number,
  completedByPriority: { high: number; medium: number; low: number },
  byPriority: { high: any[]; medium: any[]; low: any[] }
): { score: number; label: string; color: string; breakdown: any } {
  if (totalTasks === 0) {
    return { score: 0, label: 'No tasks', color: 'gray', breakdown: {} };
  }

  // Component scores (each 0-100)
  const components = {
    // 1. Overall completion (30% weight)
    completion: (completedTasks / totalTasks) * 100,
    
    // 2. High priority completion (25% weight)
    highPriority: byPriority.high.length > 0 
      ? (completedByPriority.high / byPriority.high.length) * 100 
      : 100,
    
    // 3. Schedule adherence - penalize overdue (20% weight)
    adherence: Math.max(0, 100 - (overdueTasks * 15)), // -15 points per overdue
    
    // 4. Time remaining comfort (15% weight)
    timeComfort: calculateTimeComfortScore(daysUntilExam, completedTasks, totalTasks),
    
    // 5. Consistency (10% weight) - based on tasks completed on time
    consistency: calculateConsistencyScore(tasks)
  };

  // Calculate weighted average
  const weights = {
    completion: 0.30,
    highPriority: 0.25,
    adherence: 0.20,
    timeComfort: 0.15,
    consistency: 0.10
  };

  const weightedScore = 
    components.completion * weights.completion +
    components.highPriority * weights.highPriority +
    components.adherence * weights.adherence +
    components.timeComfort * weights.timeComfort +
    components.consistency * weights.consistency;

  const score = Math.round(Math.min(100, Math.max(0, weightedScore)));

  // Determine label and color
  let label: string;
  let color: string;

  if (score >= 85) {
    label = 'Excellent';
    color = '#22c55e'; // green
  } else if (score >= 70) {
    label = 'Good';
    color = '#84cc16'; // lime
  } else if (score >= 50) {
    label = 'On Track';
    color = '#eab308'; // yellow
  } else if (score >= 30) {
    label = 'Needs Attention';
    color = '#f97316'; // orange
  } else {
    label = 'Critical';
    color = '#ef4444'; // red
  }

  return {
    score,
    label,
    color,
    breakdown: {
      completion: Math.round(components.completion),
      highPriority: Math.round(components.highPriority),
      adherence: Math.round(components.adherence),
      timeComfort: Math.round(components.timeComfort),
      consistency: Math.round(components.consistency)
    }
  };
}

function calculateTimeComfortScore(daysUntilExam: number, completed: number, total: number): number {
  if (total === 0) return 100;
  
  const remaining = total - completed;
  const avgTasksPerDay = daysUntilExam > 0 ? remaining / daysUntilExam : remaining;
  
  // Comfortable: 2-3 tasks/day, uncomfortable: >5
  if (avgTasksPerDay <= 2) return 100;
  if (avgTasksPerDay <= 3) return 85;
  if (avgTasksPerDay <= 4) return 65;
  if (avgTasksPerDay <= 5) return 45;
  return Math.max(0, 30 - (avgTasksPerDay - 5) * 5);
}

function calculateConsistencyScore(tasks: any[]): number {
  // Group tasks by date
  const byDate = new Map<string, { completed: number; total: number }>();
  
  tasks.forEach(task => {
    const date = task.task_date;
    if (!byDate.has(date)) {
      byDate.set(date, { completed: 0, total: 0 });
    }
    const entry = byDate.get(date)!;
    entry.total++;
    if (task.status === 'understood') {
      entry.completed++;
    }
  });

  // Calculate days with 100% completion
  let perfectDays = 0;
  let pastDays = 0;
  const today = new Date().toISOString().split('T')[0];

  byDate.forEach((entry, date) => {
    if (date <= today && entry.total > 0) {
      pastDays++;
      if (entry.completed === entry.total) {
        perfectDays++;
      }
    }
  });

  return pastDays > 0 ? (perfectDays / pastDays) * 100 : 100;
}

function generateBurnDownData(tasks: any[], createdAt: string, examDate: string, today: Date) {
  const startDate = new Date(createdAt);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(examDate);
  endDate.setHours(23, 59, 59, 999);

  const totalTasks = tasks.length;
  const data: Array<{
    date: string;
    ideal: number;
    actual: number | null;
    completed: number;
  }> = [];

  // Calculate ideal burn-down line
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const dailyDecrement = totalTasks / totalDays;

  // Get completion dates for actual line
  const completedByDate = new Map<string, number>();
  tasks.forEach(task => {
    if (task.status === 'understood' && task.updated_at) {
      const completedDate = new Date(task.updated_at).toISOString().split('T')[0];
      completedByDate.set(completedDate, (completedByDate.get(completedDate) || 0) + 1);
    }
  });

  // Generate data points
  let currentDate = new Date(startDate);
  let idealRemaining = totalTasks;
  let actualCompleted = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayIndex = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    idealRemaining = Math.max(0, totalTasks - (dailyDecrement * dayIndex));
    actualCompleted += completedByDate.get(dateStr) || 0;
    
    data.push({
      date: dateStr,
      ideal: Math.round(idealRemaining),
      actual: currentDate <= today ? totalTasks - actualCompleted : null,
      completed: actualCompleted
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
}

function calculateStreak(tasks: any[], todayStr: string): { current: number; longest: number } {
  // Get unique dates with completed tasks
  const completedDates = new Set<string>();
  tasks.forEach(task => {
    if (task.status === 'understood') {
      completedDates.add(task.task_date);
    }
  });

  // Calculate current streak (consecutive days ending today or yesterday)
  let currentStreak = 0;
  let checkDate = new Date(todayStr);
  
  while (completedDates.has(checkDate.toISOString().split('T')[0])) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Check if streak includes yesterday but not today
  if (currentStreak === 0) {
    checkDate = new Date(todayStr);
    checkDate.setDate(checkDate.getDate() - 1);
    while (completedDates.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: longestStreak
  };
}

function calculateSM2Stats(tasks: any[]) {
  const reviewedTasks = tasks.filter(t => t.repetition_number > 0);
  
  if (reviewedTasks.length === 0) {
    return {
      avgEasinessFactor: 2.5,
      totalReviews: 0,
      masteredCount: 0,
      learningCount: 0
    };
  }

  const totalEF = reviewedTasks.reduce((sum, t) => sum + (t.easiness_factor || 2.5), 0);
  const avgEF = totalEF / reviewedTasks.length;

  // Mastered: EF >= 2.5 and repetition >= 3
  const masteredCount = reviewedTasks.filter(
    t => (t.easiness_factor || 2.5) >= 2.5 && t.repetition_number >= 3
  ).length;

  // Still learning: repetition < 3 or EF < 2.5
  const learningCount = reviewedTasks.length - masteredCount;

  return {
    avgEasinessFactor: Math.round(avgEF * 100) / 100,
    totalReviews: reviewedTasks.length,
    masteredCount,
    learningCount
  };
}
