// Add timezone_offset column to flashcard_study_sessions table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Use service role key to run admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function addColumn() {
  console.log('Adding timezone_offset column to flashcard_study_sessions...');
  
  // We can't run ALTER TABLE directly via the Supabase JS client
  // Instead, let's check if the column exists by trying to insert with it
  
  // First, let's test insert a row with timezone_offset to see if the column exists
  const { error: testError } = await supabase
    .from('flashcard_study_sessions')
    .select('timezone_offset')
    .limit(1);
  
  if (testError) {
    console.log('⚠️ Column does not exist. Please add it manually via Supabase dashboard:');
    console.log('');
    console.log('SQL to run:');
    console.log('ALTER TABLE flashcard_study_sessions ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0;');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Open your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste and run the SQL above');
  } else {
    console.log('✅ Column already exists!');
  }
}

addColumn();
