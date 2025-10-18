// app/api/quiz/generate/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Generate quiz using OpenAI
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful educational assistant that generates quiz questions. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the response
    let questions: QuizQuestion[];
    try {
      const parsed = JSON.parse(responseContent);
      // Handle both direct array and wrapped array
      questions = Array.isArray(parsed) ? parsed : parsed.questions;
      
      if (!Array.isArray(questions) || questions.length !== questionCount) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', responseContent);
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

    return NextResponse.json({ quiz, success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
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