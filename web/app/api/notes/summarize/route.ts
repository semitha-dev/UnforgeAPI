// app/api/notes/summarize/route.ts
import { createClient } from '@/app/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getUserSubscription, hasActiveAccess, SubscriptionProfile } from '@/lib/subscription';
import { logActivity, getRequestInfo, ActionTypes } from '@/app/lib/activityLogger';

// Initialize Groq - 100% FREE!
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Models optimized for production - high rate limits
const PRIMARY_MODEL = 'llama-3.1-8b-instant'; // 14,400 requests/day
const FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // 30K tokens/min

// Helper function to generate with fallback
async function generateWithFallback(prompt: string): Promise<{ text: string; model: string }> {
  // Try primary model
  try {
    console.log('[Summarize] Using model:', PRIMARY_MODEL);
    const completion = await groq.chat.completions.create({
      model: PRIMARY_MODEL,
      messages: [
        { role: 'system', content: 'You are an educational content summarizer. Always respond with clean HTML formatting only, no markdown.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });
    return { text: completion.choices[0]?.message?.content || '', model: PRIMARY_MODEL };
  } catch (primaryError: any) {
    console.error('[Summarize] Primary model failed:', primaryError.message);
    
    // Try fallback model
    try {
      console.log('[Summarize] Trying fallback:', FALLBACK_MODEL);
      const completion = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [
          { role: 'system', content: 'You are an educational content summarizer. Always respond with clean HTML formatting only, no markdown.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });
      return { text: completion.choices[0]?.message?.content || '', model: FALLBACK_MODEL };
    } catch (fallbackError: any) {
      console.error('[Summarize] Fallback also failed:', fallbackError.message);
      
      if (fallbackError?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw fallbackError;
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { ip, userAgent } = getRequestInfo(request);
  
  try {
    const body = await request.json();
    const { content, noteId, projectId, summaryType = 'concise', citationStyle = 'none', sourceName = '' } = body;

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
      case 'findings':
        promptInstructions = `Extract and present the main research findings, methodology highlights, and conclusions. Structure the output with clear sections:
        - <h4>Methodology</h4>: Brief overview of methods used
        - <h4>Key Findings</h4>: Main discoveries and results
        - <h4>Conclusions</h4>: What the findings mean
        Use HTML <p> tags for paragraphs, <strong> for emphasis, and <ul><li> for lists where appropriate.`;
        break;
      case 'keypoints':
        promptInstructions = `Identify and list the most important key points and main takeaways. Format as:
        - Use <h4>Key Points</h4> as a header
        - List each key point as a numbered item using <ol><li> tags
        - Include a brief <h4>Summary</h4> section at the end
        Make each point clear, actionable, and memorable.`;
        break;
      case 'concise':
      default:
        promptInstructions = `Create a concise summary in 2-3 paragraphs. Use HTML <p> tags for paragraphs.`;
        break;
    }

    // Add citation style instructions if requested
    let citationInstructions = '';
    if (citationStyle !== 'none') {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      citationInstructions = `

At the end of the summary, include a <h4>Bibliography</h4> section with a proper citation in ${citationStyle.toUpperCase()} format.
Source name: "${sourceName || 'Untitled Document'}"
Current date for access date: ${currentDate}
Current year: ${currentYear}

${citationStyle === 'apa' ? 
  `Use APA 7th edition format. Example: Author, A. A. (Year). Title of work. Publisher. URL (if applicable)
  If author is unknown, start with the title. For web sources, include "Retrieved [date]"` :
  citationStyle === 'mla' ?
  `Use MLA 9th edition format. Example: Last name, First name. "Title of Source." Container, Other contributors, Version, Number, Publisher, Publication date, Location.
  For web sources, include "Accessed [date]"` :
  `Use Chicago 17th edition (Notes-Bibliography) format. Example: First name Last name, Title of Work (Place: Publisher, Year), page numbers.
  For web sources, include "accessed [date]"`
}

Make sure the citation is properly formatted and includes all available information.`;
    }

    const prompt = `Summarize the following study notes.

${promptInstructions}
${citationInstructions}

Notes content:
${plainText.slice(0, 10000)}

Important:
- Keep the summary educational and clear
- Preserve key concepts and terminology
- Return ONLY the HTML-formatted summary, no additional text or markdown
- Do not include any code blocks or markdown formatting`;

    const { text: summary, model: modelUsed } = await generateWithFallback(prompt);

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
        console.error('[Summarize] Failed to save summary:', updateError);
      } else {
        console.log('[Summarize] Summary saved to note:', noteId);
      }
    }

    // Log activity
    await logActivity({
      user_id: user.id,
      user_email: user.email,
      action_type: ActionTypes.SUMMARIZE,
      endpoint: '/api/notes/summarize',
      method: 'POST',
      tokens_used: 0,
      model: modelUsed,
      metadata: { summaryType, noteId, provider: 'groq' },
      ip_address: ip,
      user_agent: userAgent,
      response_status: 200,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({ 
      summary: cleanSummary,
      tokensUsed: 0,
      savedToNote: !!noteId,
      model: modelUsed,
      provider: 'groq'
    });
  } catch (error: any) {
    console.error('[Summarize] Error:', error);
    
    if (error.message === 'RATE_LIMITED') {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to summarize notes' },
      { status: 500 }
    );
  }
}
