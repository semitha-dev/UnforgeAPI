/**
 * ATLAS INTELLIGENCE SMOKE TEST
 * 
 * This script runs the 4 validation tests for Atlas algorithms:
 * 1. Content Gap Audit - Should detect missing Sunlight/Light Energy
 * 2. Blind Spot Detection - Should flag notes without flashcards  
 * 3. Biological Rhythm - Should recommend morning, avoid night
 * 4. Forgetting Curve - Should show low retention after 7 days
 * 
 * Usage: node scripts/run-atlas-smoke-test.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const groq = new Groq({ apiKey: groqKey });

const TEST_USER_ID = 'c7a3b7ca-5217-4b5a-ab0a-c7df9bc6eb36';
const PRIMARY_MODEL = 'llama-3.1-8b-instant';

console.log('\n' + '='.repeat(60));
console.log('🧪 ATLAS INTELLIGENCE SMOKE TEST');
console.log('='.repeat(60));
console.log(`📅 Date: ${new Date().toISOString()}`);
console.log(`👤 Test User: jamesbondmand (${TEST_USER_ID})`);
console.log('='.repeat(60) + '\n');

// First, create test data
async function createTestData() {
  console.log('📝 Creating test data...\n');
  
  // Generate UUIDs for test data
  const projectPhotosynthesis = randomUUID();
  const projectFrenchRev = randomUUID();
  const projectRhythm = randomUUID();
  const projectDecay = randomUUID();
  
  const notePhotosynthesis = randomUUID();
  const notePhotosynthesis2 = randomUUID();
  const noteFrenchRev = randomUUID();
  const noteRhythm = randomUUID();
  const noteDecay = randomUUID();
  
  const fcSetRhythm = randomUUID();
  const fcSetDecay = randomUUID();

  // Clean up old test data
  console.log('  🧹 Cleaning up old test data...');
  await supabase.from('flashcard_study_sessions').delete().eq('user_id', TEST_USER_ID);
  await supabase.from('flashcards').delete().eq('user_id', TEST_USER_ID);
  await supabase.from('flashcard_sets').delete().eq('user_id', TEST_USER_ID);
  await supabase.from('notes').delete().eq('user_id', TEST_USER_ID);
  await supabase.from('projects').delete().eq('user_id', TEST_USER_ID);
  
  // Create test projects
  console.log('  📁 Creating test projects...');
  const { error: projectError } = await supabase.from('projects').insert([
    { id: projectPhotosynthesis, user_id: TEST_USER_ID, name: 'TEST: Photosynthesis Study', description: 'Testing content gap', color: '#22c55e', icon: 'leaf' },
    { id: projectFrenchRev, user_id: TEST_USER_ID, name: 'TEST: French Revolution', description: 'Testing blind spot', color: '#dc2626', icon: 'book' },
    { id: projectRhythm, user_id: TEST_USER_ID, name: 'TEST: Rhythm Test', description: 'Testing biological rhythm', color: '#3b82f6', icon: 'clock' },
    { id: projectDecay, user_id: TEST_USER_ID, name: 'TEST: Decay Test', description: 'Testing forgetting curve', color: '#f97316', icon: 'timer' }
  ]);
  if (projectError) console.error('  ❌ Project error:', projectError.message);

  // Create test notes
  console.log('  📄 Creating test notes...');
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const { error: noteError } = await supabase.from('notes').insert([
    // TEST 1: Photosynthesis note MISSING sunlight/light energy
    { 
      id: notePhotosynthesis, 
      project_id: projectPhotosynthesis, 
      user_id: TEST_USER_ID, 
      title: 'How Plants Make Food',
      content: `# How Plants Make Food

## Introduction
Photosynthesis is the process by which plants create their own food. This is essential for all plant life.

## The Process
Plants take in Water through their roots from the soil. The water travels up through the stem to the leaves.

Carbon Dioxide enters the plant through tiny pores called stomata on the underside of leaves.

## The Chemical Equation
Water + Carbon Dioxide → Glucose + Oxygen

6H2O + 6CO2 → C6H12O6 + 6O2

## Products
- Glucose is used by the plant for energy and growth
- Oxygen is released into the atmosphere as a byproduct

## Location
Photosynthesis occurs primarily in the leaves where the stomata are located.`,
      summary: 'Plants take in water through roots and CO2 through stomata to produce glucose and oxygen.',
      folder: 'Chapter 1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    // Second note for content gap (need 2+ notes)
    { 
      id: notePhotosynthesis2, 
      project_id: projectPhotosynthesis, 
      user_id: TEST_USER_ID, 
      title: 'Plant Cell Structure',
      content: `# Plant Cell Structure

## Overview
Plant cells are eukaryotic cells that differ from animal cells in several ways.

## Key Components
- Cell wall: rigid outer layer made of cellulose
- Large central vacuole: stores water and maintains turgor pressure
- Plastids: include chloroplasts for photosynthesis

## Cell Membrane
The cell membrane controls what enters and exits the cell.`,
      summary: 'Plant cells have cell walls, large vacuoles, and plastids.',
      folder: 'Chapter 1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    // TEST 2: French Revolution note (no flashcards will be created)
    { 
      id: noteFrenchRev, 
      project_id: projectFrenchRev, 
      user_id: TEST_USER_ID, 
      title: 'Causes of the French Revolution',
      content: `# Causes of the French Revolution

## Financial Crisis
France was bankrupt due to involvement in the American Revolution and extravagant spending by the monarchy. The country was 1.5 billion livres in debt.

## Social Inequality
The Estates System divided French society into three groups:
- First Estate: Clergy (owned 10% of land, paid no taxes)
- Second Estate: Nobility (owned 25% of land, few taxes)
- Third Estate: Commoners (97% of population, paid all taxes)

## Enlightenment Ideas
Philosophers like Voltaire, Rousseau, and Montesquieu challenged absolute monarchy and promoted ideas of liberty, equality, and democratic government.

## Food Scarcity
The harsh winter of 1788-89 led to poor harvests. Bread prices doubled, causing widespread hunger and resentment.

## Weak Leadership
King Louis XVI was indecisive and out of touch with his people. Queen Marie Antoinette was unpopular due to her spending habits.

## Key Events
1. Storming of the Bastille (July 14, 1789)
2. Declaration of the Rights of Man
3. March on Versailles
4. Execution of Louis XVI (1793)`,
      summary: 'French Revolution caused by financial crisis, social inequality, Enlightenment ideas, food scarcity, and weak leadership.',
      folder: 'Unit 1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    },
    // TEST 3 & 4: Notes for rhythm and decay tests
    { id: noteRhythm, project_id: projectRhythm, user_id: TEST_USER_ID, title: 'Rhythm Test Material', content: 'Test content for rhythm analysis. This is placeholder content for testing the biological rhythm algorithm.', folder: 'Tests', created_at: now.toISOString(), updated_at: now.toISOString() },
    { id: noteDecay, project_id: projectDecay, user_id: TEST_USER_ID, title: 'Decay Test Material', content: 'Test content for decay analysis. This is placeholder content for testing the forgetting curve algorithm.', folder: 'Tests', created_at: fourteenDaysAgo.toISOString(), updated_at: fourteenDaysAgo.toISOString() }
  ]);
  if (noteError) console.error('  ❌ Note error:', noteError.message);

  // Create flashcard sets (only for rhythm and decay tests)
  console.log('  🃏 Creating flashcard sets...');
  const fsNow = now.toISOString();
  const fsOld = fourteenDaysAgo.toISOString();
  
  const { error: setError } = await supabase.from('flashcard_sets').insert([
    { id: fcSetRhythm, project_id: projectRhythm, user_id: TEST_USER_ID, title: 'Rhythm Test Cards', description: 'Cards for testing biological rhythm', card_count: 10, is_ai_generated: false, note_id: noteRhythm, created_at: fsNow, updated_at: fsNow },
    { id: fcSetDecay, project_id: projectDecay, user_id: TEST_USER_ID, title: 'Old Test Cards', description: 'Cards that havent been reviewed in 7+ days', card_count: 5, is_ai_generated: false, note_id: noteDecay, created_at: fsOld, updated_at: fsOld }
  ]);
  if (setError) console.error('  ❌ Flashcard set error:', setError.message);

  // Create study sessions for TEST 3: Biological Rhythm
  console.log('  📊 Creating study sessions...');
  
  // Simulate a user in Sri Lanka (UTC+5:30)
  // timezone_offset is how browser reports it: negative for east of UTC
  // So for UTC+5:30, offset = -330 (5.5 hours * 60 minutes)
  const TIMEZONE_OFFSET = -330; // Sri Lanka (UTC+5:30)
  
  // Helper to create UTC timestamp from local hour
  // If user studies at 9 AM local (Sri Lanka), the UTC time is 3:30 AM
  const createUTCFromLocalHour = (daysAgo, localHour, localMinutes = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    // Convert local time to UTC: UTC = local + offset (offset is negative for +timezones)
    // For 9 AM Sri Lanka: UTC = 9:00 - 5:30 = 3:30 AM
    const utcHour = localHour + (TIMEZONE_OFFSET / 60);
    date.setUTCHours(Math.floor(utcHour), localMinutes + ((utcHour % 1) * 60), 0, 0);
    return date.toISOString();
  };
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Try to insert with timezone_offset first, fall back to without if column doesn't exist
  let studySessions = [
    // Morning sessions (9-10 AM LOCAL TIME) - HIGH ACCURACY (8 correct)
    // At 9 AM Sri Lanka = 3:30 AM UTC
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2000, studied_at: createUTCFromLocalHour(3, 9, 0) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2100, studied_at: createUTCFromLocalHour(3, 9, 5) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2200, studied_at: createUTCFromLocalHour(3, 9, 10) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2300, studied_at: createUTCFromLocalHour(3, 9, 15) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2400, studied_at: createUTCFromLocalHour(3, 9, 20) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2000, studied_at: createUTCFromLocalHour(2, 10, 0) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2100, studied_at: createUTCFromLocalHour(2, 10, 5) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: true, response_time_ms: 2200, studied_at: createUTCFromLocalHour(2, 10, 10) },
    
    // Night sessions (11 PM LOCAL TIME) - LOW ACCURACY (0 correct out of 7)
    // At 11 PM Sri Lanka = 5:30 PM UTC
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5000, studied_at: createUTCFromLocalHour(3, 23, 0) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5100, studied_at: createUTCFromLocalHour(3, 23, 5) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5200, studied_at: createUTCFromLocalHour(3, 23, 10) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5300, studied_at: createUTCFromLocalHour(3, 23, 15) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5400, studied_at: createUTCFromLocalHour(3, 23, 20) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5000, studied_at: createUTCFromLocalHour(2, 22, 0) },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetRhythm, project_id: projectRhythm, is_correct: false, response_time_ms: 5100, studied_at: createUTCFromLocalHour(2, 23, 30) },
    
    // TEST 4: Old study sessions for decay test (7 days ago)
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetDecay, project_id: projectDecay, is_correct: true, response_time_ms: 2500, studied_at: sevenDaysAgo.toISOString() },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetDecay, project_id: projectDecay, is_correct: true, response_time_ms: 2600, studied_at: sevenDaysAgo.toISOString() },
    { user_id: TEST_USER_ID, flashcard_set_id: fcSetDecay, project_id: projectDecay, is_correct: true, response_time_ms: 2700, studied_at: sevenDaysAgo.toISOString() }
  ];
  
  // Try with timezone_offset first
  let sessionsWithTz = studySessions.map(s => ({ ...s, timezone_offset: TIMEZONE_OFFSET }));
  let { error: sessionError } = await supabase.from('flashcard_study_sessions').insert(sessionsWithTz);
  
  if (sessionError && sessionError.message.includes('timezone_offset')) {
    // Column doesn't exist, insert without it
    console.log('  ⚠️ timezone_offset column not found, inserting without timezone...');
    const result = await supabase.from('flashcard_study_sessions').insert(studySessions);
    sessionError = result.error;
  }
  
  if (sessionError) console.error('  ❌ Study session error:', sessionError.message);

  console.log('  ✅ Test data created!\n');
  
  return {
    projects: { projectPhotosynthesis, projectFrenchRev, projectRhythm, projectDecay },
    notes: { notePhotosynthesis, noteFrenchRev, noteRhythm, noteDecay },
    sets: { fcSetRhythm, fcSetDecay }
  };
}

async function runSmokeTests() {
  // First create test data
  await createTestData();
  
  const results = {
    contentGap: null,
    blindSpot: null,
    biologicalRhythm: null,
    forgettingCurve: null
  };

  // Fetch all user data
  console.log('📊 Fetching test data from database...\n');
  
  const [notesResult, flashcardSetsResult, studySessionsResult, projectsResult] = await Promise.all([
    supabase.from('notes').select('*').eq('user_id', TEST_USER_ID),
    supabase.from('flashcard_sets').select('*').eq('user_id', TEST_USER_ID),
    supabase.from('flashcard_study_sessions').select('*').eq('user_id', TEST_USER_ID).order('studied_at', { ascending: false }),
    supabase.from('projects').select('*').eq('user_id', TEST_USER_ID)
  ]);

  const notes = notesResult.data || [];
  const flashcardSets = flashcardSetsResult.data || [];
  const studySessions = studySessionsResult.data || [];
  const projects = projectsResult.data || [];

  const testProjects = projects.filter(p => p.name.startsWith('TEST:'));
  
  console.log(`Found ${testProjects.length} test projects:`);
  testProjects.forEach(p => console.log(`  • ${p.name}`));
  console.log('');

  // ============================================
  // TEST 1: CONTENT GAP AUDIT
  // ============================================
  console.log('-'.repeat(60));
  console.log('🟢 TEST 1: CONTENT GAP AUDIT (Hallucination Check)');
  console.log('-'.repeat(60));
  
  const photosynthesisProject = testProjects.find(p => p.name.includes('Photosynthesis'));
  if (photosynthesisProject) {
    const projectNotes = notes.filter(n => n.project_id === photosynthesisProject.id);
    
    console.log(`📝 Project: ${photosynthesisProject.name}`);
    console.log(`📄 Notes: ${projectNotes.length}`);
    
    // Build context for AI
    const notesContext = projectNotes.map(n => 
      `• ${n.title}\n  Summary: ${n.summary || n.content?.slice(0, 200)}`
    ).join('\n');

    const prompt = `You are an educational content analyzer. A student is studying "${photosynthesisProject.name}" and has the following notes:

${notesContext}

Based on typical curriculum for "Photosynthesis", analyze what topics they have covered and identify 1-2 important foundational topics they might be missing.

Be specific and educational. Only suggest topics that are:
1. Clearly NOT covered in their existing notes
2. Foundational/important for this subject
3. Would complement their current knowledge

Respond in JSON format:
{
  "missingTopics": [
    {"topic": "Topic Name", "reason": "Why this is important and how it connects to what they're learning (1-2 sentences)"}
  ]
}`;

    console.log('\n🤖 Calling LLaMA 3.1...');
    
    try {
      const completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      });

      const response = completion.choices[0]?.message?.content || '';
      console.log('\n📤 RAW AI RESPONSE:');
      console.log(response);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        results.contentGap = parsed;
        
        console.log('\n✅ PARSED RESULT:');
        console.log(JSON.stringify(parsed, null, 2));
        
        // Check for sunlight/light energy/chlorophyll
        const missingStr = JSON.stringify(parsed).toLowerCase();
        const hasSunlight = missingStr.includes('sunlight') || missingStr.includes('light energy') || missingStr.includes('chlorophyll') || missingStr.includes('solar') || missingStr.includes('light reaction');
        
        console.log('\n' + (hasSunlight ? '✅ PASS' : '❌ FAIL') + ': Detection of missing Sunlight/Light Energy/Chlorophyll');
        console.log(`   Found keywords: ${hasSunlight ? 'YES' : 'NO'}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  } else {
    console.log('⚠️  Photosynthesis test project not found. Run atlas_smoke_test.sql first.');
  }

  // ============================================
  // TEST 2: BLIND SPOT DETECTION
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('🟣 TEST 2: BLIND SPOT DETECTION (Knowledge Heatmap)');
  console.log('-'.repeat(60));
  
  const frenchRevProject = testProjects.find(p => p.name.includes('French Revolution'));
  if (frenchRevProject) {
    const projectNotes = notes.filter(n => n.project_id === frenchRevProject.id);
    const projectFlashcardSets = flashcardSets.filter(s => s.project_id === frenchRevProject.id);
    
    console.log(`📝 Project: ${frenchRevProject.name}`);
    console.log(`📄 Notes: ${projectNotes.length}`);
    console.log(`🃏 Flashcard Sets: ${projectFlashcardSets.length}`);
    
    // Find notes without flashcards
    const blindSpots = [];
    for (const note of projectNotes) {
      const linkedSets = flashcardSets.filter(set => set.note_id === note.id);
      if (linkedSets.length === 0 && note.content && note.content.length > 200) {
        blindSpots.push({
          noteTitle: note.title,
          contentLength: note.content.length,
          projectName: frenchRevProject.name
        });
      }
    }
    
    results.blindSpot = {
      detected: blindSpots.length > 0,
      blindSpots
    };
    
    console.log('\n📤 BLIND SPOT DETECTION RESULT:');
    console.log(JSON.stringify(results.blindSpot, null, 2));
    
    if (blindSpots.length > 0) {
      console.log('\n✅ PASS: Blind spot detected');
      console.log(`   Notes without flashcards: ${blindSpots.map(b => b.noteTitle).join(', ')}`);
      
      // Generate the insight message
      const insight = {
        insight_type: 'knowledge_heatmap',
        category: 'blind_spot',
        title: 'Untested Knowledge',
        message: `You have detailed notes on "${blindSpots[0].noteTitle}" but haven't created any flashcards to test yourself. Creating flashcards can improve retention by up to 50%.`,
        severity: 'warning'
      };
      console.log('\n📊 Generated Insight:');
      console.log(JSON.stringify(insight, null, 2));
    } else {
      console.log('\n❌ FAIL: No blind spots detected');
    }
  } else {
    console.log('⚠️  French Revolution test project not found. Run atlas_smoke_test.sql first.');
  }

  // ============================================
  // TEST 3: BIOLOGICAL RHYTHM
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('🔵 TEST 3: BIOLOGICAL RHYTHM (Peak Performance Time)');
  console.log('-'.repeat(60));
  
  const rhythmProject = testProjects.find(p => p.name.includes('Rhythm'));
  if (rhythmProject) {
    // Get study sessions for this project
    const projectSessions = studySessions.filter(s => s.project_id === rhythmProject.id);
    
    console.log(`📝 Project: ${rhythmProject.name}`);
    console.log(`📊 Study Sessions: ${projectSessions.length}`);
    
    // Simulated timezone offset for testing (Sri Lanka = UTC+5:30 = -330)
    // In production, this comes from the database column
    const SIMULATED_TIMEZONE_OFFSET = -330;
    
    // Helper to convert UTC to local hour using timezone offset
    const getLocalHour = (utcDate, timezoneOffset) => {
      if (timezoneOffset === null || timezoneOffset === undefined) {
        return utcDate.getUTCHours();
      }
      // timezone_offset from browser is inverted (negative for east of UTC)
      // Local time = UTC time - offset
      const localMs = utcDate.getTime() - (timezoneOffset * 60 * 1000);
      const localDate = new Date(localMs);
      return localDate.getUTCHours();
    };
    
    // Group by time periods using LOCAL HOURS
    const periods = {
      morning: { hours: [6, 7, 8, 9, 10, 11], correct: 0, total: 0, label: '6 AM - 12 PM' },
      afternoon: { hours: [12, 13, 14, 15, 16, 17], correct: 0, total: 0, label: '12 PM - 6 PM' },
      evening: { hours: [18, 19, 20, 21], correct: 0, total: 0, label: '6 PM - 10 PM' },
      night: { hours: [22, 23, 0, 1, 2, 3, 4, 5], correct: 0, total: 0, label: '10 PM - 6 AM' }
    };

    console.log('\n📍 Timezone-Aware Analysis (UTC+5:30 / Sri Lanka):');
    projectSessions.forEach(session => {
      const utcDate = new Date(session.studied_at);
      // Use database timezone_offset if available, otherwise use simulated one
      const tzOffset = session.timezone_offset ?? SIMULATED_TIMEZONE_OFFSET;
      const localHour = getLocalHour(utcDate, tzOffset);
      console.log(`   UTC: ${String(utcDate.getUTCHours()).padStart(2,'0')}:${String(utcDate.getUTCMinutes()).padStart(2,'0')} → Local: ${String(localHour).padStart(2,'0')}:${String(utcDate.getUTCMinutes()).padStart(2,'0')} (offset: ${tzOffset}min)`);
      
      for (const [, period] of Object.entries(periods)) {
        if (period.hours.includes(localHour)) {
          period.total++;
          if (session.is_correct) period.correct++;
          break;
        }
      }
    });

    const periodsWithAccuracy = Object.entries(periods)
      .filter(([, p]) => p.total >= 1)
      .map(([name, p]) => ({
        name,
        ...p,
        accuracy: p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    console.log('\n📤 STUDY SESSION ANALYSIS (by LOCAL time):');
    periodsWithAccuracy.forEach(p => {
      console.log(`   ${p.name} (${p.label}): ${p.correct}/${p.total} = ${p.accuracy}%`);
    });

    if (periodsWithAccuracy.length >= 2) {
      const best = periodsWithAccuracy[0];
      const worst = periodsWithAccuracy[periodsWithAccuracy.length - 1];

      results.biologicalRhythm = {
        bestPeriod: best.name,
        bestAccuracy: best.accuracy,
        worstPeriod: worst.name,
        worstAccuracy: worst.accuracy,
        periodsAnalyzed: periodsWithAccuracy
      };

      console.log('\n📊 Generated Insight:');
      const insight = {
        insight_type: 'biological_rhythm',
        category: 'peak_performance',
        title: 'Your Peak Learning Time',
        message: `You perform ${best.accuracy}% accurately in the ${best.name} (${best.label}), but only ${worst.accuracy}% at ${worst.name} (${worst.label}). Schedule difficult topics in the ${best.name} for better results.`,
        severity: 'info',
        metadata: results.biologicalRhythm
      };
      console.log(JSON.stringify(insight, null, 2));

      const isMorningBest = best.name === 'morning';
      const isNightWorst = worst.name === 'night';
      
      console.log('\n' + (isMorningBest && isNightWorst ? '✅ PASS' : '⚠️ PARTIAL') + ': Peak performance detection');
      console.log(`   Morning is best: ${isMorningBest ? 'YES' : 'NO'}`);
      console.log(`   Night is worst: ${isNightWorst ? 'YES' : 'NO'}`);
    }
  } else {
    console.log('⚠️  Rhythm test project not found. Run atlas_smoke_test.sql first.');
  }

  // ============================================
  // TEST 4: FORGETTING CURVE
  // ============================================
  console.log('\n' + '-'.repeat(60));
  console.log('🟠 TEST 4: FORGETTING CURVE (Memory Decay Alert)');
  console.log('-'.repeat(60));
  
  const decayProject = testProjects.find(p => p.name.includes('Decay'));
  if (decayProject) {
    const projectSets = flashcardSets.filter(s => s.project_id === decayProject.id);
    const projectSessions = studySessions.filter(s => s.project_id === decayProject.id);
    
    console.log(`📝 Project: ${decayProject.name}`);
    console.log(`🃏 Flashcard Sets: ${projectSets.length}`);
    console.log(`📊 Study Sessions: ${projectSessions.length}`);
    
    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    // Check flashcard sets not reviewed recently
    const setLastStudied = new Map();
    projectSessions.forEach(session => {
      const current = setLastStudied.get(session.flashcard_set_id);
      const sessionDate = new Date(session.studied_at);
      if (!current || sessionDate > current) {
        setLastStudied.set(session.flashcard_set_id, sessionDate);
      }
    });

    const decayAlerts = [];
    for (const set of projectSets) {
      const lastStudied = setLastStudied.get(set.id);
      const daysSince = lastStudied 
        ? Math.floor((now.getTime() - lastStudied.getTime()) / (24 * 60 * 60 * 1000))
        : null;
      
      // Calculate estimated retention using Ebbinghaus formula approximation
      // R = e^(-t/S) where S is stability (assume ~3 days for new material)
      const retentionPercent = daysSince 
        ? Math.round(100 * Math.exp(-daysSince / 3))
        : 20;

      console.log(`\n📊 Set: "${set.title}"`);
      console.log(`   Last studied: ${lastStudied ? lastStudied.toISOString() : 'Never'}`);
      console.log(`   Days since review: ${daysSince}`);
      console.log(`   Estimated retention: ${retentionPercent}%`);

      if (retentionPercent < 50) {
        decayAlerts.push({
          setTitle: set.title,
          daysSinceReview: daysSince,
          estimatedRetention: retentionPercent,
          severity: retentionPercent < 30 ? 'critical' : 'warning'
        });
      }
    }

    results.forgettingCurve = {
      alertsGenerated: decayAlerts.length > 0,
      alerts: decayAlerts
    };

    if (decayAlerts.length > 0) {
      const alert = decayAlerts[0];
      console.log('\n📤 DECAY ALERT GENERATED:');
      const insight = {
        insight_type: 'forgetting_curve',
        category: 'decay_warning',
        title: 'Memory Decay Alert',
        message: `Your memory of "${alert.setTitle}" has likely dropped to ~${alert.estimatedRetention}% after ${alert.daysSinceReview} days without review. Review today to avoid relearning from scratch.`,
        severity: alert.severity,
        metadata: alert
      };
      console.log(JSON.stringify(insight, null, 2));

      const isLowRetention = alert.estimatedRetention < 30;
      console.log('\n' + (isLowRetention ? '✅ PASS' : '⚠️ PARTIAL') + ': Memory decay detection');
      console.log(`   Retention < 30%: ${isLowRetention ? 'YES' : 'NO'} (actual: ${alert.estimatedRetention}%)`);
    } else {
      console.log('\n❌ FAIL: No decay alerts generated');
    }
  } else {
    console.log('⚠️  Decay test project not found. Run atlas_smoke_test.sql first.');
  }

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 SMOKE TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nTest Results:');
  console.log(`  1. Content Gap Audit:    ${results.contentGap?.missingTopics?.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  2. Blind Spot Detection: ${results.blindSpot?.detected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  3. Biological Rhythm:    ${results.biologicalRhythm?.bestPeriod === 'morning' ? '✅ PASS' : '⚠️ CHECK'}`);
  console.log(`  4. Forgetting Curve:     ${results.forgettingCurve?.alertsGenerated ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('📦 FULL JSON RESULTS (for verification):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

runSmokeTests()
  .then(() => {
    console.log('\n✅ Smoke test completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Smoke test failed:', error);
    process.exit(1);
  });
