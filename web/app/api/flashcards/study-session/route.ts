// app/api/flashcards/study-session/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

// POST - Record a flashcard study event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { flashcardSetId, flashcardId, projectId, isCorrect, responseTimeMs, timezoneOffset } = body;

    if (!flashcardSetId) {
      return NextResponse.json({ error: 'flashcardSetId is required' }, { status: 400 });
    }

    // timezoneOffset is in minutes from UTC (e.g., -300 for EST, 330 for IST)
    // Browser sends: new Date().getTimezoneOffset() (positive means west of UTC)
    // We store it as-is so we can convert UTC back to local time later
    const { data, error } = await supabase
      .from('flashcard_study_sessions')
      .insert({
        user_id: user.id,
        flashcard_set_id: flashcardSetId,
        flashcard_id: flashcardId || null,
        project_id: projectId || null,
        is_correct: isCorrect ?? null,
        response_time_ms: responseTimeMs || null,
        timezone_offset: typeof timezoneOffset === 'number' ? timezoneOffset : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording study session:', error);
      return NextResponse.json({ error: 'Failed to record study session' }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: data }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in POST /api/flashcards/study-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get study session statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sessions, error } = await supabase
      .from('flashcard_study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('studied_at', startDate.toISOString())
      .order('studied_at', { ascending: false });

    if (error) {
      console.error('Error fetching study sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch study sessions' }, { status: 500 });
    }

    // Group by hour for biological rhythm analysis
    const hourlyStats: Record<number, { total: number; correct: number }> = {};
    
    sessions?.forEach(session => {
      const hour = session.hour_of_day;
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { total: 0, correct: 0 };
      }
      hourlyStats[hour].total++;
      if (session.is_correct) {
        hourlyStats[hour].correct++;
      }
    });

    // Calculate accuracy by time period
    const periods = {
      morning: { hours: [6, 7, 8, 9, 10, 11], stats: { total: 0, correct: 0 } },
      afternoon: { hours: [12, 13, 14, 15, 16, 17], stats: { total: 0, correct: 0 } },
      evening: { hours: [18, 19, 20, 21], stats: { total: 0, correct: 0 } },
      night: { hours: [22, 23, 0, 1, 2, 3, 4, 5], stats: { total: 0, correct: 0 } },
    };

    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const hourNum = parseInt(hour);
      for (const [, period] of Object.entries(periods)) {
        if (period.hours.includes(hourNum)) {
          period.stats.total += stats.total;
          period.stats.correct += stats.correct;
          break;
        }
      }
    });

    const periodAccuracy = Object.entries(periods).map(([name, data]) => ({
      name,
      total: data.stats.total,
      correct: data.stats.correct,
      accuracy: data.stats.total > 0 
        ? Math.round((data.stats.correct / data.stats.total) * 100) 
        : 0
    }));

    return NextResponse.json({
      totalSessions: sessions?.length || 0,
      hourlyStats,
      periodAccuracy,
      recentSessions: sessions?.slice(0, 20) || []
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/flashcards/study-session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
