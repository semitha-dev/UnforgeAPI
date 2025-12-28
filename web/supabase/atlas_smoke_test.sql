-- ============================================
-- ATLAS INTELLIGENCE SMOKE TEST DATA
-- ============================================
-- Run this SQL to set up test data for validating Atlas algorithms
-- Test User: jamesbondmand (c7a3b7ca-5217-4b5a-ab0a-c7df9bc6eb36)
-- Date: December 28, 2025

DO $$
DECLARE
    v_user_id uuid := 'c7a3b7ca-5217-4b5a-ab0a-c7df9bc6eb36';
    
    -- Test Project IDs
    v_project_photosynthesis uuid := gen_random_uuid();
    v_project_french_rev uuid := gen_random_uuid();
    v_project_rhythm_test uuid := gen_random_uuid();
    v_project_decay_test uuid := gen_random_uuid();
    
    -- Note IDs
    v_note_photosynthesis uuid := gen_random_uuid();
    v_note_french_rev uuid := gen_random_uuid();
    v_note_rhythm uuid := gen_random_uuid();
    v_note_decay uuid := gen_random_uuid();
    
    -- Flashcard Set IDs (for decay test only)
    v_fc_set_decay uuid := gen_random_uuid();
    v_fc_set_rhythm uuid := gen_random_uuid();
    
BEGIN
    -- Clear previous test data (optional - comment out if you want to keep existing data)
    DELETE FROM public.insights WHERE user_id = v_user_id AND insight_date = CURRENT_DATE;
    DELETE FROM public.flashcard_study_sessions WHERE user_id = v_user_id AND studied_at > NOW() - INTERVAL '1 hour';
    DELETE FROM public.projects WHERE user_id = v_user_id AND name LIKE 'TEST:%';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ATLAS SMOKE TEST - Creating Test Data';
    RAISE NOTICE '===========================================';

    -- ============================================
    -- TEST 1: CONTENT GAP AUDIT (Hallucination Check)
    -- ============================================
    -- Create project with a note about photosynthesis that OMITS sunlight/light energy
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 1: Content Gap Audit';
    RAISE NOTICE 'Creating "Photosynthesis Test" with incomplete note...';
    
    INSERT INTO public.projects (id, user_id, name, description, color, icon, created_at, updated_at) VALUES
    (v_project_photosynthesis, v_user_id, 'TEST: Photosynthesis Study', 'Testing content gap detection', '#22c55e', 'leaf', NOW(), NOW());
    
    -- Note that DELIBERATELY OMITS Sunlight/Light Energy/Chlorophyll
    INSERT INTO public.notes (id, project_id, user_id, title, content, summary, folder, created_at, updated_at) VALUES
    (v_note_photosynthesis, v_project_photosynthesis, v_user_id, 'How Plants Make Food',
    E'# How Plants Make Food\n\n## Introduction\nPhotosynthesis is the process by which plants create their own food. This is essential for all plant life.\n\n## The Process\nPlants take in Water through their roots from the soil. The water travels up through the stem to the leaves.\n\nCarbon Dioxide enters the plant through tiny pores called stomata on the underside of leaves.\n\n## The Chemical Equation\nWater + Carbon Dioxide → Glucose + Oxygen\n\n6H2O + 6CO2 → C6H12O6 + 6O2\n\n## Products\n- Glucose is used by the plant for energy and growth\n- Oxygen is released into the atmosphere as a byproduct\n\n## Location\nPhotosynthesis occurs primarily in the leaves where the stomata are located.',
    'Plants take in water through roots and CO2 through stomata to produce glucose and oxygen.',
    'Chapter 1', NOW(), NOW()),
    
    -- Second note to meet the 2-note minimum for content gap analysis
    (gen_random_uuid(), v_project_photosynthesis, v_user_id, 'Plant Cell Structure',
    E'# Plant Cell Structure\n\n## Overview\nPlant cells are eukaryotic cells that differ from animal cells in several ways.\n\n## Key Components\n- Cell wall: rigid outer layer made of cellulose\n- Large central vacuole: stores water and maintains turgor pressure\n- Plastids: include chloroplasts for photosynthesis\n\n## Cell Membrane\nThe cell membrane controls what enters and exits the cell.',
    'Plant cells have cell walls, large vacuoles, and plastids.',
    'Chapter 1', NOW(), NOW());
    
    RAISE NOTICE 'SUCCESS CRITERIA: Must detect missing Sunlight/Light Energy/Chlorophyll';

    -- ============================================
    -- TEST 2: BLIND SPOT DETECTION (Knowledge Heatmap)
    -- ============================================
    -- Create project with notes but NO flashcards
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 2: Blind Spot Detection (Heatmap)';
    RAISE NOTICE 'Creating "French Revolution" project with notes but NO flashcards...';
    
    INSERT INTO public.projects (id, user_id, name, description, color, icon, created_at, updated_at) VALUES
    (v_project_french_rev, v_user_id, 'TEST: French Revolution', 'Testing blind spot detection', '#dc2626', 'book', NOW(), NOW());
    
    -- Detailed notes WITHOUT any linked flashcards
    INSERT INTO public.notes (id, project_id, user_id, title, content, summary, folder, created_at, updated_at) VALUES
    (v_note_french_rev, v_project_french_rev, v_user_id, 'Causes of the French Revolution',
    E'# Causes of the French Revolution\n\n## Financial Crisis\nFrance was bankrupt due to involvement in the American Revolution and extravagant spending by the monarchy. The country was 1.5 billion livres in debt.\n\n## Social Inequality\nThe Estates System divided French society into three groups:\n- First Estate: Clergy (owned 10% of land, paid no taxes)\n- Second Estate: Nobility (owned 25% of land, few taxes)\n- Third Estate: Commoners (97% of population, paid all taxes)\n\n## Enlightenment Ideas\nPhilosophers like Voltaire, Rousseau, and Montesquieu challenged absolute monarchy and promoted ideas of liberty, equality, and democratic government.\n\n## Food Scarcity\nThe harsh winter of 1788-89 led to poor harvests. Bread prices doubled, causing widespread hunger and resentment.\n\n## Weak Leadership\nKing Louis XVI was indecisive and out of touch with his people. Queen Marie Antoinette was unpopular due to her spending habits.\n\n## Key Events\n1. Storming of the Bastille (July 14, 1789)\n2. Declaration of the Rights of Man\n3. March on Versailles\n4. Execution of Louis XVI (1793)',
    'French Revolution caused by financial crisis, social inequality, Enlightenment ideas, food scarcity, and weak leadership.',
    'Unit 1', NOW(), NOW());
    
    -- NO flashcards created - this is intentional for the blind spot test
    RAISE NOTICE 'SUCCESS CRITERIA: Must show "Untested Knowledge" warning for French Revolution notes';

    -- ============================================
    -- TEST 3: BIOLOGICAL RHYTHM (Peak Performance Time)
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 3: Biological Rhythm Analysis';
    RAISE NOTICE 'Creating study sessions at 9 AM (high accuracy) and 11 PM (low accuracy)...';
    
    INSERT INTO public.projects (id, user_id, name, description, color, icon, created_at, updated_at) VALUES
    (v_project_rhythm_test, v_user_id, 'TEST: Rhythm Test', 'Testing biological rhythm detection', '#3b82f6', 'clock', NOW(), NOW());
    
    INSERT INTO public.notes (id, project_id, user_id, title, content, folder, created_at, updated_at) VALUES
    (v_note_rhythm, v_project_rhythm_test, v_user_id, 'Rhythm Test Material', 'Test content for rhythm analysis', 'Tests', NOW(), NOW());
    
    INSERT INTO public.flashcard_sets (id, project_id, user_id, title, description, card_count, is_ai_generated, note_id, created_at, updated_at) VALUES
    (v_fc_set_rhythm, v_project_rhythm_test, v_user_id, 'Rhythm Test Cards', 'Cards for testing biological rhythm', 10, false, v_note_rhythm, NOW(), NOW());
    
    -- Morning sessions (9 AM) - HIGH ACCURACY (5 correct)
    -- Note: studied_at includes time, hour_of_day is auto-generated
    INSERT INTO public.flashcard_study_sessions (user_id, flashcard_set_id, project_id, is_correct, response_time_ms, studied_at) VALUES
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2000, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '9 hours'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2100, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '9 hours 5 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2200, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '9 hours 10 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2300, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '9 hours 15 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2400, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '9 hours 20 minutes'),
    -- Additional morning sessions for robustness
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2000, (CURRENT_DATE - INTERVAL '2 days') + INTERVAL '10 hours'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2100, (CURRENT_DATE - INTERVAL '2 days') + INTERVAL '10 hours 5 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, true, 2200, (CURRENT_DATE - INTERVAL '2 days') + INTERVAL '10 hours 10 minutes');
    
    -- Late night sessions (11 PM / 23:00) - LOW ACCURACY (5 wrong)
    INSERT INTO public.flashcard_study_sessions (user_id, flashcard_set_id, project_id, is_correct, response_time_ms, studied_at) VALUES
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5000, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '23 hours'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5100, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '23 hours 5 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5200, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '23 hours 10 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5300, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '23 hours 15 minutes'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5400, (CURRENT_DATE - INTERVAL '3 days') + INTERVAL '23 hours 20 minutes'),
    -- Additional night sessions for robustness
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5000, (CURRENT_DATE - INTERVAL '2 days') + INTERVAL '22 hours'),
    (v_user_id, v_fc_set_rhythm, v_project_rhythm_test, false, 5100, (CURRENT_DATE - INTERVAL '2 days') + INTERVAL '23 hours 30 minutes');
    
    RAISE NOTICE 'SUCCESS CRITERIA: Must recommend Morning (9-11 AM) and avoid Night (10 PM - 6 AM)';

    -- ============================================
    -- TEST 4: FORGETTING CURVE (Decay Meter)
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 4: Forgetting Curve / Decay Meter';
    RAISE NOTICE 'Creating flashcard set with last study 7+ days ago...';
    
    INSERT INTO public.projects (id, user_id, name, description, color, icon, created_at, updated_at) VALUES
    (v_project_decay_test, v_user_id, 'TEST: Decay Test', 'Testing forgetting curve detection', '#f97316', 'timer', NOW(), NOW());
    
    INSERT INTO public.notes (id, project_id, user_id, title, content, folder, created_at, updated_at) VALUES
    (v_note_decay, v_project_decay_test, v_user_id, 'Decay Test Material', 'Test content for decay analysis', 'Tests', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');
    
    INSERT INTO public.flashcard_sets (id, project_id, user_id, title, description, card_count, is_ai_generated, note_id, created_at, updated_at) VALUES
    (v_fc_set_decay, v_project_decay_test, v_user_id, 'Old Test Cards', 'Cards that havent been reviewed in 7+ days', 5, false, v_note_decay, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');
    
    -- Study session from 7 days ago
    -- Ebbinghaus formula: R = e^(-t/S) where S≈3 days
    -- After 7 days: R = e^(-7/3) ≈ 0.097 ≈ 10%
    INSERT INTO public.flashcard_study_sessions (user_id, flashcard_set_id, project_id, is_correct, response_time_ms, studied_at) VALUES
    (v_user_id, v_fc_set_decay, v_project_decay_test, true, 2500, NOW() - INTERVAL '7 days'),
    (v_user_id, v_fc_set_decay, v_project_decay_test, true, 2600, NOW() - INTERVAL '7 days'),
    (v_user_id, v_fc_set_decay, v_project_decay_test, true, 2700, NOW() - INTERVAL '7 days');
    
    RAISE NOTICE 'SUCCESS CRITERIA: Must show low retention (10-30%%) and "Memory Decay Alert"';
    
    -- ============================================
    -- SUMMARY
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SMOKE TEST DATA CREATED SUCCESSFULLY';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Projects Created:';
    RAISE NOTICE '  1. TEST: Photosynthesis Study (Content Gap - missing sunlight)';
    RAISE NOTICE '  2. TEST: French Revolution (Blind Spot - no flashcards)';
    RAISE NOTICE '  3. TEST: Rhythm Test (Morning=100%%, Night=0%%)';
    RAISE NOTICE '  4. TEST: Decay Test (Last studied 7 days ago)';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Login as jamesbondmand';
    RAISE NOTICE '  2. Call POST /api/insights with {"forceRegenerate": true}';
    RAISE NOTICE '  3. Check the response JSON for all 4 insight types';
    RAISE NOTICE '';
    RAISE NOTICE 'Project IDs for reference:';
    RAISE NOTICE '  Photosynthesis: %', v_project_photosynthesis;
    RAISE NOTICE '  French Rev: %', v_project_french_rev;
    RAISE NOTICE '  Rhythm Test: %', v_project_rhythm_test;
    RAISE NOTICE '  Decay Test: %', v_project_decay_test;
    
END $$;
