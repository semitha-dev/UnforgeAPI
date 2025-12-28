-- Seed data for jamesbondmand account
-- UUID: c7a3b7ca-5217-4b5a-ab0a-c7df9bc6eb36
-- Run this after the profile has been created

DO $$
DECLARE
    v_user_id uuid := 'c7a3b7ca-5217-4b5a-ab0a-c7df9bc6eb36';
    
    -- Project IDs
    v_project_biology uuid := gen_random_uuid();
    v_project_chemistry uuid := gen_random_uuid();
    v_project_physics uuid := gen_random_uuid();
    
    -- Note IDs
    v_note_cell_bio uuid := gen_random_uuid();
    v_note_genetics uuid := gen_random_uuid();
    v_note_organic_chem uuid := gen_random_uuid();
    v_note_periodic uuid := gen_random_uuid();
    v_note_mechanics uuid := gen_random_uuid();
    v_note_thermodynamics uuid := gen_random_uuid();
    
    -- Flashcard Set IDs
    v_fc_set_cell uuid := gen_random_uuid();
    v_fc_set_genetics uuid := gen_random_uuid();
    v_fc_set_organic uuid := gen_random_uuid();
    v_fc_set_physics uuid := gen_random_uuid();
    
    -- Quiz IDs
    v_quiz_biology uuid := gen_random_uuid();
    v_quiz_chemistry uuid := gen_random_uuid();
    
    -- Schedule ID
    v_schedule_id uuid := gen_random_uuid();
    
BEGIN
    -- ============================================
    -- PROJECTS
    -- ============================================
    INSERT INTO public.projects (id, user_id, name, description, color, icon, created_at, updated_at) VALUES
    (v_project_biology, v_user_id, 'Biology 101', 'Introduction to Biology - Cell structures, genetics, and evolution', '#10b981', 'dna', NOW() - INTERVAL '30 days', NOW()),
    (v_project_chemistry, v_user_id, 'Organic Chemistry', 'Organic chemistry fundamentals - Carbon compounds and reactions', '#8b5cf6', 'flask-conical', NOW() - INTERVAL '25 days', NOW()),
    (v_project_physics, v_user_id, 'Physics Mechanics', 'Classical mechanics and thermodynamics', '#3b82f6', 'atom', NOW() - INTERVAL '20 days', NOW());

    -- ============================================
    -- NOTES
    -- ============================================
    INSERT INTO public.notes (id, project_id, user_id, title, content, summary, summary_type, summary_generated_at, folder, created_at, updated_at) VALUES
    
    -- Biology Notes
    (v_note_cell_bio, v_project_biology, v_user_id, 'Cell Structure and Function', 
    E'# Cell Structure and Function\n\n## Introduction\nCells are the basic structural and functional units of all living organisms. There are two main types of cells: prokaryotic and eukaryotic.\n\n## Prokaryotic Cells\n- No membrane-bound nucleus\n- DNA located in nucleoid region\n- Examples: bacteria, archaea\n- Generally smaller (1-10 μm)\n\n## Eukaryotic Cells\n- Membrane-bound nucleus\n- Contains organelles\n- Examples: animals, plants, fungi\n- Generally larger (10-100 μm)\n\n## Key Organelles\n\n### Nucleus\nThe control center of the cell containing genetic material (DNA). Surrounded by nuclear envelope with nuclear pores.\n\n### Mitochondria\nPowerhouse of the cell - generates ATP through cellular respiration. Has double membrane with inner folds called cristae.\n\n### Endoplasmic Reticulum\n- Rough ER: studded with ribosomes, synthesizes proteins\n- Smooth ER: lipid synthesis, detoxification\n\n### Golgi Apparatus\nModifies, packages, and ships proteins and lipids.\n\n### Ribosomes\nSite of protein synthesis. Can be free in cytoplasm or attached to rough ER.\n\n### Cell Membrane\nPhospholipid bilayer with embedded proteins. Controls what enters and exits the cell.',
    'Cells are basic units of life. Prokaryotic cells lack nucleus while eukaryotic cells have membrane-bound organelles including nucleus, mitochondria, ER, and Golgi apparatus.',
    'concise', NOW() - INTERVAL '25 days', 'Chapter 1', NOW() - INTERVAL '28 days', NOW() - INTERVAL '5 days'),
    
    (v_note_genetics, v_project_biology, v_user_id, 'Genetics and DNA',
    E'# Genetics and DNA\n\n## DNA Structure\nDNA (Deoxyribonucleic Acid) is a double helix molecule made of nucleotides.\n\n### Nucleotide Components\n1. Phosphate group\n2. Deoxyribose sugar\n3. Nitrogenous base (A, T, G, C)\n\n### Base Pairing Rules\n- Adenine (A) pairs with Thymine (T)\n- Guanine (G) pairs with Cytosine (C)\n\n## DNA Replication\nSemi-conservative process where each strand serves as template.\n\n### Steps\n1. Helicase unwinds double helix\n2. Primase adds RNA primers\n3. DNA polymerase III synthesizes new strand\n4. Ligase joins Okazaki fragments\n\n## Gene Expression\n\n### Transcription\nDNA → mRNA in nucleus\n- RNA polymerase reads template strand\n- Produces mRNA with codons\n\n### Translation\nmRNA → Protein in ribosome\n- tRNA brings amino acids\n- Codons specify amino acids\n- Stop codons end translation\n\n## Mutations\n- Point mutations: single base change\n- Frameshift: insertion or deletion\n- Can be beneficial, harmful, or neutral',
    'DNA is a double helix of nucleotides with A-T and G-C base pairing. Replication is semi-conservative. Gene expression involves transcription (DNA→mRNA) and translation (mRNA→protein).',
    'concise', NOW() - INTERVAL '20 days', 'Chapter 2', NOW() - INTERVAL '22 days', NOW() - INTERVAL '3 days'),
    
    -- Chemistry Notes
    (v_note_organic_chem, v_project_chemistry, v_user_id, 'Introduction to Organic Chemistry',
    E'# Introduction to Organic Chemistry\n\n## What is Organic Chemistry?\nThe study of carbon-containing compounds and their properties, reactions, and synthesis.\n\n## Why Carbon?\n- Can form 4 covalent bonds\n- Forms stable bonds with itself\n- Creates diverse molecular structures\n\n## Hydrocarbons\n\n### Alkanes\n- Single bonds only (saturated)\n- General formula: CnH2n+2\n- Examples: methane, ethane, propane\n- Naming: -ane suffix\n\n### Alkenes\n- Contains C=C double bond\n- General formula: CnH2n\n- More reactive than alkanes\n- Naming: -ene suffix\n\n### Alkynes\n- Contains C≡C triple bond\n- General formula: CnH2n-2\n- Very reactive\n- Naming: -yne suffix\n\n## Functional Groups\n\n| Group | Structure | Example |\n|-------|-----------|----------|\n| Alcohol | -OH | Ethanol |\n| Aldehyde | -CHO | Formaldehyde |\n| Ketone | C=O | Acetone |\n| Carboxylic Acid | -COOH | Acetic acid |\n| Amine | -NH2 | Methylamine |\n\n## Isomers\nCompounds with same molecular formula but different arrangements.\n- Structural isomers: different connectivity\n- Stereoisomers: same connectivity, different spatial arrangement',
    'Organic chemistry studies carbon compounds. Hydrocarbons include alkanes (single bonds), alkenes (double bonds), and alkynes (triple bonds). Functional groups determine reactivity.',
    'bullet', NOW() - INTERVAL '18 days', 'Unit 1', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
    
    (v_note_periodic, v_project_chemistry, v_user_id, 'Periodic Table Trends',
    E'# Periodic Table Trends\n\n## Organization\nElements arranged by atomic number (Z). Rows = periods, Columns = groups.\n\n## Atomic Radius\n- **Across period (left to right)**: DECREASES\n  - More protons, stronger pull on electrons\n- **Down a group**: INCREASES\n  - More electron shells\n\n## Ionization Energy\nEnergy needed to remove an electron.\n- **Across period**: INCREASES\n- **Down group**: DECREASES\n\n## Electronegativity\nAbility to attract electrons in a bond.\n- **Across period**: INCREASES\n- **Down group**: DECREASES\n- Fluorine is most electronegative (4.0)\n\n## Electron Affinity\nEnergy change when atom gains electron.\n- Generally increases across period\n- Halogens have high electron affinity\n\n## Metallic Character\n- **Across period**: DECREASES\n- **Down group**: INCREASES\n- Metals on left, nonmetals on right\n\n## Summary Table\n| Trend | Across Period | Down Group |\n|-------|---------------|------------|\n| Atomic radius | ↓ | ↑ |\n| Ionization energy | ↑ | ↓ |\n| Electronegativity | ↑ | ↓ |\n| Metallic character | ↓ | ↑ |',
    'Periodic trends: Atomic radius decreases across, increases down. Ionization energy and electronegativity increase across, decrease down. Metallic character decreases across, increases down.',
    'concise', NOW() - INTERVAL '15 days', 'Unit 2', NOW() - INTERVAL '17 days', NOW() - INTERVAL '1 day'),
    
    -- Physics Notes
    (v_note_mechanics, v_project_physics, v_user_id, 'Classical Mechanics',
    E'# Classical Mechanics\n\n## Newton''s Laws of Motion\n\n### First Law (Inertia)\nAn object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.\n\n### Second Law\nF = ma\n- Force equals mass times acceleration\n- Net force causes acceleration\n\n### Third Law\nFor every action, there is an equal and opposite reaction.\n\n## Kinematics Equations\nFor constant acceleration:\n\n1. v = v₀ + at\n2. x = x₀ + v₀t + ½at²\n3. v² = v₀² + 2a(x - x₀)\n4. x = x₀ + ½(v + v₀)t\n\n## Work and Energy\n\n### Work\nW = F·d·cos(θ)\n- Force times displacement times cosine of angle\n\n### Kinetic Energy\nKE = ½mv²\n\n### Potential Energy\nPE = mgh (gravitational)\nPE = ½kx² (elastic)\n\n### Conservation of Energy\nTotal mechanical energy is conserved in absence of non-conservative forces.\nKE₁ + PE₁ = KE₂ + PE₂\n\n## Momentum\np = mv\n- Momentum is conserved in collisions\n- Impulse: J = FΔt = Δp',
    'Newton''s 3 laws govern motion. Kinematics equations describe motion with constant acceleration. Energy (KE + PE) and momentum are conserved in closed systems.',
    'concise', NOW() - INTERVAL '12 days', 'Module 1', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
    
    (v_note_thermodynamics, v_project_physics, v_user_id, 'Thermodynamics Basics',
    E'# Thermodynamics Basics\n\n## Temperature and Heat\n- Temperature: measure of average kinetic energy\n- Heat: transfer of thermal energy\n- Units: Kelvin (K), Celsius (°C), Fahrenheit (°F)\n\n## Laws of Thermodynamics\n\n### Zeroth Law\nIf A is in thermal equilibrium with B, and B with C, then A is in equilibrium with C.\n\n### First Law\nΔU = Q - W\n- Energy is conserved\n- Change in internal energy = heat added - work done\n\n### Second Law\nEntropy of isolated system always increases.\n- Heat flows from hot to cold\n- No perfect heat engine\n\n### Third Law\nEntropy approaches zero as temperature approaches absolute zero.\n\n## Heat Transfer\n1. **Conduction**: Direct contact transfer\n   - Q = kAΔT/d\n2. **Convection**: Fluid movement\n3. **Radiation**: Electromagnetic waves\n   - P = σεAT⁴ (Stefan-Boltzmann)\n\n## Ideal Gas Law\nPV = nRT\n- P = pressure\n- V = volume\n- n = moles\n- R = gas constant\n- T = temperature (K)',
    'Thermodynamics: 1st law - energy conservation (ΔU = Q - W). 2nd law - entropy increases. Heat transfers via conduction, convection, radiation. Ideal gas: PV = nRT.',
    'bullet', NOW() - INTERVAL '8 days', 'Module 2', NOW() - INTERVAL '10 days', NOW());

    -- ============================================
    -- NOTE CONCEPTS (for Content Gap analysis)
    -- ============================================
    INSERT INTO public.note_concepts (note_id, user_id, concepts, extracted_at) VALUES
    (v_note_cell_bio, v_user_id, '["cell structure", "prokaryotic cells", "eukaryotic cells", "nucleus", "mitochondria", "endoplasmic reticulum", "golgi apparatus", "ribosomes", "cell membrane", "organelles"]'::jsonb, NOW() - INTERVAL '25 days'),
    (v_note_genetics, v_user_id, '["DNA structure", "nucleotides", "base pairing", "DNA replication", "transcription", "translation", "gene expression", "mutations", "mRNA", "protein synthesis"]'::jsonb, NOW() - INTERVAL '20 days'),
    (v_note_organic_chem, v_user_id, '["organic chemistry", "carbon bonding", "hydrocarbons", "alkanes", "alkenes", "alkynes", "functional groups", "alcohols", "aldehydes", "isomers"]'::jsonb, NOW() - INTERVAL '18 days'),
    (v_note_periodic, v_user_id, '["periodic table", "atomic radius", "ionization energy", "electronegativity", "electron affinity", "metallic character", "periodic trends"]'::jsonb, NOW() - INTERVAL '15 days'),
    (v_note_mechanics, v_user_id, '["Newton laws", "kinematics", "force", "acceleration", "work", "energy", "kinetic energy", "potential energy", "momentum", "conservation laws"]'::jsonb, NOW() - INTERVAL '12 days'),
    (v_note_thermodynamics, v_user_id, '["thermodynamics", "heat transfer", "temperature", "entropy", "internal energy", "conduction", "convection", "radiation", "ideal gas law"]'::jsonb, NOW() - INTERVAL '8 days');

    -- ============================================
    -- FLASHCARD SETS
    -- ============================================
    INSERT INTO public.flashcard_sets (id, project_id, user_id, title, description, card_count, is_ai_generated, note_id, created_at, updated_at) VALUES
    (v_fc_set_cell, v_project_biology, v_user_id, 'Cell Biology Essentials', 'Key concepts about cell structure and organelles', 10, true, v_note_cell_bio, NOW() - INTERVAL '24 days', NOW() - INTERVAL '5 days'),
    (v_fc_set_genetics, v_project_biology, v_user_id, 'Genetics Fundamentals', 'DNA, genes, and protein synthesis', 10, true, v_note_genetics, NOW() - INTERVAL '19 days', NOW() - INTERVAL '3 days'),
    (v_fc_set_organic, v_project_chemistry, v_user_id, 'Organic Chemistry Basics', 'Hydrocarbons and functional groups', 8, true, v_note_organic_chem, NOW() - INTERVAL '17 days', NOW() - INTERVAL '2 days'),
    (v_fc_set_physics, v_project_physics, v_user_id, 'Physics Mechanics', 'Newton''s laws and energy concepts', 8, true, v_note_mechanics, NOW() - INTERVAL '11 days', NOW() - INTERVAL '1 day');

    -- ============================================
    -- FLASHCARDS
    -- ============================================
    -- Cell Biology Set
    INSERT INTO public.flashcards (project_id, user_id, front, back, difficulty, set_id, set_name, is_ai_generated, card_order, created_at) VALUES
    (v_project_biology, v_user_id, 'What is the powerhouse of the cell?', 'Mitochondria - generates ATP through cellular respiration', 1, v_fc_set_cell, 'Cell Biology Essentials', true, 1, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the difference between prokaryotic and eukaryotic cells?', 'Prokaryotic cells lack a membrane-bound nucleus, while eukaryotic cells have a nucleus and membrane-bound organelles', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 2, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the function of the Golgi apparatus?', 'Modifies, packages, and ships proteins and lipids to their destinations', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 3, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the cell membrane made of?', 'Phospholipid bilayer with embedded proteins', 1, v_fc_set_cell, 'Cell Biology Essentials', true, 4, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the function of ribosomes?', 'Site of protein synthesis - translates mRNA into proteins', 1, v_fc_set_cell, 'Cell Biology Essentials', true, 5, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'Difference between rough and smooth ER?', 'Rough ER has ribosomes and synthesizes proteins; Smooth ER lacks ribosomes and synthesizes lipids', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 6, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the nucleolus?', 'Region within nucleus where ribosomal RNA is synthesized', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 7, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What are lysosomes?', 'Organelles containing digestive enzymes that break down waste materials and cellular debris', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 8, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What is the cytoskeleton?', 'Network of protein filaments that provides structural support and enables cell movement', 2, v_fc_set_cell, 'Cell Biology Essentials', true, 9, NOW() - INTERVAL '24 days'),
    (v_project_biology, v_user_id, 'What are the three types of cytoskeleton filaments?', 'Microfilaments (actin), intermediate filaments, and microtubules', 3, v_fc_set_cell, 'Cell Biology Essentials', true, 10, NOW() - INTERVAL '24 days'),

    -- Genetics Set
    (v_project_biology, v_user_id, 'What are the base pairing rules in DNA?', 'Adenine (A) pairs with Thymine (T), Guanine (G) pairs with Cytosine (C)', 1, v_fc_set_genetics, 'Genetics Fundamentals', true, 1, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is transcription?', 'Process of copying DNA into mRNA in the nucleus', 1, v_fc_set_genetics, 'Genetics Fundamentals', true, 2, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is translation?', 'Process of converting mRNA into protein at the ribosome', 1, v_fc_set_genetics, 'Genetics Fundamentals', true, 3, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is a codon?', 'Three-nucleotide sequence on mRNA that codes for a specific amino acid', 2, v_fc_set_genetics, 'Genetics Fundamentals', true, 4, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What enzyme unwinds DNA during replication?', 'Helicase', 1, v_fc_set_genetics, 'Genetics Fundamentals', true, 5, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is semi-conservative replication?', 'Each new DNA molecule contains one original strand and one newly synthesized strand', 2, v_fc_set_genetics, 'Genetics Fundamentals', true, 6, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is a point mutation?', 'A change in a single nucleotide base in the DNA sequence', 2, v_fc_set_genetics, 'Genetics Fundamentals', true, 7, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is a frameshift mutation?', 'Insertion or deletion of nucleotides that shifts the reading frame of codons', 3, v_fc_set_genetics, 'Genetics Fundamentals', true, 8, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What is the role of tRNA?', 'Brings amino acids to the ribosome during translation, matching anticodon to mRNA codon', 2, v_fc_set_genetics, 'Genetics Fundamentals', true, 9, NOW() - INTERVAL '19 days'),
    (v_project_biology, v_user_id, 'What are Okazaki fragments?', 'Short segments of DNA synthesized on the lagging strand during replication', 3, v_fc_set_genetics, 'Genetics Fundamentals', true, 10, NOW() - INTERVAL '19 days'),

    -- Organic Chemistry Set
    (v_project_chemistry, v_user_id, 'What is the general formula for alkanes?', 'CnH2n+2', 1, v_fc_set_organic, 'Organic Chemistry Basics', true, 1, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What defines an alkene?', 'Hydrocarbon containing at least one C=C double bond', 1, v_fc_set_organic, 'Organic Chemistry Basics', true, 2, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What is a functional group?', 'Specific group of atoms responsible for characteristic chemical reactions', 1, v_fc_set_organic, 'Organic Chemistry Basics', true, 3, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What is the alcohol functional group?', '-OH (hydroxyl group) bonded to a carbon atom', 1, v_fc_set_organic, 'Organic Chemistry Basics', true, 4, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What is the difference between aldehyde and ketone?', 'Aldehyde has C=O at end of chain (-CHO), ketone has C=O in middle of chain', 2, v_fc_set_organic, 'Organic Chemistry Basics', true, 5, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What are structural isomers?', 'Compounds with same molecular formula but different connectivity of atoms', 2, v_fc_set_organic, 'Organic Chemistry Basics', true, 6, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'Why can carbon form so many compounds?', 'Carbon can form 4 covalent bonds, forms stable bonds with itself, and creates diverse structures', 2, v_fc_set_organic, 'Organic Chemistry Basics', true, 7, NOW() - INTERVAL '17 days'),
    (v_project_chemistry, v_user_id, 'What is a carboxylic acid?', 'Organic compound containing -COOH functional group', 2, v_fc_set_organic, 'Organic Chemistry Basics', true, 8, NOW() - INTERVAL '17 days'),

    -- Physics Set
    (v_project_physics, v_user_id, 'State Newton''s Second Law', 'F = ma (Force equals mass times acceleration)', 1, v_fc_set_physics, 'Physics Mechanics', true, 1, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is kinetic energy?', 'KE = ½mv² (energy of motion)', 1, v_fc_set_physics, 'Physics Mechanics', true, 2, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is gravitational potential energy?', 'PE = mgh (energy stored due to height)', 1, v_fc_set_physics, 'Physics Mechanics', true, 3, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'State Newton''s Third Law', 'For every action, there is an equal and opposite reaction', 1, v_fc_set_physics, 'Physics Mechanics', true, 4, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is momentum?', 'p = mv (mass times velocity)', 1, v_fc_set_physics, 'Physics Mechanics', true, 5, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is the work formula?', 'W = F·d·cos(θ) (force times displacement times cosine of angle)', 2, v_fc_set_physics, 'Physics Mechanics', true, 6, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is conservation of energy?', 'Total mechanical energy remains constant in a closed system (KE + PE = constant)', 2, v_fc_set_physics, 'Physics Mechanics', true, 7, NOW() - INTERVAL '11 days'),
    (v_project_physics, v_user_id, 'What is impulse?', 'J = FΔt = Δp (change in momentum)', 2, v_fc_set_physics, 'Physics Mechanics', true, 8, NOW() - INTERVAL '11 days');

    -- ============================================
    -- FLASHCARD STUDY SESSIONS (for biological rhythm & retention insights)
    -- ============================================
    -- Simulate study sessions over the past 2 weeks with varying times and accuracy
    -- Note: hour_of_day is auto-generated from studied_at
    INSERT INTO public.flashcard_study_sessions (user_id, flashcard_set_id, project_id, is_correct, response_time_ms, studied_at) VALUES
    -- Morning study sessions (9-11 AM) - higher accuracy
    (v_user_id, v_fc_set_cell, v_project_biology, true, 2500, NOW() - INTERVAL '14 days' + INTERVAL '9 hours'),
    (v_user_id, v_fc_set_cell, v_project_biology, true, 3200, NOW() - INTERVAL '14 days' + INTERVAL '9 hours 5 minutes'),
    (v_user_id, v_fc_set_cell, v_project_biology, true, 2800, NOW() - INTERVAL '14 days' + INTERVAL '10 hours'),
    (v_user_id, v_fc_set_cell, v_project_biology, false, 4500, NOW() - INTERVAL '14 days' + INTERVAL '10 hours 10 minutes'),
    (v_user_id, v_fc_set_cell, v_project_biology, true, 2100, NOW() - INTERVAL '14 days' + INTERVAL '11 hours'),
    
    -- Afternoon sessions (2-4 PM) - good accuracy
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 3100, NOW() - INTERVAL '12 days' + INTERVAL '14 hours'),
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 2900, NOW() - INTERVAL '12 days' + INTERVAL '14 hours 15 minutes'),
    (v_user_id, v_fc_set_genetics, v_project_biology, false, 5200, NOW() - INTERVAL '12 days' + INTERVAL '15 hours'),
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 2600, NOW() - INTERVAL '12 days' + INTERVAL '15 hours 20 minutes'),
    
    -- Evening sessions (7-9 PM) - lower accuracy (tired)
    (v_user_id, v_fc_set_organic, v_project_chemistry, true, 3800, NOW() - INTERVAL '10 days' + INTERVAL '19 hours'),
    (v_user_id, v_fc_set_organic, v_project_chemistry, false, 5500, NOW() - INTERVAL '10 days' + INTERVAL '19 hours 30 minutes'),
    (v_user_id, v_fc_set_organic, v_project_chemistry, false, 6200, NOW() - INTERVAL '10 days' + INTERVAL '20 hours'),
    (v_user_id, v_fc_set_organic, v_project_chemistry, true, 4100, NOW() - INTERVAL '10 days' + INTERVAL '20 hours 15 minutes'),
    
    -- More morning sessions - consistently high accuracy
    (v_user_id, v_fc_set_physics, v_project_physics, true, 2200, NOW() - INTERVAL '8 days' + INTERVAL '10 hours'),
    (v_user_id, v_fc_set_physics, v_project_physics, true, 2400, NOW() - INTERVAL '8 days' + INTERVAL '10 hours 10 minutes'),
    (v_user_id, v_fc_set_physics, v_project_physics, true, 2600, NOW() - INTERVAL '8 days' + INTERVAL '11 hours'),
    (v_user_id, v_fc_set_physics, v_project_physics, true, 2300, NOW() - INTERVAL '8 days' + INTERVAL '11 hours 20 minutes'),
    
    -- Recent study sessions
    (v_user_id, v_fc_set_cell, v_project_biology, true, 2000, NOW() - INTERVAL '5 days' + INTERVAL '9 hours'),
    (v_user_id, v_fc_set_cell, v_project_biology, true, 1800, NOW() - INTERVAL '5 days' + INTERVAL '9 hours 30 minutes'),
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 2500, NOW() - INTERVAL '4 days' + INTERVAL '10 hours'),
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 2200, NOW() - INTERVAL '4 days' + INTERVAL '10 hours 15 minutes'),
    (v_user_id, v_fc_set_organic, v_project_chemistry, true, 2800, NOW() - INTERVAL '3 days' + INTERVAL '14 hours'),
    (v_user_id, v_fc_set_organic, v_project_chemistry, false, 4000, NOW() - INTERVAL '3 days' + INTERVAL '14 hours 20 minutes'),
    (v_user_id, v_fc_set_physics, v_project_physics, true, 2100, NOW() - INTERVAL '2 days' + INTERVAL '11 hours'),
    (v_user_id, v_fc_set_physics, v_project_physics, true, 1900, NOW() - INTERVAL '2 days' + INTERVAL '11 hours 30 minutes'),
    (v_user_id, v_fc_set_cell, v_project_biology, true, 1700, NOW() - INTERVAL '1 day' + INTERVAL '10 hours'),
    (v_user_id, v_fc_set_genetics, v_project_biology, true, 2000, NOW() - INTERVAL '1 day' + INTERVAL '10 hours 45 minutes');

    -- ============================================
    -- Q&A PAIRS
    -- ============================================
    INSERT INTO public.qa_pairs (project_id, user_id, question, answer, created_at, updated_at) VALUES
    -- Biology Q&A
    (v_project_biology, v_user_id, 'Why are mitochondria called the powerhouse of the cell?', 'Mitochondria produce ATP through cellular respiration, which is the main energy currency used by cells for their functions.', NOW() - INTERVAL '20 days', NOW()),
    (v_project_biology, v_user_id, 'What would happen if DNA replication was not semi-conservative?', 'If replication was not semi-conservative, there would be no template strand to ensure accuracy, leading to more mutations and potentially non-functional proteins.', NOW() - INTERVAL '15 days', NOW()),
    (v_project_biology, v_user_id, 'How do prokaryotic and eukaryotic cells differ in gene expression?', 'In prokaryotes, transcription and translation occur simultaneously in the cytoplasm. In eukaryotes, transcription occurs in the nucleus and translation in the cytoplasm, allowing for more regulation.', NOW() - INTERVAL '10 days', NOW()),
    
    -- Chemistry Q&A
    (v_project_chemistry, v_user_id, 'Why does electronegativity increase across a period?', 'As atomic number increases across a period, the nuclear charge increases while electrons are added to the same shell. This creates a stronger pull on bonding electrons.', NOW() - INTERVAL '12 days', NOW()),
    (v_project_chemistry, v_user_id, 'Why are alkenes more reactive than alkanes?', 'Alkenes contain a pi bond in the double bond that is weaker and more exposed than sigma bonds, making them more susceptible to addition reactions.', NOW() - INTERVAL '8 days', NOW()),
    
    -- Physics Q&A
    (v_project_physics, v_user_id, 'Why is momentum conserved in collisions?', 'Momentum is conserved because internal forces between colliding objects are equal and opposite (Newton''s Third Law), so they cancel out, leaving total momentum unchanged.', NOW() - INTERVAL '7 days', NOW()),
    (v_project_physics, v_user_id, 'What is the relationship between work and energy?', 'Work is the transfer of energy. When work is done on an object, energy is transferred to it. The work-energy theorem states that net work equals change in kinetic energy.', NOW() - INTERVAL '5 days', NOW());

    -- ============================================
    -- QUIZZES
    -- ============================================
    INSERT INTO public.quizzes (id, project_id, user_id, title, description, source_material, note_id, question_count, created_at, updated_at) VALUES
    (v_quiz_biology, v_project_biology, v_user_id, 'Cell Biology Quiz', 'Test your knowledge of cell structure and organelles', 'Cell Structure and Function notes', v_note_cell_bio, 5, NOW() - INTERVAL '22 days', NOW()),
    (v_quiz_chemistry, v_project_chemistry, v_user_id, 'Periodic Trends Quiz', 'Quiz on periodic table trends', 'Periodic Table Trends notes', v_note_periodic, 5, NOW() - INTERVAL '14 days', NOW());

    -- ============================================
    -- QUIZ QUESTIONS
    -- ============================================
    INSERT INTO public.quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order, created_at) VALUES
    -- Biology Quiz Questions
    (v_quiz_biology, 'Which organelle is responsible for producing ATP?', 'Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus', 'C', 'Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.', 1, NOW() - INTERVAL '22 days'),
    (v_quiz_biology, 'What type of cells lack a membrane-bound nucleus?', 'Eukaryotic', 'Prokaryotic', 'Plant cells', 'Animal cells', 'B', 'Prokaryotic cells (bacteria and archaea) do not have a membrane-bound nucleus.', 2, NOW() - INTERVAL '22 days'),
    (v_quiz_biology, 'Which organelle modifies and packages proteins?', 'Ribosome', 'Endoplasmic reticulum', 'Golgi apparatus', 'Lysosome', 'C', 'The Golgi apparatus modifies, packages, and ships proteins to their destinations.', 3, NOW() - INTERVAL '22 days'),
    (v_quiz_biology, 'What is the cell membrane primarily made of?', 'Carbohydrates', 'Proteins only', 'Phospholipid bilayer', 'Nucleic acids', 'C', 'The cell membrane is a phospholipid bilayer with embedded proteins.', 4, NOW() - INTERVAL '22 days'),
    (v_quiz_biology, 'Where does protein synthesis occur?', 'Nucleus', 'Ribosomes', 'Mitochondria', 'Cell membrane', 'B', 'Ribosomes are the site of protein synthesis, translating mRNA into proteins.', 5, NOW() - INTERVAL '22 days'),
    
    -- Chemistry Quiz Questions
    (v_quiz_chemistry, 'What happens to atomic radius across a period?', 'Increases', 'Decreases', 'Stays the same', 'First increases then decreases', 'B', 'Atomic radius decreases across a period due to increasing nuclear charge pulling electrons closer.', 1, NOW() - INTERVAL '14 days'),
    (v_quiz_chemistry, 'Which element has the highest electronegativity?', 'Oxygen', 'Chlorine', 'Fluorine', 'Nitrogen', 'C', 'Fluorine has the highest electronegativity at 4.0 on the Pauling scale.', 2, NOW() - INTERVAL '14 days'),
    (v_quiz_chemistry, 'What happens to ionization energy down a group?', 'Increases', 'Decreases', 'Stays the same', 'Depends on the element', 'B', 'Ionization energy decreases down a group because outer electrons are farther from nucleus.', 3, NOW() - INTERVAL '14 days'),
    (v_quiz_chemistry, 'Where are metals generally found on the periodic table?', 'Right side', 'Left side', 'Center only', 'Top rows only', 'B', 'Metals are generally found on the left side of the periodic table.', 4, NOW() - INTERVAL '14 days'),
    (v_quiz_chemistry, 'What trend describes an element''s ability to attract bonding electrons?', 'Atomic radius', 'Ionization energy', 'Electronegativity', 'Electron affinity', 'C', 'Electronegativity is the ability of an atom to attract electrons in a chemical bond.', 5, NOW() - INTERVAL '14 days');

    -- ============================================
    -- QUIZ ATTEMPTS
    -- ============================================
    INSERT INTO public.quiz_attempts (quiz_id, user_id, score, total_questions, completed_at, answers) VALUES
    (v_quiz_biology, v_user_id, 4, 5, NOW() - INTERVAL '20 days', '{"1": "C", "2": "B", "3": "C", "4": "C", "5": "A"}'::jsonb),
    (v_quiz_biology, v_user_id, 5, 5, NOW() - INTERVAL '10 days', '{"1": "C", "2": "B", "3": "C", "4": "C", "5": "B"}'::jsonb),
    (v_quiz_chemistry, v_user_id, 3, 5, NOW() - INTERVAL '12 days', '{"1": "B", "2": "C", "3": "A", "4": "B", "5": "C"}'::jsonb),
    (v_quiz_chemistry, v_user_id, 4, 5, NOW() - INTERVAL '5 days', '{"1": "B", "2": "C", "3": "B", "4": "B", "5": "C"}'::jsonb);

    -- ============================================
    -- SCHEDULE
    -- ============================================
    -- preferred_days uses integers: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 0=Sunday
    INSERT INTO public.schedules (id, user_id, exam_date, difficulty, preferred_days, preferred_times, daily_study_minutes, created_at, updated_at) VALUES
    (v_schedule_id, v_user_id, CURRENT_DATE + INTERVAL '30 days', 'medium', ARRAY[1, 2, 3, 4, 5], ARRAY['morning', 'afternoon'], 90, NOW() - INTERVAL '25 days', NOW());

    -- ============================================
    -- SCHEDULE TASKS
    -- ============================================
    INSERT INTO public.schedule_tasks (schedule_id, task_date, task_type, task_name, project_id, project_name, priority, lesson_reference, status, estimated_minutes, created_at) VALUES
    -- Past tasks (completed)
    (v_schedule_id, CURRENT_DATE - INTERVAL '7 days', 'lesson', 'Cell Structure Overview', v_project_biology, 'Biology 101', 'high', 'Chapter 1', 'understood', 45, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '6 days', 'flashcard', 'Cell Biology Flashcards', v_project_biology, 'Biology 101', 'medium', NULL, 'understood', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '5 days', 'lesson', 'DNA and Genetics', v_project_biology, 'Biology 101', 'high', 'Chapter 2', 'understood', 60, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '4 days', 'revision', 'Review Cell Biology', v_project_biology, 'Biology 101', 'medium', NULL, 'understood', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '3 days', 'lesson', 'Organic Chemistry Intro', v_project_chemistry, 'Organic Chemistry', 'high', 'Unit 1', 'understood', 45, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '2 days', 'flashcard', 'Genetics Flashcards', v_project_biology, 'Biology 101', 'medium', NULL, 'need_work', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE - INTERVAL '1 day', 'lesson', 'Newton''s Laws', v_project_physics, 'Physics Mechanics', 'high', 'Module 1', 'understood', 45, NOW() - INTERVAL '20 days'),
    
    -- Today and upcoming tasks
    (v_schedule_id, CURRENT_DATE, 'revision', 'Review Organic Chemistry', v_project_chemistry, 'Organic Chemistry', 'high', NULL, 'pending', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE, 'flashcard', 'Physics Flashcards', v_project_physics, 'Physics Mechanics', 'medium', NULL, 'pending', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE + INTERVAL '1 day', 'lesson', 'Periodic Trends', v_project_chemistry, 'Organic Chemistry', 'high', 'Unit 2', 'pending', 45, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE + INTERVAL '2 days', 'qa', 'Q&A Practice - Biology', v_project_biology, 'Biology 101', 'medium', NULL, 'pending', 30, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE + INTERVAL '3 days', 'lesson', 'Thermodynamics', v_project_physics, 'Physics Mechanics', 'high', 'Module 2', 'pending', 60, NOW() - INTERVAL '20 days'),
    (v_schedule_id, CURRENT_DATE + INTERVAL '4 days', 'revision', 'Full Biology Review', v_project_biology, 'Biology 101', 'high', NULL, 'pending', 45, NOW() - INTERVAL '20 days');

    -- ============================================
    -- PROJECT TIME LOGS
    -- ============================================
    INSERT INTO public.project_time_logs (user_id, project_id, session_start, session_end, duration_seconds, page_path, created_at) VALUES
    (v_user_id, v_project_biology, NOW() - INTERVAL '14 days' + INTERVAL '9 hours', NOW() - INTERVAL '14 days' + INTERVAL '11 hours', 7200, '/project/biology/notes', NOW() - INTERVAL '14 days'),
    (v_user_id, v_project_biology, NOW() - INTERVAL '12 days' + INTERVAL '14 hours', NOW() - INTERVAL '12 days' + INTERVAL '16 hours', 7200, '/project/biology/flashcards', NOW() - INTERVAL '12 days'),
    (v_user_id, v_project_chemistry, NOW() - INTERVAL '10 days' + INTERVAL '10 hours', NOW() - INTERVAL '10 days' + INTERVAL '12 hours', 7200, '/project/chemistry/notes', NOW() - INTERVAL '10 days'),
    (v_user_id, v_project_physics, NOW() - INTERVAL '8 days' + INTERVAL '9 hours', NOW() - INTERVAL '8 days' + INTERVAL '11 hours 30 minutes', 9000, '/project/physics/notes', NOW() - INTERVAL '8 days'),
    (v_user_id, v_project_biology, NOW() - INTERVAL '5 days' + INTERVAL '10 hours', NOW() - INTERVAL '5 days' + INTERVAL '11 hours 30 minutes', 5400, '/project/biology/flashcards', NOW() - INTERVAL '5 days'),
    (v_user_id, v_project_chemistry, NOW() - INTERVAL '3 days' + INTERVAL '14 hours', NOW() - INTERVAL '3 days' + INTERVAL '15 hours 45 minutes', 6300, '/project/chemistry/qa', NOW() - INTERVAL '3 days'),
    (v_user_id, v_project_physics, NOW() - INTERVAL '2 days' + INTERVAL '11 hours', NOW() - INTERVAL '2 days' + INTERVAL '13 hours', 7200, '/project/physics/flashcards', NOW() - INTERVAL '2 days'),
    (v_user_id, v_project_biology, NOW() - INTERVAL '1 day' + INTERVAL '10 hours', NOW() - INTERVAL '1 day' + INTERVAL '12 hours', 7200, '/project/biology/notes', NOW() - INTERVAL '1 day');

    -- ============================================
    -- INSIGHTS (Today's insights for the dashboard)
    -- ============================================
    INSERT INTO public.insights (user_id, insight_date, insight_type, category, title, message, severity, related_project_id, metadata, is_actionable, action_type, action_data) VALUES
    -- Knowledge Heatmap
    (v_user_id, CURRENT_DATE, 'knowledge_heatmap', 'learning', 'Strong Progress in Biology', 'You''ve mastered cell structure concepts with 90% accuracy! Your weakest area is advanced genetics - consider reviewing DNA replication steps.', 'success', v_project_biology, 
    '{"masteredTopics": ["Cell Structure", "Organelles", "Cell Membrane"], "strugglingTopics": ["DNA Replication", "Okazaki Fragments"], "improvingTopics": ["Transcription", "Translation"], "accuracy": 0.85, "engagementPeak": "Cell Biology Week"}'::jsonb, 
    true, 'review_topic', '{"topic": "DNA Replication"}'::jsonb),
    
    -- Biological Rhythm
    (v_user_id, CURRENT_DATE, 'biological_rhythm', 'productivity', 'Peak Performance: 9-11 AM', 'Your study data shows you perform 23% better during morning hours (9-11 AM). Consider scheduling difficult topics during this window.', 'info', NULL,
    '{"bestHours": [9, 10, 11], "worstHours": [19, 20, 21], "averageAccuracyByHour": {"9": 0.92, "10": 0.88, "11": 0.85, "14": 0.78, "15": 0.75, "19": 0.65, "20": 0.60}, "recommendedStudyTime": "Schedule challenging topics between 9-11 AM for optimal retention", "dailyAverage": "2h 15m", "weeklyChange": 15, "peakFocusTime": "9:00 AM - 11:00 AM", "weeklyData": [45, 65, 90, 55, 75, 40, 25]}'::jsonb,
    true, 'adjust_schedule', '{"suggestedTime": "morning"}'::jsonb),
    
    -- Forgetting Curve / Retention
    (v_user_id, CURRENT_DATE, 'forgetting_curve', 'retention', 'Review Needed: Organic Chemistry', 'Based on the forgetting curve, your Organic Chemistry concepts are due for review. Retention drops to 60% after 7 days without review.', 'warning', v_project_chemistry,
    '{"dueForReview": ["Functional Groups", "Isomers", "Alkene Reactions"], "urgentReview": ["Stereoisomers"], "retentionRates": {"Cell Biology": 0.88, "Genetics": 0.82, "Organic Chemistry": 0.65, "Physics": 0.78}, "overallRetention": 78, "topRetainedTopics": [{"topic": "Cell Biology", "retention": "High", "lastReview": "2d ago"}, {"topic": "Genetics", "retention": "Med", "lastReview": "4d ago"}]}'::jsonb,
    true, 'start_review', jsonb_build_object('flashcardSetId', v_fc_set_organic)),
    
    -- Content Gap
    (v_user_id, CURRENT_DATE, 'content_gap', 'curriculum', 'Missing Topic: Enzyme Kinetics', 'AI analysis suggests you may benefit from studying Enzyme Kinetics to strengthen your Biology foundation. This topic connects your cell biology and chemistry knowledge.', 'info', v_project_biology,
    '{"suggestions": ["Enzyme Kinetics and Michaelis-Menten", "Metabolic Pathways Overview", "Protein Structure and Folding"], "relatedTopics": ["Cell Biology", "Organic Chemistry"], "confidence": 0.82, "missingTopics": [{"topic": "Enzyme Kinetics and Michaelis-Menten", "priority": "high", "module": "Chapter 3"}, {"topic": "Metabolic Pathways", "priority": "medium", "module": "Chapter 4"}]}'::jsonb,
    true, 'create_note', '{"suggestedTopic": "Enzyme Kinetics"}'::jsonb);

    -- ============================================
    -- INSIGHT PREFERENCES
    -- ============================================
    INSERT INTO public.insight_preferences (user_id, enabled_types, notification_time, show_on_dashboard) VALUES
    (v_user_id, '["knowledge_heatmap", "biological_rhythm", "forgetting_curve", "content_gap"]'::jsonb, '08:00:00', true);

    -- ============================================
    -- ACTIVITY LOGS (sample)
    -- ============================================
    INSERT INTO public.activity_logs (user_id, action_type, endpoint, method, tokens_used, model, metadata, created_at) VALUES
    (v_user_id, 'note_summarize', '/api/notes/summarize', 'POST', 50, 'llama-3.1-8b-instant', jsonb_build_object('noteId', v_note_cell_bio, 'summaryType', 'concise'), NOW() - INTERVAL '25 days'),
    (v_user_id, 'flashcard_generate', '/api/flashcards/generate', 'POST', 100, 'llama-3.1-8b-instant', jsonb_build_object('noteId', v_note_cell_bio, 'count', 10), NOW() - INTERVAL '24 days'),
    (v_user_id, 'quiz_generate', '/api/quiz/generate', 'POST', 150, 'llama-3.1-8b-instant', jsonb_build_object('noteId', v_note_cell_bio, 'questionCount', 5), NOW() - INTERVAL '22 days'),
    (v_user_id, 'leafai_chat', '/api/leafai', 'POST', 25, 'llama-3.1-8b-instant', '{"mode": "light", "isGlobal": true}'::jsonb, NOW() - INTERVAL '15 days'),
    (v_user_id, 'insight_generate', '/api/insights', 'POST', 75, 'llama-3.1-8b-instant', '{"types": ["content_gap"]}'::jsonb, NOW() - INTERVAL '1 day');

    RAISE NOTICE 'Seed data created successfully for user: %', v_user_id;
    RAISE NOTICE 'Projects created: Biology 101, Organic Chemistry, Physics Mechanics';
    RAISE NOTICE 'Notes: 6, Flashcard Sets: 4, Flashcards: 36, Quizzes: 2, Q&A: 7';
    RAISE NOTICE 'Study sessions: 26, Insights: 4';
END $$;
