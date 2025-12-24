// app/api/flashcards/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { deductTokensWithExpiry, getValidTokenBalance, getUserSubscription, calculateOutputTokenCost, countWords, hasActiveAccess, SubscriptionProfile, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

// Initialize Groq - 100% FREE!
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Models optimized for production - high rate limits
const PRIMARY_MODEL = 'llama-3.1-8b-instant'; // 14,400 requests/day
const FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // 30K tokens/min

interface Flashcard {
  front: string;
  back: string;
}

// Get all flashcard sets for a project or specific set with cards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const setId = searchParams.get('setId');

    if (!projectId && !setId) {
      return NextResponse.json({ error: 'Project ID or Set ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // If setId is provided, get specific set with cards
    if (setId) {
      const [setResult, cardsResult] = await Promise.all([
        supabase
          .from('flashcard_sets')
          .select('*')
          .eq('id', setId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('flashcards')
          .select('*')
          .eq('set_id', setId)
          .eq('user_id', user.id)
          .order('card_order', { ascending: true })
      ]);

      if (setResult.error) throw setResult.error;
      if (cardsResult.error) throw cardsResult.error;

      return NextResponse.json({
        set: setResult.data,
        cards: cardsResult.data
      });
    }

    // Get all sets for project
    const { data: sets, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(sets);
  } catch (error: any) {
    console.error('Error fetching flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
}

// Generate AI flashcards or create manual set
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const { title, description, cardCount, projectId, noteId, sourceMaterial, isManual, cards } = body;

    console.log('Creating flashcard set:', { title, cardCount, projectId, isManual });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    userId = user.id;

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

    // If manual, create set with provided cards
    if (isManual && cards) {
      const { data: set, error: setError } = await supabase
        .from('flashcard_sets')
        .insert({
          project_id: projectId,
          user_id: user.id,
          title,
          description: description || '',
          card_count: cards.length,
          is_ai_generated: false
        })
        .select()
        .single();

      if (setError) throw setError;

      const cardsToInsert = cards.map((card: Flashcard, index: number) => ({
        set_id: set.id,
        project_id: projectId,
        user_id: user.id,
        front: card.front,
        back: card.back,
        card_order: index + 1,
        is_ai_generated: false
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

      if (cardsError) {
        await supabase.from('flashcard_sets').delete().eq('id', set.id);
        throw cardsError;
      }

      return NextResponse.json({ set, success: true }, { status: 201 });
    }

    // AI Generation with Groq
    if (!sourceMaterial || !cardCount) {
      return NextResponse.json(
        { error: 'Source material and card count required for AI generation' },
        { status: 400 }
      );
    }

    if (![5, 10, 15, 20].includes(cardCount)) {
      return NextResponse.json(
        { error: 'Card count must be 5, 10, 15, or 20' },
        { status: 400 }
      );
    }

    // Check subscription and token balance for AI generation
    const subscription = await getUserSubscription(user.id);
    
    // Verify user has active subscription access (considers canceled but not expired)
    if (!hasActiveAccess(subscription as SubscriptionProfile) && subscription.subscription_tier !== 'free') {
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew to continue using AI features.' },
        { status: 403 }
      );
    }
    
    // Check if user has minimum tokens to start generation (using valid non-expired tokens)
    const validBalance = await getValidTokenBalance(user.id);
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      return NextResponse.json(
        { 
          error: `Insufficient tokens. You need at least ${MIN_TOKENS_TO_GENERATE} tokens to generate flashcards. Current balance: ${validBalance}`,
          tokensRequired: MIN_TOKENS_TO_GENERATE,
          currentBalance: validBalance
        },
        { status: 402 }
      );
    }

    console.log('[Flashcards] Generating with Groq AI...');

    // Trim source material to avoid token limits
    const trimmedMaterial = sourceMaterial.slice(0, 15000);

    const prompt = `You are an educational flashcard generator. Create exactly ${cardCount} high-quality flashcards based on the following study material.

Study Material:
${trimmedMaterial}

Generate a JSON response with a "flashcards" array containing exactly ${cardCount} flashcards. Each flashcard must have:
- "front": A concise question, term, or concept (keep it brief and focused)
- "back": A clear, comprehensive answer or definition

Requirements:
1. Cover the most important concepts from the material
2. Make questions specific and testable
3. Ensure answers are accurate and complete
4. Use varied question types (what, how, why, define, explain)
5. Return ONLY valid JSON, no markdown formatting or additional text

Response format:
{
  "flashcards": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy stored in glucose"
    }
  ]
}`;

    let flashcards: Flashcard[] = [];
    let modelUsed = PRIMARY_MODEL;

    try {
      // Try primary model first
      console.log(`[Flashcards] Using model: ${PRIMARY_MODEL}`);
      const completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful AI that generates educational flashcards. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });
      
      let responseText = completion.choices[0]?.message?.content || '';
      
      // Clean the response - remove markdown code blocks if present
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(responseText.trim());
      flashcards = parsed.flashcards || parsed;
      
      console.log(`[Flashcards] ${PRIMARY_MODEL} generated ${flashcards.length} cards`);
    } catch (primaryError: any) {
      console.error(`[Flashcards] ${PRIMARY_MODEL} failed:`, primaryError.message);
      
      // Try fallback model
      try {
        console.log(`[Flashcards] Trying fallback: ${FALLBACK_MODEL}`);
        modelUsed = FALLBACK_MODEL;
        
        const completion = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful AI that generates educational flashcards. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048,
          temperature: 0.7,
        });
        
        let responseText = completion.choices[0]?.message?.content || '';
        
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/```\n?/g, '');
        }
        
        const parsed = JSON.parse(responseText.trim());
        flashcards = parsed.flashcards || parsed;
        
        console.log(`[Flashcards] ${FALLBACK_MODEL} generated ${flashcards.length} cards`);
      } catch (fallbackError: any) {
        console.error(`[Flashcards] Fallback also failed:`, fallbackError.message);
        
        if (fallbackError?.status === 429) {
          return NextResponse.json(
            { error: 'AI service rate limit exceeded. Please try again in a few moments.' },
            { status: 429 }
          );
        }
        
        throw new Error('Failed to generate flashcards: ' + (fallbackError.message || 'Unknown error'));
      }
    }

    // Validate flashcard structure
    if (!Array.isArray(flashcards)) {
      throw new Error('Flashcards is not an array');
    }
    
    flashcards = flashcards.filter(card => 
      card && 
      typeof card.front === 'string' && 
      typeof card.back === 'string' &&
      card.front.trim() !== '' && 
      card.back.trim() !== ''
    );

    if (flashcards.length === 0) {
      throw new Error('No valid flashcards generated');
    }

    if (flashcards.length !== cardCount) {
      console.warn(`Expected ${cardCount} cards, got ${flashcards.length}`);
      if (flashcards.length > cardCount) {
        flashcards = flashcards.slice(0, cardCount);
      }
    }

    console.log(`[Flashcards] Generated ${flashcards.length} flashcards successfully`);

    // Create flashcard set
    const { data: set, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title,
        description: description || `AI-generated flashcard set with ${flashcards.length} cards`,
        card_count: flashcards.length,
        is_ai_generated: true,
        source_material: sourceMaterial,
        note_id: noteId || null
      })
      .select()
      .single();

    if (setError) throw setError;

    // Insert flashcards
    const cardsToInsert = flashcards.map((card, index) => ({
      set_id: set.id,
      project_id: projectId,
      user_id: user.id,
      front: card.front.trim(),
      back: card.back.trim(),
      card_order: index + 1,
      is_ai_generated: true
    }));

    const { error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) {
      // Rollback: delete the set if cards fail to insert
      await supabase.from('flashcard_sets').delete().eq('id', set.id);
      throw cardsError;
    }

    // Calculate token cost based on OUTPUT word count
    const outputText = flashcards.map(card => `${card.front} ${card.back}`).join(' ');
    const outputWordCount = countWords(outputText);
    const tokensRequired = calculateOutputTokenCost(outputWordCount);
    console.log(`[Flashcards] ${flashcards.length} cards, ${outputWordCount} words, deducting ${tokensRequired} tokens`);

    // Deduct tokens AFTER successful generation (uses FIFO with expiry)
    const deducted = await deductTokensWithExpiry(user.id, tokensRequired);
    if (!deducted) {
      console.error('[Flashcards] Failed to deduct tokens');
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.FLASHCARD_GENERATE,
      endpoint: '/api/flashcards',
      method: 'POST',
      tokens_used: tokensRequired,
      model: modelUsed,
      metadata: { cardCount: flashcards.length, projectId, noteId, setId: set.id, provider: 'groq' },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 201,
      duration_ms: Date.now() - startTime,
    });

    console.log('[Flashcards] Created successfully');

    return NextResponse.json({ 
      set, 
      success: true,
      tokensUsed: tokensRequired,
      outputWords: outputWordCount,
      model: modelUsed,
      provider: 'groq'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Flashcards] Error:', error);
    
    let errorMessage = 'Failed to create flashcards';
    let statusCode = 500;

    if (error.status) {
      statusCode = error.status;
      if (statusCode === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      }
    } else {
      errorMessage = error.message || errorMessage;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Delete flashcard set
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');

    if (!setId) {
      return NextResponse.json({ error: 'Set ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Delete all cards in the set first, then delete the set
    await supabase.from('flashcards').delete().eq('set_id', setId).eq('user_id', user.id);
    
    const { error: setError } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', user.id);

    if (setError) throw setError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Flashcards] Error deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete flashcard set' },
      { status: 500 }
    );
  }
}

// Update flashcard set title/description
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { setId, title, description } = body;

    if (!setId || !title) {
      return NextResponse.json({ error: 'Set ID and title required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase
      .from('flashcard_sets')
      .update({ title, description: description || '' })
      .eq('id', setId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Flashcards] Error updating:', error);
    return NextResponse.json(
      { error: 'Failed to update flashcard set' },
      { status: 500 }
    );
  }
}
