// app/api/insights/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const PRIMARY_MODEL = 'llama-3.1-8b-instant';

interface Insight {
  insight_type: string;
  category: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  related_project_id?: string;
  related_note_id?: string;
  related_flashcard_set_id?: string;
  metadata: Record<string, unknown>;
  is_actionable: boolean;
  action_type?: string;
  action_data?: Record<string, unknown>;
}

// GET - Fetch insights for today and yesterday
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '2');
    const projectId = searchParams.get('projectId'); // Filter by project
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (daysBack - 1));

    // Build query
    let query = supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .gte('insight_date', startDate.toISOString().split('T')[0]);
    
    // Filter by project if specified
    if (projectId) {
      query = query.eq('related_project_id', projectId);
    }
    
    const { data: insights, error } = await query
      .order('insight_date', { ascending: false })
      .order('severity', { ascending: true }); // critical first

    if (error) {
      console.error('Error fetching insights:', error);
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }

    // Get user's profile for greeting
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    // Group by date
    const groupedInsights: Record<string, typeof insights> = {};
    insights?.forEach(insight => {
      const date = insight.insight_date;
      if (!groupedInsights[date]) {
        groupedInsights[date] = [];
      }
      groupedInsights[date].push(insight);
    });

    return NextResponse.json({
      insights: groupedInsights,
      userName: profile?.name || 'there',
      totalCount: insights?.length || 0
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate new insights for the user
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { forceRegenerate = false } = body;

    const today = new Date().toISOString().split('T')[0];

    // Check if insights were already generated today (unless force regenerate)
    if (!forceRegenerate) {
      const { data: existingInsights } = await supabase
        .from('insights')
        .select('id')
        .eq('user_id', user.id)
        .eq('insight_date', today)
        .limit(1);

      if (existingInsights && existingInsights.length > 0) {
        return NextResponse.json({ 
          message: 'Insights already generated today',
          alreadyGenerated: true 
        });
      }
    } else {
      // Delete existing insights for today if regenerating
      await supabase
        .from('insights')
        .delete()
        .eq('user_id', user.id)
        .eq('insight_date', today);
    }

    // Gather data for insights
    const [
      notesResult,
      flashcardSetsResult,
      flashcardsResult,
      quizAttemptsResult,
      scheduleTasksResult,
      studySessionsResult,
      projectsResult
    ] = await Promise.all([
      supabase.from('notes').select('id, title, content, summary, project_id, created_at, updated_at').eq('user_id', user.id),
      supabase.from('flashcard_sets').select('id, title, project_id, note_id, card_count').eq('user_id', user.id),
      supabase.from('flashcards').select('id, set_id, front, back').eq('user_id', user.id),
      supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('schedule_tasks').select('*').eq('status', 'pending'),
      supabase.from('flashcard_study_sessions').select('*').eq('user_id', user.id).order('studied_at', { ascending: false }).limit(500),
      supabase.from('projects').select('id, name').eq('user_id', user.id)
    ]);

    const notes = notesResult.data || [];
    const flashcardSets = flashcardSetsResult.data || [];
    const flashcards = flashcardsResult.data || [];
    const quizAttempts = quizAttemptsResult.data || [];
    const scheduleTasks = scheduleTasksResult.data || [];
    const studySessions = studySessionsResult.data || [];
    const projects = projectsResult.data || [];

    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const insightsToCreate: Insight[] = [];

    // 1. KNOWLEDGE HEATMAP - Find blind spots
    await generateKnowledgeHeatmapInsights(
      notes, 
      flashcardSets, 
      flashcards, 
      projectMap, 
      insightsToCreate
    );

    // 2. BIOLOGICAL RHYTHM - Analyze study time performance
    generateBiologicalRhythmInsights(
      studySessions,
      quizAttempts,
      insightsToCreate
    );

    // 3. FORGETTING CURVE - Find at-risk knowledge
    generateForgettingCurveInsights(
      scheduleTasks,
      flashcardSets,
      studySessions,
      projectMap,
      insightsToCreate
    );

    // 4. CONTENT GAP - Use AI to find missing topics
    await generateContentGapInsights(
      notes,
      projects,
      insightsToCreate
    );

    // 5. FACTUAL ACCURACY - AI fact-checking for potential errors
    await generateFactualAccuracyInsights(
      notes,
      projects,
      insightsToCreate
    );

    // Insert all insights
    if (insightsToCreate.length > 0) {
      const insightsWithMeta = insightsToCreate.map(insight => ({
        ...insight,
        user_id: user.id,
        insight_date: today,
      }));

      const { error: insertError } = await supabase
        .from('insights')
        .insert(insightsWithMeta);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
      }
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: 'insights_generate',
      endpoint: '/api/insights',
      method: 'POST',
      metadata: { insightsGenerated: insightsToCreate.length },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 201,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      insightsGenerated: insightsToCreate.length,
      insights: insightsToCreate
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

// PATCH - Dismiss an insight
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { insightId, action } = body;

    if (action === 'dismiss') {
      const { error } = await supabase
        .from('insights')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', insightId)
        .eq('user_id', user.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating insight:', error);
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 });
  }
}

// Helper: Generate Knowledge Heatmap Insights
async function generateKnowledgeHeatmapInsights(
  notes: Array<{ id: string; title: string; content: string; project_id: string }>,
  flashcardSets: Array<{ id: string; title: string; project_id: string; note_id: string | null; card_count: number }>,
  flashcards: Array<{ id: string; set_id: string; front: string; back: string }>,
  projectMap: Map<string, string>,
  insights: Insight[]
) {
  // Find notes without linked flashcards (Blind Spots)
  for (const note of notes) {
    const linkedSets = flashcardSets.filter(set => set.note_id === note.id);
    const projectName = projectMap.get(note.project_id) || 'Unknown Project';
    
    if (linkedSets.length === 0 && note.content && note.content.length > 200) {
      insights.push({
        insight_type: 'knowledge_heatmap',
        category: 'blind_spot',
        title: 'Untested Knowledge',
        message: `You have detailed notes on "${note.title}" but haven't created any flashcards to test yourself. Creating flashcards can improve retention by up to 50%.`,
        severity: 'warning',
        related_project_id: note.project_id,
        related_note_id: note.id,
        metadata: { 
          noteTitle: note.title, 
          projectName,
          contentLength: note.content.length 
        },
        is_actionable: true,
        action_type: 'create_flashcard',
        action_data: { noteId: note.id, projectId: note.project_id }
      });
    }
  }

  // Limit to top 3 blind spots
  const blindSpots = insights.filter(i => i.category === 'blind_spot');
  if (blindSpots.length > 3) {
    const toRemove = blindSpots.slice(3);
    toRemove.forEach(i => {
      const idx = insights.indexOf(i);
      if (idx > -1) insights.splice(idx, 1);
    });
  }
}

// Helper: Generate Biological Rhythm Insights
function generateBiologicalRhythmInsights(
  studySessions: Array<{ is_correct: boolean; studied_at: string; hour_of_day: number; timezone_offset?: number | null }>,
  quizAttempts: Array<{ score: number; total_questions: number; created_at: string }>,
  insights: Insight[]
) {
  if (studySessions.length < 10 && quizAttempts.length < 5) {
    return; // Not enough data
  }

  // Group by time periods
  const periods = {
    morning: { hours: [6, 7, 8, 9, 10, 11], correct: 0, total: 0, label: '6 AM - 12 PM' },
    afternoon: { hours: [12, 13, 14, 15, 16, 17], correct: 0, total: 0, label: '12 PM - 6 PM' },
    evening: { hours: [18, 19, 20, 21], correct: 0, total: 0, label: '6 PM - 10 PM' },
    night: { hours: [22, 23, 0, 1, 2, 3, 4, 5], correct: 0, total: 0, label: '10 PM - 6 AM' }
  };

  // Helper to convert UTC hour to local hour using timezone offset
  // timezone_offset is in minutes (e.g., -330 for IST which is UTC+5:30)
  // Browser's getTimezoneOffset() returns positive for west of UTC, negative for east
  // So for IST (UTC+5:30), offset is -330. To convert UTC to local: UTC_hour - (offset/60)
  const getLocalHour = (utcDate: Date, timezoneOffset: number | null | undefined): number => {
    if (timezoneOffset === null || timezoneOffset === undefined) {
      // Fallback to UTC hour if no timezone info
      return utcDate.getUTCHours();
    }
    // timezone_offset from browser is inverted (negative for east of UTC)
    // Local time = UTC time - offset (since offset is negative for positive timezones)
    const localMs = utcDate.getTime() - (timezoneOffset * 60 * 1000);
    const localDate = new Date(localMs);
    return localDate.getUTCHours();
  };

  // Analyze flashcard sessions with timezone-aware local hour
  studySessions.forEach(session => {
    const utcDate = new Date(session.studied_at);
    const localHour = getLocalHour(utcDate, session.timezone_offset);
    
    for (const [, period] of Object.entries(periods)) {
      if (period.hours.includes(localHour)) {
        period.total++;
        if (session.is_correct) period.correct++;
        break;
      }
    }
  });

  // Also analyze quiz attempts by hour
  quizAttempts.forEach(attempt => {
    const hour = new Date(attempt.created_at).getHours();
    for (const [, period] of Object.entries(periods)) {
      if (period.hours.includes(hour)) {
        period.total += attempt.total_questions;
        period.correct += attempt.score;
        break;
      }
    }
  });

  // Find best and worst periods
  const periodsWithAccuracy = Object.entries(periods)
    .filter(([, p]) => p.total >= 5)
    .map(([name, p]) => ({
      name,
      ...p,
      accuracy: p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  if (periodsWithAccuracy.length >= 2) {
    const best = periodsWithAccuracy[0];
    const worst = periodsWithAccuracy[periodsWithAccuracy.length - 1];

    if (best.accuracy - worst.accuracy >= 15) {
      insights.push({
        insight_type: 'biological_rhythm',
        category: 'peak_performance',
        title: 'Your Peak Learning Time',
        message: `You perform ${best.accuracy}% accurately in the ${best.name} (${best.label}), but only ${worst.accuracy}% at ${worst.name} (${worst.label}). Schedule difficult topics in the ${best.name} for better results.`,
        severity: 'info',
        metadata: { 
          bestPeriod: best.name,
          bestAccuracy: best.accuracy,
          worstPeriod: worst.name,
          worstAccuracy: worst.accuracy,
          periodsAnalyzed: periodsWithAccuracy
        },
        is_actionable: true,
        action_type: 'reschedule',
        action_data: { recommendedTime: best.name }
      });
    }
  }
}

// Helper: Generate Forgetting Curve Insights
function generateForgettingCurveInsights(
  scheduleTasks: Array<{ task_name: string; last_review_quality: number; next_review_date: string; project_id: string; task_type: string }>,
  flashcardSets: Array<{ id: string; title: string; project_id: string }>,
  studySessions: Array<{ flashcard_set_id: string; studied_at: string }>,
  projectMap: Map<string, string>,
  insights: Insight[]
) {
  const now = new Date();
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  // Check flashcard sets not reviewed recently
  const setLastStudied = new Map<string, Date>();
  studySessions.forEach(session => {
    const current = setLastStudied.get(session.flashcard_set_id);
    const sessionDate = new Date(session.studied_at);
    if (!current || sessionDate > current) {
      setLastStudied.set(session.flashcard_set_id, sessionDate);
    }
  });

  for (const set of flashcardSets) {
    const lastStudied = setLastStudied.get(set.id);
    if (!lastStudied || lastStudied < sixDaysAgo) {
      const daysSince = lastStudied 
        ? Math.floor((now.getTime() - lastStudied.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      
      // Calculate estimated retention using Ebbinghaus formula approximation
      // R = e^(-t/S) where S is stability (assume ~3 days for new material)
      const retentionPercent = daysSince 
        ? Math.round(100 * Math.exp(-daysSince / 3))
        : 20;

      const projectName = projectMap.get(set.project_id) || 'Unknown';
      
      if (retentionPercent < 50) {
        insights.push({
          insight_type: 'forgetting_curve',
          category: 'decay_warning',
          title: 'Memory Decay Alert',
          message: daysSince
            ? `Your memory of "${set.title}" has likely dropped to ~${retentionPercent}% after ${daysSince} days without review. Review today to avoid relearning from scratch.`
            : `You haven't studied "${set.title}" recently. Your retention is at risk.`,
          severity: retentionPercent < 30 ? 'critical' : 'warning',
          related_project_id: set.project_id,
          related_flashcard_set_id: set.id,
          metadata: { 
            setTitle: set.title,
            projectName,
            daysSinceReview: daysSince,
            estimatedRetention: retentionPercent
          },
          is_actionable: true,
          action_type: 'review_flashcards',
          action_data: { setId: set.id, projectId: set.project_id }
        });
      }
    }
  }

  // Limit decay warnings to top 3 most critical
  const decayWarnings = insights.filter(i => i.category === 'decay_warning');
  decayWarnings.sort((a, b) => (a.metadata.estimatedRetention as number) - (b.metadata.estimatedRetention as number));
  if (decayWarnings.length > 3) {
    const toRemove = decayWarnings.slice(3);
    toRemove.forEach(i => {
      const idx = insights.indexOf(i);
      if (idx > -1) insights.splice(idx, 1);
    });
  }
}

// Helper: Generate Content Gap Insights using AI
async function generateContentGapInsights(
  notes: Array<{ id: string; title: string; summary?: string | null; content?: string; project_id: string }>,
  projects: Array<{ id: string; name: string }>,
  insights: Insight[]
) {
  // Only analyze projects with at least 2 notes
  const projectNotesMap = new Map<string, Array<{ title: string; summary: string }>>();
  notes.forEach(note => {
    const existing = projectNotesMap.get(note.project_id) || [];
    // Use summary if available, otherwise extract first 200 chars of content
    const summary = note.summary || (note.content ? note.content.slice(0, 200).replace(/\n/g, ' ').trim() + '...' : '');
    existing.push({ title: note.title, summary });
    projectNotesMap.set(note.project_id, existing);
  });

  for (const project of projects) {
    const projectNotes = projectNotesMap.get(project.id) || [];
    if (projectNotes.length < 2) continue;

    try {
      // Build detailed notes context with summaries
      const notesContext = projectNotes.map(n => 
        `• ${n.title}${n.summary ? `\n  Summary: ${n.summary}` : ''}`
      ).join('\n');

      const prompt = `You are an educational content analyzer. A student is studying "${project.name}" and has the following notes:

${notesContext}

Based on typical curriculum for "${project.name}", analyze what topics they have covered and identify 1-2 important foundational topics they might be missing.

Be specific and educational. Only suggest topics that are:
1. Clearly NOT covered in their existing notes
2. Foundational/important for this subject
3. Would complement their current knowledge

Respond in JSON format:
{
  "missingTopics": [
    {"topic": "Topic Name", "reason": "Why this is important and how it connects to what they're learning (1-2 sentences)"}
  ]
}

If the notes seem comprehensive or you can't determine gaps with confidence, return {"missingTopics": []}`;

      const completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const missingTopics = parsed.missingTopics || [];

        if (missingTopics.length > 0) {
          const topicsText = missingTopics.map((t: { topic: string }) => t.topic).join(', ');
          insights.push({
            insight_type: 'content_gap',
            category: 'missing_topic',
            title: 'Knowledge Gap Detected',
            message: `In your "${project.name}" studies, you might be missing: ${topicsText}. Would you like AI to generate a summary for these topics?`,
            severity: 'info',
            related_project_id: project.id,
            metadata: { 
              projectName: project.name,
              existingNotes: projectNotes.map(n => n.title),
              missingTopics
            },
            is_actionable: true,
            action_type: 'generate_content',
            action_data: { projectId: project.id, topics: missingTopics }
          });
        }
      }
    } catch (error) {
      console.error(`Error analyzing content gaps for project ${project.name}:`, error);
    }
  }

  // Limit content gaps to 2
  const contentGaps = insights.filter(i => i.insight_type === 'content_gap');
  if (contentGaps.length > 2) {
    const toRemove = contentGaps.slice(2);
    toRemove.forEach(i => {
      const idx = insights.indexOf(i);
      if (idx > -1) insights.splice(idx, 1);
    });
  }
}

// Helper: Generate Factual Accuracy Insights using AI
async function generateFactualAccuracyInsights(
  notes: Array<{ id: string; title: string; summary?: string | null; content?: string; project_id: string }>,
  projects: Array<{ id: string; name: string }>,
  insights: Insight[]
) {
  // Group notes by project
  const projectNotesMap = new Map<string, Array<{ id: string; title: string; content: string }>>();
  notes.forEach(note => {
    const existing = projectNotesMap.get(note.project_id) || [];
    // Get the actual content for fact-checking
    const content = note.content || note.summary || '';
    if (content.length > 50) { // Only check notes with substantial content
      existing.push({ id: note.id, title: note.title, content: content.slice(0, 1500) }); // Limit content length
    }
    projectNotesMap.set(note.project_id, existing);
  });

  for (const project of projects) {
    const projectNotes = projectNotesMap.get(project.id) || [];
    if (projectNotes.length === 0) continue;

    // Check each note for factual accuracy
    for (const note of projectNotes.slice(0, 3)) { // Limit to 3 notes per project to save API calls
      try {
        const prompt = `You are a fact-checker for educational content. A student is studying "${project.name}" and has written the following note:

Title: ${note.title}

Content:
${note.content}

Carefully analyze this note for any factual errors, misconceptions, or incorrect information. Look for:
1. Wrong names, dates, or attributions (e.g., wrong author, wrong inventor)
2. Incorrect definitions or explanations
3. Misattributed quotes or facts
4. Scientific or historical inaccuracies

Be very careful - only flag clear factual errors that you are confident about. Do NOT flag:
- Opinions or subjective statements
- Simplified explanations (even if not 100% complete)
- Minor details that don't affect understanding

Respond in JSON format:
{
  "hasErrors": true/false,
  "errors": [
    {
      "claim": "The incorrect statement from the note",
      "correction": "The accurate information",
      "severity": "high" or "medium"
    }
  ]
}

If there are no clear factual errors, return {"hasErrors": false, "errors": []}`;

        const completion = await groq.chat.completions.create({
          model: PRIMARY_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // Low temperature for factual accuracy
          max_tokens: 500,
        });

        const response = completion.choices[0]?.message?.content || '';
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          if (parsed.hasErrors && parsed.errors && parsed.errors.length > 0) {
            const highSeverityErrors = parsed.errors.filter((e: { severity: string }) => e.severity === 'high');
            const errorCount = parsed.errors.length;
            const isHighPriority = highSeverityErrors.length > 0;
            
            // Create a concise summary of errors
            const firstError = parsed.errors[0];
            const summaryMessage = errorCount === 1
              ? `"${firstError.claim}" → ${firstError.correction}`
              : `${errorCount} potential issues found. Example: "${firstError.claim}" → ${firstError.correction}`;

            insights.push({
              insight_type: 'factual_accuracy',
              category: 'fact_check',
              title: '⚠️ Possible Factual Error',
              message: `In your note "${note.title}": ${summaryMessage}`,
              severity: isHighPriority ? 'warning' : 'info',
              related_project_id: project.id,
              metadata: { 
                projectName: project.name,
                noteId: note.id,
                noteTitle: note.title,
                errors: parsed.errors
              },
              is_actionable: true,
              action_type: 'review_note',
              action_data: { noteId: note.id, projectId: project.id, errors: parsed.errors }
            });
          }
        }
      } catch (error) {
        console.error(`Error fact-checking note "${note.title}":`, error);
      }
    }
  }

  // Limit factual accuracy insights to 3
  const factualInsights = insights.filter(i => i.insight_type === 'factual_accuracy');
  if (factualInsights.length > 3) {
    const toRemove = factualInsights.slice(3);
    toRemove.forEach(i => {
      const idx = insights.indexOf(i);
      if (idx > -1) insights.splice(idx, 1);
    });
  }
}
