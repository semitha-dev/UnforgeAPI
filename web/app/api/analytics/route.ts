// app/api/analytics/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // 1. Get quiz attempts with scores
    // Note: completed_at is auto-generated timestamp when record is inserted
    const { data: quizAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id);

    if (attemptsError) {
      console.error('Error fetching quiz attempts:', attemptsError);
    }
    
    // Sort by most recent first - try completed_at first, fallback to created_at
    const sortedAttempts = (quizAttempts || []).sort((a: any, b: any) => {
      const dateA = new Date(a.completed_at || a.created_at || 0);
      const dateB = new Date(b.completed_at || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log('[Analytics] Quiz attempts found:', sortedAttempts.length);
    if (sortedAttempts.length > 0) {
      console.log('[Analytics] First attempt keys:', Object.keys(sortedAttempts[0]));
      console.log('[Analytics] First attempt:', JSON.stringify(sortedAttempts[0], null, 2));
    }

    // 1b. Get quizzes created by user
    let quizzesCreatedQuery = supabase
      .from('quizzes')
      .select('id, title, project_id, created_at')
      .eq('user_id', user.id);
    
    if (projectId) {
      quizzesCreatedQuery = quizzesCreatedQuery.eq('project_id', projectId);
    }
    
    const { data: quizzesCreated, error: quizzesCreatedError } = await quizzesCreatedQuery;
    
    if (quizzesCreatedError) {
      console.error('Error fetching quizzes created:', quizzesCreatedError);
    }
    
    const totalQuizzesCreated = quizzesCreated?.length || 0;

    // Get quiz details separately
    const quizIds = [...new Set((quizAttempts || []).map((a: any) => a.quiz_id))];
    let quizzesMap: Record<string, any> = {};
    
    if (quizIds.length > 0) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, project_id')
        .in('id', quizIds);
      
      if (quizzes) {
        quizzes.forEach((q: any) => {
          quizzesMap[q.id] = q;
        });
      }
    }

    // Get project names for quizzes
    const quizProjectIds = [...new Set(Object.values(quizzesMap).map((q: any) => q.project_id).filter(Boolean))];
    let projectsMap: Record<string, string> = {};
    
    if (quizProjectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', quizProjectIds);
      
      if (projects) {
        projects.forEach((p: any) => {
          projectsMap[p.id] = p.name;
        });
      }
    }

    // Map attempts with quiz and project info
    let filteredAttempts = sortedAttempts.map((a: any) => ({
      ...a,
      quiz: quizzesMap[a.quiz_id] || null,
      projectName: quizzesMap[a.quiz_id] ? projectsMap[quizzesMap[a.quiz_id].project_id] : null,
      // Normalize date field - use completed_at if available, fallback to created_at
      attemptDate: a.completed_at || a.created_at
    }));
    
    if (projectId) {
      filteredAttempts = filteredAttempts.filter((a: any) => 
        a.quiz?.project_id === projectId
      );
    }

    // 2. Get quiz mistakes (subjects needing improvement)
    const { data: mistakes, error: mistakesError } = await supabase
      .from('quiz_mistakes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (mistakesError) {
      console.error('Error fetching mistakes:', mistakesError);
    }

    // Get project names for mistakes
    const mistakeProjectIds = [...new Set((mistakes || []).map((m: any) => m.project_id).filter(Boolean))];
    if (mistakeProjectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', mistakeProjectIds);
      
      if (projects) {
        projects.forEach((p: any) => {
          if (!projectsMap[p.id]) {
            projectsMap[p.id] = p.name;
          }
        });
      }
    }

    let filteredMistakes = mistakes || [];
    if (projectId) {
      filteredMistakes = filteredMistakes.filter((m: any) => m.project_id === projectId);
    }

    // 3. Get schedule and tasks
    const { data: schedule } = await supabase
      .from('schedules')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let allTasks: any[] = [];
    if (schedule) {
      const { data: tasks } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', schedule.id);
      allTasks = tasks || [];
    }

    if (projectId) {
      allTasks = allTasks.filter((t: any) => t.project_id === projectId);
    }

    // 4. Get flashcard progress - Note: flashcards table doesn't have status column
    // Get flashcard sets and cards count instead
    const { data: flashcardSets } = await supabase
      .from('flashcard_sets')
      .select('id, card_count, project_id')
      .eq('user_id', user.id);

    let filteredFlashcardSets = flashcardSets || [];
    if (projectId) {
      filteredFlashcardSets = filteredFlashcardSets.filter((f: any) => f.project_id === projectId);
    }
    
    // Count total flashcards from sets
    const totalFlashcardSets = filteredFlashcardSets.length;
    const totalFlashcards = filteredFlashcardSets.reduce((sum: number, set: any) => sum + (set.card_count || 0), 0);

    // 5. Calculate analytics

    // Quiz Performance
    const totalQuizAttempts = filteredAttempts.length;
    const totalQuestionsAnswered = filteredAttempts.reduce((sum: number, a: any) => sum + (a.total_questions || 0), 0);
    const totalCorrect = filteredAttempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0);
    const totalWrong = totalQuestionsAnswered - totalCorrect;
    const averageScore = totalQuestionsAnswered > 0 
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) 
      : 0;
    
    console.log('[Analytics] Quiz stats:', { totalQuizAttempts, totalQuestionsAnswered, totalCorrect, totalWrong });

    // Recent quiz performance (last 5)
    const recentQuizzes = filteredAttempts.slice(0, 5).map((a: any) => ({
      id: a.id,
      quizTitle: a.quiz?.title || 'Unknown Quiz',
      projectName: a.projectName || 'Unknown Project',
      score: a.score,
      totalQuestions: a.total_questions,
      percentage: a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0,
      date: a.attemptDate  // Use normalized date field
    }));
    
    console.log('[Analytics] Recent quizzes:', recentQuizzes);

    // Subjects needing improvement (group mistakes by project)
    const mistakesByProject = new Map<string, { 
      projectId: string;
      projectName: string;
      totalMistakes: number;
      pendingMistakes: number;
      topics: string[];
    }>();

    filteredMistakes.forEach((m: any) => {
      const key = m.project_id || 'unknown';
      if (!mistakesByProject.has(key)) {
        mistakesByProject.set(key, {
          projectId: m.project_id,
          projectName: projectsMap[m.project_id] || 'Unknown',
          totalMistakes: 0,
          pendingMistakes: 0,
          topics: []
        });
      }
      const entry = mistakesByProject.get(key)!;
      entry.totalMistakes++;
      if (m.status === 'pending') {
        entry.pendingMistakes++;
      }
      if (m.topic && !entry.topics.includes(m.topic)) {
        entry.topics.push(m.topic);
      }
    });

    const subjectsNeedingImprovement = Array.from(mistakesByProject.values())
      .sort((a, b) => b.pendingMistakes - a.pendingMistakes)
      .slice(0, 5);

    // Schedule completion stats
    const completedTasks = allTasks.filter((t: any) => t.status === 'understood').length;
    const pendingTasks = allTasks.filter((t: any) => t.status === 'pending').length;
    const needWorkTasks = allTasks.filter((t: any) => t.status === 'need_work').length;
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Task breakdown by type
    const tasksByType = {
      lesson: allTasks.filter((t: any) => t.task_type === 'lesson').length,
      flashcard: allTasks.filter((t: any) => t.task_type === 'flashcard').length,
      qa: allTasks.filter((t: any) => t.task_type === 'qa').length,
      revision: allTasks.filter((t: any) => t.task_type === 'revision').length,
      revise_mistake: allTasks.filter((t: any) => t.task_type === 'revise_mistake').length
    };

    // Flashcard stats - simplified since we don't track individual card progress
    // Just show total cards and sets
    console.log('[Analytics] Flashcard sets:', totalFlashcardSets, 'Total cards:', totalFlashcards);

    // Study streak (days with activity in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDays = new Set<string>();
    
    // Add quiz attempt dates - use normalized attemptDate field
    filteredAttempts.forEach((a: any) => {
      const dateField = a.attemptDate;
      if (dateField) {
        const date = new Date(dateField).toISOString().split('T')[0];
        if (new Date(date) >= thirtyDaysAgo) {
          activeDays.add(date);
        }
      }
    });
    
    // Add task completion dates
    allTasks.forEach((t: any) => {
      if (t.status === 'understood') {
        const date = t.task_date;
        if (new Date(date) >= thirtyDaysAgo) {
          activeDays.add(date);
        }
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    while (activeDays.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Weekly activity (last 7 days)
    const weeklyActivity: { date: string; quizzes: number; tasks: number }[] = [];
    
    console.log('[Analytics] Filtered attempts for weekly:', filteredAttempts.map((a: any) => ({
      id: a.id,
      attemptDate: a.attemptDate,
      score: a.score
    })));
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Use normalized attemptDate field
      const dayQuizzes = filteredAttempts.filter((a: any) => {
        if (!a.attemptDate) return false;
        const attemptDateStr = new Date(a.attemptDate).toISOString().split('T')[0];
        return attemptDateStr === dateStr;
      }).length;
      
      const dayTasks = allTasks.filter((t: any) => 
        t.task_date === dateStr && t.status === 'understood'
      ).length;
      
      weeklyActivity.push({
        date: dateStr,
        quizzes: dayQuizzes,
        tasks: dayTasks
      });
    }

    console.log('[Analytics] Weekly activity:', weeklyActivity);

    return NextResponse.json({
      overview: {
        totalQuizzes: totalQuizzesCreated,
        totalQuizAttempts,
        averageScore,
        totalQuestionsAnswered,
        totalCorrect,
        totalWrong,  // Added: mistakes from quiz attempts
        currentStreak,
        activeDaysLast30: activeDays.size
      },
      quizPerformance: {
        recentQuizzes,
        totalAttempts: totalQuizAttempts,
        totalCorrect,
        totalWrong
      },
      subjectsNeedingImprovement,
      scheduleProgress: {
        totalTasks,
        completedTasks,
        pendingTasks,
        needWorkTasks,
        completionRate,
        tasksByType,
        hasSchedule: !!schedule  // Added to know if user has a schedule
      },
      flashcardProgress: {
        total: totalFlashcards,
        sets: totalFlashcardSets,
        mastered: 0,  // Not tracked in current schema
        learning: 0,  // Not tracked in current schema
        new: totalFlashcards  // Assume all are new since we don't track
      },
      weeklyActivity
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
