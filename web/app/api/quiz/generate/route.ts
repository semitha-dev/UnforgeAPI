// app/api/quiz/generate/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAndDeductTokens, getUserSubscription, TOKEN_COSTS, refundTokens, hasActiveAccess, SubscriptionProfile } from '@/lib/subscription';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
  const tokensRequired = TOKEN_COSTS.QUIZ_GENERATION;
  let userId: string | null = null;
  let tokensDeducted = false;
  
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

    if (![5, 10].includes(questionCount)) {
      return NextResponse.json(
        { error: 'Question count must be 5 or 10' },
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
    
    if ((subscription.tokens_balance || 0) < tokensRequired) {
      return NextResponse.json(
        { 
          error: `Insufficient tokens. You need ${tokensRequired} tokens to generate a quiz. Current balance: ${subscription.tokens_balance || 0}`,
          tokensRequired,
          currentBalance: subscription.tokens_balance || 0
        },
        { status: 402 }
      );
    }

    // Deduct tokens BEFORE generation (atomic operation prevents double-spend)
    const deducted = await checkAndDeductTokens(user.id, tokensRequired);
    if (!deducted) {
      return NextResponse.json(
        { error: 'Failed to deduct tokens. Please try again.' },
        { status: 500 }
      );
    }
    tokensDeducted = true;

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      // Refund tokens - not user's fault
      if (tokensDeducted) {
        await refundTokens(user.id, tokensRequired);
      }
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 403 }
      );
    }

    // Generate quiz using Gemini
    const prompt = `You are an educational quiz generator. Create ${questionCount} multiple-choice questions based on the following study material. Each question must have exactly 4 options (A, B, C, D) with only ONE correct answer.

Study Material:
${studyMaterial}

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

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseContent = response.text();
    
    if (!responseContent) {
      throw new Error('No response from Gemini');
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
      questions = Array.isArray(parsed) ? parsed : parsed.questions;
      
      if (!Array.isArray(questions) || questions.length !== questionCount) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', responseContent);
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
      console.error('Error creating quiz:', quizError);
      throw new Error('Failed to create quiz');
    }

    // Insert questions
    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_text: q.question,
      option_a: q.options.A,
      option_b: q.options.B,
      option_c: q.options.C,
      option_d: q.options.D,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      question_order: index + 1
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Error inserting questions:', questionsError);
      // Clean up quiz if questions failed
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      throw new Error('Failed to create quiz questions');
    }

    // Success! Tokens stay deducted
    return NextResponse.json({ quiz, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    
    // Refund tokens on failure (only if we deducted them)
    if (tokensDeducted && userId) {
      console.log('Refunding tokens due to generation failure');
      await refundTokens(userId, tokensRequired);
    }
    
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
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}