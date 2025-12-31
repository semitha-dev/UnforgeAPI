/**
 * Query Classifier - Pattern-Based Classification
 * 
 * Classifies queries into:
 * - CHAT: Greetings, thanks, casual conversation
 * - COMMAND: App actions (create flashcards, quiz, summarize)
 * - RESEARCH: Questions needing factual answers
 * 
 * Approach:
 * 1. Regex for greetings (instant, high confidence)
 * 2. Keywords for COMMAND detection (instant, high confidence)
 * 3. Research patterns for questions (instant, high confidence)
 * 4. Fallback heuristics for edge cases
 */

// ============================================
// TYPES
// ============================================

export type ClassificationPath = 'CHAT' | 'COMMAND' | 'RESEARCH';

export interface ClassificationResult {
  path: ClassificationPath;
  confidence: number;
  reason: string;
  // For COMMAND path
  commandType?: 'create_study_set' | 'quiz_me' | 'summarize_notes' | 'explain_more';
  topic?: string;
  fromNotes?: boolean;
}

// ============================================
// GREETING PATTERNS (Instant detection)
// ============================================

const GREETING_PATTERNS = [
  /^(hi|hey|hello|howdy|hiya|yo|sup|heya)(\s+there)?[!?.,]*$/i,
  /^good\s+(morning|afternoon|evening|night)[!?.,]*$/i,
  /^how\s+(are\s+you|r\s+u|do\s+you\s+do|'s\s+it\s+going)[!?.,]*$/i,
  /^what'?s\s+up[!?.,]*$/i,
  /^(thanks|thank\s+you|thx|ty)[!?.,\s]*(so\s+much)?[!?.,]*$/i,
  /^(bye|goodbye|see\s+(you|ya)|later|cya|take\s+care)[!?.,]*$/i,
  /^(ok|okay|alright|got\s+it|understood|i\s+see)[!?.,]*$/i,
  /^(cool|nice|awesome|great|amazing|wonderful|perfect)[!?.,]*$/i,
];

// ============================================
// COMMAND PATTERNS
// ============================================

const COMMAND_PATTERNS = [
  // Create study set patterns
  { pattern: /\b(create|make|generate|build)\b.*\b(flashcard|study\s*set|quiz|question)/i, type: 'create_study_set' as const },
  { pattern: /\b(flashcard|study\s*set)\b.*\b(about|on|for)\b/i, type: 'create_study_set' as const },
  { pattern: /\bflashcards?\b.*\b(from|using)\b.*\bnotes?\b/i, type: 'create_study_set' as const },
  
  // Quiz patterns
  { pattern: /\b(quiz|test)\s*(me|my\s*knowledge)\b/i, type: 'quiz_me' as const },
  { pattern: /\b(start|take|give\s*me)\s*(a\s*)?(quiz|test)\b/i, type: 'quiz_me' as const },
  { pattern: /\bpractice\s*(questions?|quiz)\b/i, type: 'quiz_me' as const },
  
  // Summarize patterns
  { pattern: /\b(summarize|summary)\b.*\bnotes?\b/i, type: 'summarize_notes' as const },
  { pattern: /\b(tldr|tl;dr)\b/i, type: 'summarize_notes' as const },
  { pattern: /\bgive\s*me\s*a\s*summary\b/i, type: 'summarize_notes' as const },
  
  // Explain more patterns
  { pattern: /\b(explain|elaborate|expand)\b.*\b(more|further|this)\b/i, type: 'explain_more' as const },
  { pattern: /\bgo\s*deeper\b/i, type: 'explain_more' as const },
];

// ============================================
// RESEARCH PATTERNS (High confidence)
// ============================================

const RESEARCH_PATTERNS = [
  // Question starters
  /^(what|how|why|when|where|who|which)\s+(is|are|was|were|does|do|did|can|could|would|should)\b/i,
  /^(can|could|would|should|is|are|do|does|did)\s+\w+/i,
  // Comparison queries
  /\b(vs|versus|compare|comparison|difference\s+between|better|best|worse|worst)\b/i,
  /\bwh(at|ich)\s+is\s+(better|best|worse|the\s+difference)\b/i,
  // Learning/explanation intent
  /^(explain|describe|define|tell\s+me\s+about)\b/i,
  /\b(how\s+to|how\s+do\s+i|how\s+can\s+i)\b/i,
  // Research keywords
  /\b(meaning|definition|example|tutorial|guide|learn|understand)\b/i,
  /\b(pros\s+and\s+cons|advantages|disadvantages|benefits|drawbacks)\b/i,
];

// ============================================
// MAIN CLASSIFICATION FUNCTION
// ============================================

/**
 * Classify a query using pattern matching
 * No external API calls - instant classification
 */
export async function classifyQuery(
  query: string,
  options: {
    hasNotes?: boolean;
    conversationContext?: string;
  } = {}
): Promise<ClassificationResult> {
  const normalizedQuery = query.trim().toLowerCase();
  
  // ============================================
  // STEP 1: Quick Greeting Check (Regex)
  // ============================================
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      return {
        path: 'CHAT',
        confidence: 0.95,
        reason: 'Matched greeting pattern',
      };
    }
  }

  // ============================================
  // STEP 2: Command Detection (Keywords)
  // ============================================
  for (const { pattern, type } of COMMAND_PATTERNS) {
    if (pattern.test(query)) {
      const topic = extractTopic(query, type);
      const fromNotes = /\b(my\s+)?notes?\b|\bmy\s+(content|material)\b/i.test(query);
      
      return {
        path: 'COMMAND',
        confidence: 0.95,
        reason: `Matched command pattern: ${type}`,
        commandType: type,
        topic,
        fromNotes,
      };
    }
  }

  // ============================================
  // STEP 3: Research Pattern Detection
  // ============================================
  for (const pattern of RESEARCH_PATTERNS) {
    if (pattern.test(query)) {
      return {
        path: 'RESEARCH',
        confidence: 0.90,
        reason: 'Matched research pattern',
      };
    }
  }

  // ============================================
  // STEP 4: Fallback Heuristics
  // ============================================
  return fallbackClassification(query, options);
}

/**
 * Initialize classifier (no-op, kept for API compatibility)
 */
export async function initializeClassifier(): Promise<boolean> {
  return true;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if query looks like a question
 */
function looksLikeQuestion(query: string): boolean {
  const q = query.toLowerCase().trim();
  return (
    q.endsWith('?') ||
    /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did)\b/i.test(q) ||
    /\b(explain|tell\s+me|describe|compare|difference|vs|versus)\b/i.test(q)
  );
}

/**
 * Extract topic from query based on command type
 */
function extractTopic(query: string, commandType?: string): string | undefined {
  let topic = query
    .replace(/\b(create|make|generate|build|give\s+me|start)\b/gi, '')
    .replace(/\b(flashcard|study\s*set|quiz|test|summary|questions?)\b/gi, '')
    .replace(/\b(about|on|for|from|using|my|notes?)\b/gi, '')
    .replace(/\b(a|an|the|some|me)\b/gi, '')
    .trim();

  topic = topic.replace(/\s+/g, ' ').trim();
  
  return topic.length > 2 ? topic : undefined;
}

/**
 * Fallback classification using heuristics
 */
function fallbackClassification(
  query: string,
  options: { hasNotes?: boolean; conversationContext?: string }
): ClassificationResult {
  const q = query.toLowerCase().trim();
  const wordCount = q.split(/\s+/).length;
  
  // Very short queries (1-2 words) - check for research keywords
  if (wordCount <= 2 && !looksLikeQuestion(query)) {
    if (/\b(vs|compare|difference|better|best|explain|how|what|why)\b/i.test(q)) {
      return {
        path: 'RESEARCH',
        confidence: 0.85,
        reason: 'Short but contains research keywords',
      };
    }
    return {
      path: 'CHAT',
      confidence: 0.75,
      reason: 'Very short non-question query',
    };
  }
  
  // Questions -> RESEARCH
  if (looksLikeQuestion(query)) {
    const confidence = wordCount >= 5 ? 0.90 : 0.85;
    return {
      path: 'RESEARCH',
      confidence,
      reason: `Question detected (${wordCount} words)`,
    };
  }
  
  // Multi-word queries -> likely research
  if (wordCount >= 3) {
    return {
      path: 'RESEARCH',
      confidence: 0.80,
      reason: 'Multi-word query (assuming research intent)',
    };
  }
  
  // Default to research
  return {
    path: 'RESEARCH',
    confidence: 0.75,
    reason: 'Default fallback',
  };
}

// ============================================
// PRE-GENERATED CHAT RESPONSES
// ============================================

export function getChatResponse(query: string): string | undefined {
  const q = query.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hey|hello|howdy|hiya|yo|sup|heya)(\s+there)?[!?.,]*$/i.test(q)) {
    return "Hello! 👋 How can I help you today? Feel free to ask me anything about your studies, request research on a topic, or ask me to create flashcards and quizzes!";
  }
  
  if (/^good\s+(morning)[!?.,]*$/i.test(q)) {
    return "Good morning! ☀️ Ready to learn something new today?";
  }
  
  if (/^good\s+(afternoon)[!?.,]*$/i.test(q)) {
    return "Good afternoon! 🌤️ How can I help with your studies?";
  }
  
  if (/^good\s+(evening|night)[!?.,]*$/i.test(q)) {
    return "Good evening! 🌙 Still hitting the books? I'm here to help!";
  }
  
  // How are you
  if (/^how\s+(are\s+you|r\s+u|'s\s+it\s+going)/i.test(q)) {
    return "I'm doing great, thanks for asking! 😊 How can I help you with your studies?";
  }
  
  // Thanks
  if (/^(thanks|thank\s+you|thx|ty)/i.test(q)) {
    return "You're welcome! Let me know if there's anything else I can help you with. 🙌";
  }
  
  // Bye
  if (/^(bye|goodbye|see\s+(you|ya)|later|cya|take\s+care)/i.test(q)) {
    return "Goodbye! Good luck with your studies! 📚 Come back anytime you need help.";
  }
  
  // Reactions
  if (/^(cool|nice|awesome|great|amazing|wonderful|perfect)[!?.,]*$/i.test(q)) {
    return "Glad I could help! 😊 Anything else you'd like to explore?";
  }
  
  if (/^(ok|okay|alright|got\s+it|understood|i\s+see)[!?.,]*$/i.test(q)) {
    return "Great! Let me know if you have any questions.";
  }
  
  // Stressed
  if (/\b(stressed|overwhelmed|anxious|tired)\b/i.test(q)) {
    return "I hear you - studying can be tough! 💪 Remember to take breaks, stay hydrated, and don't hesitate to ask for help. What are you working on? Maybe I can make it easier.";
  }
  
  return undefined;
}
