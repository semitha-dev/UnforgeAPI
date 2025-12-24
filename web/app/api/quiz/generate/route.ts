// app/api/quiz/generate/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { deductTokensWithExpiry, getValidTokenBalance, getUserSubscription, calculateOutputTokenCost, countWords, hasActiveAccess, SubscriptionProfile, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

// Initialize Groq - 100% FREE!
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Models optimized for production - high rate limits
const PRIMARY_MODEL = 'llama-3.1-8b-instant'; // 14,400 requests/day
const FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // 30K tokens/min

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const { title, studyMaterial, questionCount, projectId, noteId } = body;

    // Validation
    if (!title || !studyMaterial || !questionCount || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Allow question count from 1 to 20
    if (typeof questionCount !== 'number' || questionCount < 1 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Question count must be between 1 and 20' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    userId = user.id;

    // Check subscription and token balance for AI generation
    const subscription = await getUserSubscription(user.id);
    
    // Verify user has active subscription access (considers canceled but not expired)
    if (!hasActiveAccess(subscription as SubscriptionProfile) && subscription.subscription_tier !== 'free') {
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew to continue using AI features.' },
        { status: 403 }
      );
    }
    
    // Check if user has minimum tokens to start generation (using valid non-expired tokens)
    const validBalance = await getValidTokenBalance(user.id);
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      return NextResponse.json(
        { 
          error: `Insufficient tokens. You need at least ${MIN_TOKENS_TO_GENERATE} tokens to generate a quiz. Current balance: ${validBalance}`,
          tokensRequired: MIN_TOKENS_TO_GENERATE,
          currentBalance: validBalance
        },
        { status: 402 }
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

    // Generate quiz using Groq
    const prompt = `You are an educational quiz generator. Create ${questionCount} multiple-choice questions based on the following study material. Each question must have exactly 4 options (A, B, C, D) with only ONE correct answer.

Study Material:
${studyMaterial.slice(0, 15000)}

Generate a JSON array of ${questionCount} questions with the following format:
[
  {
    "question": "Question text here?",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "correct_answer": "A",
    "explanation": "Brief explanation of why this is correct"
  }
]

Make sure:
1. Questions test understanding, not just memorization
2. All options are plausible but only one is correct
3. Explanations are clear and educational
4. Questions cover different aspects of the material
5. Return ONLY valid JSON, no additional text`;

    let responseContent: string | null = null;
    let modelUsed = PRIMARY_MODEL;
    
    // Try primary model first
    try {
      console.log(`[Quiz] Using model: ${PRIMARY_MODEL}`);
      const completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful AI that generates educational quiz questions. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });
      responseContent = completion.choices[0]?.message?.content || null;
      console.log(`[Quiz] ${PRIMARY_MODEL} generation successful`);
    } catch (primaryError: any) {
      console.error(`[Quiz] ${PRIMARY_MODEL} failed:`, primaryError.message);
      
      // Try fallback model
      try {
        console.log(`[Quiz] Trying fallback: ${FALLBACK_MODEL}`);
        modelUsed = FALLBACK_MODEL;
        const completion = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful AI that generates educational quiz questions. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4096,
          temperature: 0.7,
        });
        responseContent = completion.choices[0]?.message?.content || null;
        console.log(`[Quiz] ${FALLBACK_MODEL} generation successful`);
      } catch (fallbackError: any) {
        console.error(`[Quiz] Fallback also failed:`, fallbackError.message);
        
        if (fallbackError?.status === 429) {
          return NextResponse.json(
            { error: 'AI service rate limit exceeded. Please try again in a few moments.' },
            { status: 429 }
          );
        }
        
        throw new Error('Failed to generate quiz: ' + (fallbackError.message || 'Unknown error'));
      }
    }
    
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    // Parse the response
    let questions: QuizQuestion[];
    try {
      // Clean up the response text (remove markdown code blocks if present)
      let cleanedResponse = responseContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      // Handle both direct array and wrapped array
      let rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;
      
      if (!Array.isArray(rawQuestions) || rawQuestions.length !== questionCount) {
        throw new Error('Invalid questions format');
      }
      
      // Normalize and validate each question
      questions = rawQuestions.map((q: any, idx: number) => {
        // Handle different field names for correct answer
        let correctAnswer = q.correct_answer || q.correctAnswer || q.answer || q.correct;
        
        // Normalize to uppercase A, B, C, or D
        if (typeof correctAnswer === 'string') {
          correctAnswer = correctAnswer.toUpperCase().trim();
          // Handle "Option A" or just "A"
          if (correctAnswer.startsWith('OPTION ')) {
            correctAnswer = correctAnswer.replace('OPTION ', '');
          }
        }
        
        // Validate correct_answer is A, B, C, or D
        if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
          console.error(`Question ${idx + 1} has invalid correct_answer:`, correctAnswer, 'Full question:', q);
          throw new Error(`Question ${idx + 1} has invalid correct_answer: ${correctAnswer}`);
        }
        
        // Handle different option formats
        const options = q.options || {
          A: q.option_a || q.optionA || q.a,
          B: q.option_b || q.optionB || q.b,
          C: q.option_c || q.optionC || q.c,
          D: q.option_d || q.optionD || q.d,
        };
        
        return {
          question: q.question || q.question_text,
          options: {
            A: options.A || options.a,
            B: options.B || options.b,
            C: options.C || options.c,
            D: options.D || options.d,
          },
          correct_answer: correctAnswer as 'A' | 'B' | 'C' | 'D',
          explanation: q.explanation || ''
        };
      });
    } catch (parseError) {
      console.error('[Quiz] Error parsing response:', responseContent);
      throw new Error('Failed to parse quiz questions');
    }

    // Create quiz in database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title,
        description: `Quiz with ${questionCount} questions`,
        source_material: studyMaterial,
        note_id: noteId || null,
        question_count: questionCount
      })
      .select()
      .single();

    if (quizError) {
      console.error('[Quiz] Error creating quiz:', quizError);
      throw new Error('Failed to create quiz');
    }

    // Insert questions
    const questionsToInsert = questions.map((q, index) => {
      // Final validation before insert
      if (!q.correct_answer || !['A', 'B', 'C', 'D'].includes(q.correct_answer)) {
        console.error(`Question ${index + 1} still has invalid correct_answer:`, q);
        throw new Error(`Question ${index + 1} has missing or invalid correct_answer`);
      }
      
      return {
        quiz_id: quiz.id,
        question_text: q.question,
        option_a: q.options.A,
        option_b: q.options.B,
        option_c: q.options.C,
        option_d: q.options.D,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        question_order: index + 1
      };
    });

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('[Quiz] Error inserting questions:', questionsError);
      // Clean up quiz if questions failed
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      throw new Error('Failed to create quiz questions');
    }

    // Calculate token cost based on OUTPUT word count
    const outputText = questions.map(q => 
      `${q.question} ${q.options.A} ${q.options.B} ${q.options.C} ${q.options.D} ${q.explanation || ''}`
    ).join(' ');
    const outputWordCount = countWords(outputText);
    const tokensRequired = calculateOutputTokenCost(outputWordCount);
    console.log(`[Quiz] ${questions.length} questions, ${outputWordCount} words, deducting ${tokensRequired} tokens`);

    // Deduct tokens AFTER successful generation (uses FIFO with expiry)
    const deducted = await deductTokensWithExpiry(user.id, tokensRequired);
    if (!deducted) {
      console.error('[Quiz] Failed to deduct tokens');
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.QUIZ_GENERATE,
      endpoint: '/api/quiz/generate',
      method: 'POST',
      tokens_used: tokensRequired,
      model: modelUsed,
      metadata: { questionCount, projectId, noteId, quizId: quiz.id, provider: 'groq' },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 201,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({ 
      quiz, 
      success: true,
      tokensUsed: tokensRequired,
      outputWords: outputWordCount,
      model: modelUsed,
      provider: 'groq'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Quiz] Error generating:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}

// Get all quizzes for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(quizzes);
  } catch (error: any) {
    console.error('[Quiz] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
