// app/api/quiz/submit/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, answers } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Get all questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_order');

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 404 });
    }

    // Calculate score and identify mistakes
    let correctCount = 0;
    const mistakes: Array<{
      questionId: string;
      question: string;
      userAnswer: string;
      correctAnswer: string;
      topic: string;
      explanation: string;
    }> = [];

    // answers format: { questionIndex: 'A', questionIndex: 'B', ... }
    questions.forEach((question: any, index: number) => {
      const userAnswer = answers[index]; // Index-based from UI
      const isCorrect = userAnswer === question.correct_answer;

      if (isCorrect) {
        correctCount++;
      } else if (userAnswer) {
        // Record mistake
        mistakes.push({
          questionId: question.id,
          question: question.question_text,
          userAnswer,
          correctAnswer: question.correct_answer,
          topic: question.question_text.slice(0, 100),
          explanation: question.explanation || ''
        });
      }
    });

    const score = correctCount;
    const totalQuestions = questions.length;

    // Save quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: user.id,
        score,
        total_questions: totalQuestions,
        answers: answers // Store the answers object
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error saving attempt:', attemptError);
      throw new Error('Failed to save quiz attempt');
    }

    // Check if user has an active schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Always record mistakes to analytics (regardless of schedule)
    if (mistakes.length > 0) {
      const mistakesToInsert = mistakes.map(mistake => ({
        user_id: user.id,
        schedule_id: schedule?.id || null, // Optional - may not have schedule
        quiz_id: quizId,
        project_id: quiz.project_id,
        question: mistake.question,
        user_answer: mistake.userAnswer,
        correct_answer: mistake.correctAnswer,
        topic: mistake.topic,
        status: 'pending'
      }));

      const { error: mistakesError } = await supabase
        .from('quiz_mistakes')
        .insert(mistakesToInsert);

      if (mistakesError) {
        console.error('Error recording mistakes:', mistakesError);
      }
      
      // Only add revision tasks to schedule IF schedule exists
      if (schedule && !mistakesError) {
        for (const mistake of mistakes) {
          await addReviseTaskToSchedule(supabase, schedule, quiz, mistake);
        }
      }
    }

    return NextResponse.json({
      success: true,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      mistakesRecorded: schedule ? mistakes.length : 0,
      hasSchedule: !!schedule
    });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}

async function addReviseTaskToSchedule(
  supabase: any,
  schedule: any,
  quiz: any,
  mistake: any
) {
  try {
    const examDate = new Date(schedule.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find next available study day
    let nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1);

    let foundSlot = false;
    let attempts = 0;
    const maxAttempts = 60; // Check up to 60 days ahead

    while (nextDate <= examDate && !foundSlot && attempts < maxAttempts) {
      const dayOfWeek = nextDate.getDay();
      
      // Check if this is a preferred study day (not Sunday)
      if (schedule.preferred_days.includes(dayOfWeek) && dayOfWeek !== 0) {
        // Check existing tasks for this day
        const { data: existingTasks } = await supabase
          .from('schedule_tasks')
          .select('*')
          .eq('schedule_id', schedule.id)
          .eq('task_date', nextDate.toISOString().split('T')[0]);

        // If day has space (less than 4 tasks), add the revise task
        if (!existingTasks || existingTasks.length < 4) {
          const { error: insertError } = await supabase
            .from('schedule_tasks')
            .insert({
              schedule_id: schedule.id,
              task_date: nextDate.toISOString().split('T')[0],
              task_type: 'revise_mistake',
              task_name: `Revise: ${mistake.topic}`,
              project_id: quiz.project_id,
              project_name: quiz.title,
              priority: 'high',
              lesson_reference: mistake.topic,
              status: 'pending'
            });

          if (!insertError) {
            foundSlot = true;
          }
        }
      }

      nextDate.setDate(nextDate.getDate() + 1);
      attempts++;
    }

    // If no slot found, replace lowest priority task
    if (!foundSlot) {
      const { data: allTasks } = await supabase
        .from('schedule_tasks')
        .select('*')
        .eq('schedule_id', schedule.id)
        .eq('status', 'pending')
        .gte('task_date', today.toISOString().split('T')[0])
        .order('task_date', { ascending: true });

      if (allTasks && allTasks.length > 0) {
        // Find lowest priority task that's not a mistake revision
        const lowestPriorityTask = allTasks
          .filter((t: any) => t.priority === 'low' && t.task_type !== 'revise_mistake')
          .sort((a: any, b: any) => new Date(b.task_date).getTime() - new Date(a.task_date).getTime())[0];

        if (lowestPriorityTask) {
          // Delete the lowest priority task
          await supabase
            .from('schedule_tasks')
            .delete()
            .eq('id', lowestPriorityTask.id);

          // Add the revise task in its place
          await supabase
            .from('schedule_tasks')
            .insert({
              schedule_id: schedule.id,
              task_date: lowestPriorityTask.task_date,
              task_type: 'revise_mistake',
              task_name: `Revise: ${mistake.topic}`,
              project_id: quiz.project_id,
              project_name: quiz.title,
              priority: 'high',
              lesson_reference: mistake.topic,
              status: 'pending'
            });
        }
      }
    }
  } catch (error) {
    console.error('Error adding revise task:', error);
  }
}