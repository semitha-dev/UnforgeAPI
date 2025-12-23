-- Add share functionality to flashcard_sets and quizzes
-- This allows users to share flashcards and quizzes via unique links

-- Add share_token and is_public to flashcard_sets
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add share_token and is_public to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create indexes for faster lookups on share tokens
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_share_token ON flashcard_sets(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_share_token ON quizzes(share_token) WHERE share_token IS NOT NULL;

-- Add RLS policies for public access to shared content
-- Allow anyone to read flashcard_sets that are public
CREATE POLICY "Public flashcard sets are viewable by everyone" ON flashcard_sets
  FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

-- Allow anyone to read quizzes that are public  
CREATE POLICY "Public quizzes are viewable by everyone" ON quizzes
  FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

-- Allow anyone to read flashcards from public sets
CREATE POLICY "Flashcards from public sets are viewable by everyone" ON flashcards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets 
      WHERE flashcard_sets.id = flashcards.set_id 
      AND flashcard_sets.is_public = true 
      AND flashcard_sets.share_token IS NOT NULL
    )
  );

-- Allow anyone to read quiz_questions from public quizzes
CREATE POLICY "Questions from public quizzes are viewable by everyone" ON quiz_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = quiz_questions.quiz_id 
      AND quizzes.is_public = true 
      AND quizzes.share_token IS NOT NULL
    )
  );
