// app/api/study/generate/route.ts
// Unified Study Material Generator - Creates both flashcards AND quiz questions in one call
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getUserSubscription, hasActiveAccess, SubscriptionProfile } from '@/lib/subscription';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const PRIMARY_MODEL = 'llama-3.1-8b-instant';
const FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

interface StudyItem {
  type: 'flashcard' | 'quiz';
  // Flashcard fields
  front?: string;
  back?: string;
  // Quiz fields
  question?: string;
  options?: { A: string; B: string; C: string; D: string };
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const { title, studyMaterial, itemCount = 10, projectId, noteId, flashcardRatio = 0.5 } = body;

    // Validation
    if (!title || !studyMaterial || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, studyMaterial, projectId' },
        { status: 400 }
      );
    }

    if (typeof itemCount !== 'number' || itemCount < 1 || itemCount > 30) {
      return NextResponse.json(
        { error: 'Item count must be between 1 and 30' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    userId = user.id;

    // Check subscription and token balance
    const subscription = await getUserSubscription(user.id);
    
    if (!hasActiveAccess(subscription as SubscriptionProfile) && subscription.subscription_tier !== 'free') {
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew to continue using AI features.' },
        { status: 403 }
      );
    }

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    // Calculate how many of each type
    const flashcardCount = Math.round(itemCount * flashcardRatio);
    const quizCount = itemCount - flashcardCount;

    // Generate study material using AI
    const prompt = `You are an expert educator creating study materials. Based on the following content, create a mixed set of study items.

CONTENT:
${studyMaterial.substring(0, 8000)}

Create EXACTLY:
- ${flashcardCount} flashcards (for simple recall/definitions)
- ${quizCount} quiz questions (for deeper understanding/application)

RULES FOR FLASHCARDS:
- Use for: definitions, key terms, simple facts, formulas
- Front: clear question or term
- Back: concise answer

RULES FOR QUIZ QUESTIONS:
- Use for: application, analysis, comparing concepts, "why" questions
- Create 4 options (A, B, C, D) with only ONE correct answer
- Include explanation for correct answer

IMPORTANT: Mix difficulty levels (easy, medium, hard) and identify the topic for each item.

Return a JSON array with this EXACT structure (no markdown, just raw JSON):
[
  {
    "type": "flashcard",
    "front": "question or term",
    "back": "answer",
    "difficulty": "easy|medium|hard",
    "topic": "topic name"
  },
  {
    "type": "quiz",
    "question": "full question text",
    "options": {"A": "option 1", "B": "option 2", "C": "option 3", "D": "option 4"},
    "correct_answer": "A|B|C|D",
    "explanation": "why this is correct",
    "difficulty": "easy|medium|hard",
    "topic": "topic name"
  }
]`;

    let studyItems: StudyItem[] = [];
    let usedModel = PRIMARY_MODEL;

    try {
      const completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON arrays, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content || '[]';
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      studyItems = JSON.parse(cleanedContent);
    } catch (primaryError) {
      console.error('Primary model failed, trying fallback:', primaryError);
      usedModel = FALLBACK_MODEL;
      
      const fallbackCompletion = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON arrays, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = fallbackCompletion.choices[0]?.message?.content || '[]';
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      studyItems = JSON.parse(cleanedContent);
    }

    if (!Array.isArray(studyItems) || studyItems.length === 0) {
      throw new Error('Failed to generate study materials');
    }

    // Create study set record
    const { data: studySet, error: setError } = await supabase
      .from('study_sets')
      .insert({
        user_id: user.id,
        project_id: projectId,
        note_id: noteId || null,
        title,
        description: `AI-generated study set with ${flashcardCount} flashcards and ${quizCount} quiz questions`,
        item_count: studyItems.length,
        flashcard_count: studyItems.filter(i => i.type === 'flashcard').length,
        quiz_count: studyItems.filter(i => i.type === 'quiz').length,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (setError) throw setError;

    // Store study items
    const itemsToInsert = studyItems.map((item, index) => ({
      user_id: user.id,
      study_set_id: studySet.id,
      item_type: item.type,
      item_order: index,
      // Flashcard fields
      front: item.front || null,
      back: item.back || null,
      // Quiz fields
      question: item.question || null,
      option_a: item.options?.A || null,
      option_b: item.options?.B || null,
      option_c: item.options?.C || null,
      option_d: item.options?.D || null,
      correct_answer: item.correct_answer || null,
      explanation: item.explanation || null,
      // Metadata
      difficulty: item.difficulty || 'medium',
      topic: item.topic || 'General',
    }));

    const { error: itemsError } = await supabase
      .from('study_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Log activity
    await logActivity({
      user_id: user.id,
      action_type: ActionTypes.LEAF_AI_GENERATE,
      tokens_used: 0,
      model: usedModel,
      metadata: {
        title,
        itemCount: studyItems.length,
        flashcardCount: studyItems.filter(i => i.type === 'flashcard').length,
        quizCount: studyItems.filter(i => i.type === 'quiz').length,
        studySetId: studySet.id,
        projectId,
        responseTimeMs: Date.now() - startTime
      },
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      success: true,
      studySetId: studySet.id,
      itemCount: studyItems.length,
      flashcardCount: studyItems.filter(i => i.type === 'flashcard').length,
      quizCount: studyItems.filter(i => i.type === 'quiz').length,
      tokensUsed: 0,
    });

  } catch (error: any) {
    console.error('Error generating study materials:', error);
    
    // Log error
    if (userId) {
      await logActivity({
        user_id: userId,
        action_type: ActionTypes.LEAF_AI_GENERATE,
        metadata: {
          error: error.message,
          responseTimeMs: Date.now() - startTime
        },
        ip_address: ip,
        user_agent: userAgent,
      }).catch(console.error);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate study materials' },
      { status: 500 }
    );
  }
}

// GET - Retrieve study sets for a project or specific set
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const setId = searchParams.get('setId');

    if (!projectId && !setId) {
      return NextResponse.json({ error: 'Project ID or Set ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get specific set with items
    if (setId) {
      const [setResult, itemsResult] = await Promise.all([
        supabase
          .from('study_sets')
          .select('*')
          .eq('id', setId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('study_items')
          .select('*')
          .eq('study_set_id', setId)
          .eq('user_id', user.id)
          .order('item_order', { ascending: true })
      ]);

      if (setResult.error) throw setResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return NextResponse.json({
        set: setResult.data,
        items: itemsResult.data
      });
    }

    // Get all sets for project
    const { data: sets, error } = await supabase
      .from('study_sets')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(sets);
  } catch (error: any) {
    console.error('Error fetching study sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch study sets' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a study set
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');

    if (!setId) {
      return NextResponse.json({ error: 'Set ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Delete items first (cascade should handle this but just to be safe)
    await supabase
      .from('study_items')
      .delete()
      .eq('study_set_id', setId)
      .eq('user_id', user.id);

    // Delete set
    const { error } = await supabase
      .from('study_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting study set:', error);
    return NextResponse.json(
      { error: 'Failed to delete study set' },
      { status: 500 }
    );
  }
}
