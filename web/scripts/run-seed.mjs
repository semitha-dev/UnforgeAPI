import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Read the pooler URL from Supabase temp
const poolerUrlPath = path.join(__dirname, '..', 'supabase', '.temp', 'pooler-url');
let connectionString = '';

if (fs.existsSync(poolerUrlPath)) {
  connectionString = fs.readFileSync(poolerUrlPath, 'utf8').trim();
}

async function askForPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter your Supabase database password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runSeed() {
  try {
    if (!connectionString) {
      console.error('Could not find pooler URL. Make sure you have linked the project with: npx supabase link');
      process.exit(1);
    }

    // Parse the connection string and ask for password
    const password = await askForPassword();
    
    // Insert password into connection string
    // Format: postgresql://postgres.zliclquefhvheklnrram@aws-1-us-east-2.pooler.supabase.com:5432/postgres
    const fullConnectionString = connectionString.replace(
      'postgres.zliclquefhvheklnrram@',
      `postgres.zliclquefhvheklnrram:${encodeURIComponent(password)}@`
    );

    const sqlPath = path.join(__dirname, '..', 'supabase', 'seed_jamesbondmand.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('\nConnecting to database...');
    
    const client = new pg.Client({
      connectionString: fullConnectionString,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Connected! Running seed SQL...\n');
    
    const result = await client.query(sql);
    
    console.log('\n✅ Seed data created successfully!');
    console.log('Projects created: Biology 101, Organic Chemistry, Physics Mechanics');
    console.log('Notes: 6, Flashcard Sets: 4, Flashcards: 36, Quizzes: 2, Q&A: 7');
    console.log('Study sessions: 26, Insights: 4');
    
    await client.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('password')) {
      console.log('\nMake sure you entered the correct database password.');
      console.log('You can find it in Supabase Dashboard > Settings > Database > Database Password');
    }
    process.exit(1);
  }
}

runSeed();
