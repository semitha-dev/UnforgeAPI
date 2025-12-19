// app/api/notes/summarize/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { deductTokensWithExpiry, getValidTokenBalance, getUserSubscription, calculateOutputTokenCost, countWords, hasActiveAccess, SubscriptionProfile, MIN_TOKENS_TO_GENERATE } from '@/lib/subscription';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const genAI2 = process.env.GEMINI_API_KEY2 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY2) 
  : null;

// Helper function to try generation with fallback
async function generateWithFallback(prompt: string): Promise<string> {
  const primaryModel = 'gemini-2.5-flash'
  const fallbackModel = 'gemini-2.5-flash-lite'
  
  // Try primary model
  try {
    console.log('[Summarize] Trying primary model:', primaryModel)
    const model = genAI.getGenerativeModel({ model: primaryModel })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (primaryError: any) {
    console.error('[Summarize] Primary model error:', primaryError.message)
    
    const isRateLimitOrOverload = 
      primaryError.message?.includes('429') || 
      primaryError.message?.includes('503') ||
      primaryError.message?.includes('overloaded') ||
      primaryError.message?.includes('quota')
    
    // Try fallback model on primary key
    console.log(`[Summarize] Trying ${fallbackModel} on primary key...`)
    try {
      const fallback = genAI.getGenerativeModel({ model: fallbackModel })
      const result = await fallback.generateContent(prompt)
      return result.response.text()
    } catch (fallbackError: any) {
      console.error('[Summarize] Fallback on primary key failed:', fallbackError.message)
      
      // Try fallback API key if available
      if (genAI2) {
        console.log(`[Summarize] Trying ${fallbackModel} on GEMINI_API_KEY2...`)
        try {
          const fallback2 = genAI2.getGenerativeModel({ model: fallbackModel })
          const result = await fallback2.generateContent(prompt)
          return result.response.text()
        } catch (e) {
          // Fall through
        }
      }
    }
    
    throw primaryError
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const { content, noteId, projectId, summaryType = 'concise' } = body;

    if (!content || !projectId) {
      return NextResponse.json(
        { error: 'Content and project ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check subscription and token balance
    const subscription = await getUserSubscription(user.id);
    
    if (!hasActiveAccess(subscription as SubscriptionProfile) && subscription.subscription_tier !== 'free') {
      return NextResponse.json(
        { error: 'Your subscription has expired. Please renew to continue using AI features.' },
        { status: 403 }
      );
    }
    
    const validBalance = await getValidTokenBalance(user.id);
    if (validBalance < MIN_TOKENS_TO_GENERATE) {
      return NextResponse.json(
        { 
          error: `Insufficient tokens. You need at least ${MIN_TOKENS_TO_GENERATE} tokens to summarize. Current balance: ${validBalance}`,
          tokensRequired: MIN_TOKENS_TO_GENERATE,
          currentBalance: validBalance
        },
        { status: 402 }
      );
    }

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

    // Strip HTML tags for processing
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (plainText.length < 50) {
      return NextResponse.json(
        { error: 'Content is too short to summarize. Please add more text.' },
        { status: 400 }
      );
    }

    // Determine summary style based on type
    let promptInstructions = '';
    switch (summaryType) {
      case 'bullet':
        promptInstructions = `Create a bullet-point summary with the key points. Use HTML <ul> and <li> tags for formatting.`;
        break;
      case 'detailed':
        promptInstructions = `Create a detailed summary that captures all important information, organized with clear paragraphs. Use HTML <p> tags for paragraphs and <strong> for key terms.`;
        break;
      case 'concise':
      default:
        promptInstructions = `Create a concise summary in 2-3 paragraphs. Use HTML <p> tags for paragraphs.`;
        break;
    }

    const prompt = `You are an educational content summarizer. Summarize the following study notes.

${promptInstructions}

Notes content:
${plainText.slice(0, 10000)}

Important:
- Keep the summary educational and clear
- Preserve key concepts and terminology
- Return ONLY the HTML-formatted summary, no additional text or markdown
- Do not include any code blocks or markdown formatting`;

    const summary = await generateWithFallback(prompt);

    if (!summary) {
      throw new Error('No response from AI');
    }

    // Clean up any markdown formatting
    let cleanSummary = summary.trim();
    if (cleanSummary.startsWith('```html')) {
      cleanSummary = cleanSummary.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanSummary.startsWith('```')) {
      cleanSummary = cleanSummary.replace(/```\n?/g, '');
    }

    // Calculate and deduct tokens
    const outputWordCount = countWords(cleanSummary);
    const tokensRequired = calculateOutputTokenCost(outputWordCount);
    
    console.log(`Summary generated: ${outputWordCount} words, deducting ${tokensRequired} tokens`);

    const deducted = await deductTokensWithExpiry(user.id, tokensRequired);
    if (!deducted) {
      console.error('Failed to deduct tokens after summarization');
    }

    // Save summary to the note in database
    if (noteId) {
      const { error: updateError } = await supabase
        .from('notes')
        .update({
          summary: cleanSummary,
          summary_type: summaryType,
          summary_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to save summary to note:', updateError);
      } else {
        console.log('Summary saved to note:', noteId);
      }
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.SUMMARIZE,
      endpoint: '/api/notes/summarize',
      method: 'POST',
      tokens_used: tokensRequired,
      model: 'gemini-2.5-flash',
      metadata: { summaryType, noteId, outputWords: outputWordCount },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 200,
      duration_ms: Date.now() - startTime,
    });

    // Dispatch token update event (client will handle UI refresh)
    return NextResponse.json({ 
      summary: cleanSummary,
      tokensUsed: tokensRequired,
      outputWords: outputWordCount,
      savedToNote: !!noteId
    });
  } catch (error: any) {
    console.error('Error summarizing notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to summarize notes' },
      { status: 500 }
    );
  }
}
