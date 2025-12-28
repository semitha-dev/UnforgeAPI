/**
 * Run Atlas Smoke Test SQL
 * This script runs the SQL file against Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
  console.log('🚀 Running Atlas Smoke Test SQL...\n');
  
  const sqlPath = join(__dirname, '..', 'supabase', 'atlas_smoke_test.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, we need to run individual inserts
      console.log('Note: exec_sql RPC not available, using direct queries...\n');
      
      // We'll run the smoke test script instead which doesn't need the SQL
      console.log('Please run the SQL manually in Supabase SQL Editor, or continue to the smoke test.\n');
      return false;
    }
    
    console.log('✅ SQL executed successfully!');
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

runSQL();
