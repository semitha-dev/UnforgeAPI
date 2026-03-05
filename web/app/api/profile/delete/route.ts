// app/api/profile/delete/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Delete all user data in order (due to foreign key constraints)
    // 1. Delete flashcards (depends on flashcard_sets)
    const { error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('user_id', userId);
    
    if (flashcardsError) {
      console.error('Error deleting flashcards:', flashcardsError);
    }

    // 2. Delete flashcard sets
    const { error: flashcardSetsError } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('user_id', userId);
    
    if (flashcardSetsError) {
      console.error('Error deleting flashcard sets:', flashcardSetsError);
    }

    // 3. Delete quiz questions (depends on quizzes)
    const { data: userQuizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('user_id', userId);
    
    if (userQuizzes && userQuizzes.length > 0) {
      const quizIds = userQuizzes.map(q => q.id);
      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .in('quiz_id', quizIds);
      
      if (questionsError) {
        console.error('Error deleting quiz questions:', questionsError);
      }
    }

    // 4. Delete quizzes
    const { error: quizzesError } = await supabase
      .from('quizzes')
      .delete()
      .eq('user_id', userId);
    
    if (quizzesError) {
      console.error('Error deleting quizzes:', quizzesError);
    }

    // 5. Delete schedule tasks (depends on schedules)
    const { data: userSchedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('user_id', userId);
    
    if (userSchedules && userSchedules.length > 0) {
      const scheduleIds = userSchedules.map(s => s.id);
      const { error: tasksError } = await supabase
        .from('schedule_tasks')
        .delete()
        .in('schedule_id', scheduleIds);
      
      if (tasksError) {
        console.error('Error deleting schedule tasks:', tasksError);
      }
    }

    // 6. Delete schedules
    const { error: schedulesError } = await supabase
      .from('schedules')
      .delete()
      .eq('user_id', userId);
    
    if (schedulesError) {
      console.error('Error deleting schedules:', schedulesError);
    }

    // 7. Delete QA pairs
    const { error: qaError } = await supabase
      .from('qa_pairs')
      .delete()
      .eq('user_id', userId);
    
    if (qaError) {
      console.error('Error deleting QA pairs:', qaError);
    }

    // 8. Delete notes
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('user_id', userId);
    
    if (notesError) {
      console.error('Error deleting notes:', notesError);
    }

    // 9. Delete projects
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId);
    
    if (projectsError) {
      console.error('Error deleting projects:', projectsError);
    }

    // 10. Delete token purchases
    const { error: tokenPurchasesError } = await supabase
      .from('token_purchases')
      .delete()
      .eq('user_id', userId);
    
    if (tokenPurchasesError) {
      console.error('Error deleting token purchases:', tokenPurchasesError);
    }

    // 11. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      );
    }

    // 12. Sign out the user
    await supabase.auth.signOut();

    // Note: The actual auth.users record deletion should be handled by 
    // Supabase cascade delete or admin functions. 
    // For now, we've deleted all user data and signed them out.

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in DELETE /api/profile/delete:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
