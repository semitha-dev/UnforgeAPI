// app/api/project-time/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action, sessionId, pagePath } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (action === 'start') {
      // Start a new time tracking session
      const { data, error } = await supabase
        .from('project_time_logs')
        .insert({
          user_id: user.id,
          project_id: projectId,
          session_start: new Date().toISOString(),
          page_path: pagePath || null
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting time log:', error);
        return NextResponse.json({ error: 'Failed to start time log' }, { status: 500 });
      }

      return NextResponse.json({ sessionId: data.id });
    } 
    
    else if (action === 'end') {
      // End an existing time tracking session
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required to end session' }, { status: 400 });
      }

      const { error } = await supabase
        .from('project_time_logs')
        .update({
          session_end: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error ending time log:', error);
        return NextResponse.json({ error: 'Failed to end time log' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }
    
    else if (action === 'heartbeat') {
      // Update session to show activity (extends timeout)
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID is required for heartbeat' }, { status: 400 });
      }

      const { error } = await supabase
        .from('project_time_logs')
        .update({
          updated_at: new Date().toISOString(),
          page_path: pagePath || undefined
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating heartbeat:', error);
        return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in project-time API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get time logs for the specified project
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: timeLogs, error } = await supabase
      .from('project_time_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching time logs:', error);
      return NextResponse.json({ error: 'Failed to fetch time logs' }, { status: 500 });
    }

    // Calculate statistics
    const completedSessions = timeLogs.filter(log => log.session_end && log.duration_seconds);
    const totalSeconds = completedSessions.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const avgSessionSeconds = completedSessions.length > 0 
      ? totalSeconds / completedSessions.length 
      : 0;

    // Group by date for daily breakdown
    const dailyStats = completedSessions.reduce((acc: any, log) => {
      const date = new Date(log.session_start).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, totalSeconds: 0, sessions: 0 };
      }
      acc[date].totalSeconds += log.duration_seconds || 0;
      acc[date].sessions += 1;
      return acc;
    }, {});

    // Group by page path
    const pageStats = completedSessions.reduce((acc: any, log) => {
      const page = log.page_path || 'unknown';
      if (!acc[page]) {
        acc[page] = { page, totalSeconds: 0, sessions: 0 };
      }
      acc[page].totalSeconds += log.duration_seconds || 0;
      acc[page].sessions += 1;
      return acc;
    }, {});

    return NextResponse.json({
      totalSessions: completedSessions.length,
      totalSeconds,
      avgSessionSeconds,
      dailyStats: Object.values(dailyStats),
      pageStats: Object.values(pageStats),
      recentSessions: timeLogs.slice(0, 10)
    });

  } catch (error) {
    console.error('Error in project-time GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
