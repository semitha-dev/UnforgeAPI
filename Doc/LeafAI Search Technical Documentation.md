# LeafAI Search - Technical Documentation

**Version:** 3.0  
**Last Updated:** December 30, 2025  
**Author:** LeafLearning Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Multi-Purpose Router](#multi-purpose-router)
4. [API Endpoints](#api-endpoints)
5. [Search Flow](#search-flow)
6. [Study Set Generation](#study-set-generation)
7. [Subscription & Rate Limiting](#subscription--rate-limiting)
8. [Database Schema](#database-schema)
9. [Configuration](#configuration)
10. [Error Handling](#error-handling)

---

## Overview

LeafAI Search is an intelligent, multi-purpose AI assistant that combines web search capabilities with educational content generation. The core innovation is the **Multi-Purpose Router** - an AI "Router Brain" that classifies requests into three distinct paths, ensuring the right action is taken without unnecessary web searches.

### Key Features

- **Multi-Purpose Router** - AI classifies requests into CHAT, COMMAND, or RESEARCH paths
- **Context Awareness** - Uses user's notes and project context for better responses
- **Web Search Integration** - Powered by Tavily API (only when needed)
- **Study Set Generation** - Creates flashcards and quizzes from notes OR web results
- **Streaming Responses** - Real-time response streaming via Server-Sent Events (SSE)
- **Subscription Tiers** - Free and Pro tiers with different capabilities

### The Three Paths

| Path | Purpose | Web Search? | Example |
|------|---------|-------------|---------|
| **CHAT** | Conversations, greetings, emotions | ❌ No | "How are you?", "Thanks!" |
| **COMMAND** | App actions using internal data | ❌ No | "Create flashcards from my notes" |
| **RESEARCH** | Learning new external information | ✅ Yes | "What is photosynthesis?" |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Overview Page  │  │  LeafAI Page    │  │  Space Page     │ │
│  │  (Global Search)│  │  (Space Search) │  │  (Quick Search) │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │  /api/leafai/search     │  │  /api/leafai/search-stream  │  │
│  │  (Non-streaming)        │  │  (Streaming via SSE)        │  │
│  └───────────┬─────────────┘  └───────────────┬─────────────┘  │
└──────────────┼────────────────────────────────┼─────────────────┘
               │                                │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MULTI-PURPOSE ROUTER                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              🧠 Router Brain (llama-3.1-8b-instant)       │  │
│  │                                                           │  │
│  │   Input: Query + Project Context + Has Notes?             │  │
│  │   Output: { path, reason, action_payload, chat_response } │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│         ┌────────┐      ┌─────────┐     ┌──────────┐           │
│         │  CHAT  │      │ COMMAND │     │ RESEARCH │           │
│         │  Path  │      │  Path   │     │   Path   │           │
│         └────────┘      └─────────┘     └──────────┘           │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│         Direct LLM      Internal        Web Search              │
│         Response        Context         + Synthesis             │
└─────────────────────────────────────────────────────────────────┘
               │                                │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer (Supabase)                       │
│  - profiles (subscription info)                                 │
│  - projects (spaces)                                            │
│  - notes (user's study notes)                                   │
│  - study_sets (generated study materials)                       │
│  - study_items (flashcards, quizzes)                            │
│  - ai_search_history (search logs)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Purpose Router

The Router Brain is the core innovation of LeafAI Search v3.0. It solves the problem of "over-eager web searching" by classifying user intent BEFORE deciding whether to search.

### Router Classification

```typescript
type RouterPath = 'CHAT' | 'COMMAND' | 'RESEARCH'

type CommandAction = 
  | { type: 'create_study_set'; topic?: string; fromNotes: boolean }
  | { type: 'quiz_me'; topic?: string }
  | { type: 'summarize_notes' }
  | { type: 'explain_more'; context?: string }

interface RouterClassification {
  path: RouterPath
  reason: string
  action_payload: CommandAction | null
  chat_response?: string      // Pre-generated response for CHAT path
  research_query?: string     // Optimized query for RESEARCH path
}
```

### Classification Flow

```
User Query: "Create a study set about cats"
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 1: Quick Greeting Check (Regex)           │
│  ─────────────────────────────────────          │
│  /^(hi|hey|hello)...$/  → CHAT (skip LLM call)  │
└─────────────────────────────────────────────────┘
                    │ Not a greeting
                    ▼
┌─────────────────────────────────────────────────┐
│  Step 2: Router Brain (LLM Classification)      │
│  ─────────────────────────────────────          │
│  Model: llama-3.1-8b-instant                    │
│  Input: Query + Project + hasNotes              │
│  Output: RouterClassification JSON              │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Result:                                        │
│  {                                              │
│    path: "COMMAND",                             │
│    reason: "User wants to create study set",   │
│    action_payload: {                            │
│      type: "create_study_set",                  │
│      topic: "cats",                             │
│      fromNotes: false                           │
│    }                                            │
│  }                                              │
└─────────────────────────────────────────────────┘
```

### Router Brain Prompt

```
You are the "Router Brain" for an educational AI. Your job is to classify 
the user's request into one of 3 distinct paths.

PATHS:
1. "CHAT": Casual conversation, greetings, jokes, emotional support, or 
   simple acknowledgments. Examples: "How are you?", "That's cool", "Thanks!", 
   "Tell me a joke", "I'm stressed about exams". DO NOT SEARCH THE WEB.

2. "COMMAND": User wants to perform a specific app action. Examples: 
   "Create flashcards from my notes", "Quiz me on this", "Make a study set 
   about biology", "Summarize my notes". DO NOT SEARCH THE WEB unless they 
   explicitly ask for web info.

3. "RESEARCH": User is asking for NEW information, facts, or topics they 
   don't know. Examples: "How does photosynthesis work?", "What caused 
   World War 2?", "Explain quantum computing". This is the ONLY path that 
   searches the web.

CRITICAL RULES:
- If user says "create", "make", "generate" + "flashcards"/"quiz"/"study set" 
  → COMMAND, not RESEARCH
- If user is asking about their OWN notes/content → COMMAND, not RESEARCH  
- If user is making small talk or reacting → CHAT, not RESEARCH
- Only use RESEARCH when user genuinely needs external information
```

### Path Behaviors

#### PATH 1: CHAT
```typescript
// No web search, no database queries
// Just generate a friendly response

if (classification.path === 'CHAT') {
  const response = classification.chat_response || 
    await generateChatResponse(query, projectName)
  
  return { answer: response, citations: [] }
}
```

**Examples:**
| Input | Response |
|-------|----------|
| "Hey" | "Hello! 👋 How can I help you today?" |
| "How are you?" | "I'm doing great, thanks for asking! 😊" |
| "Thanks!" | "You're welcome! Let me know if you need anything else." |
| "I'm stressed about exams" | "I understand exam stress! Take deep breaths..." |

#### PATH 2: COMMAND
```typescript
// Uses internal context (notes, project data)
// NO web search

if (classification.path === 'COMMAND') {
  const action = classification.action_payload
  
  if (action?.type === 'create_study_set') {
    if (action.fromNotes || hasNotes) {
      // Generate from NOTES, not web
      const materials = await generateStudySet(projectName, [], notesContext)
      // Save to database...
    } else if (action.topic) {
      // Fall through to RESEARCH path with topic
      classification.path = 'RESEARCH'
      classification.research_query = action.topic
    } else {
      // Ask for clarification
      return { answer: "What topic would you like to study?" }
    }
  }
  
  if (action?.type === 'summarize_notes') {
    const summary = await summarizeNotes(notesContext)
    return { answer: summary, citations: [] }
  }
}
```

**Context Awareness Logic:**
```
"Create a study set from my notes"
         │
         ▼
    Has notes? ───► YES → Generate from notes (no web search)
         │
         NO
         │
         ▼
    Return: "I don't see any notes in this space yet. 
             Add some notes first!"
```

#### PATH 3: RESEARCH
```typescript
// Web search for external information

if (classification.path === 'RESEARCH') {
  const searchQuery = classification.research_query || query
  
  // 1. Search the web
  const results = await searchWeb(searchQuery)
  
  // 2. Gap analysis (Pro only)
  const gaps = await analyzeGaps(query, results)
  if (gaps.hasGaps) {
    const moreResults = await searchWeb(gaps.followUpQuery)
    results.push(...moreResults)
  }
  
  // 3. Synthesize answer
  const answer = await synthesizeAnswer(query, results)
  
  return { answer, citations }
}
```

---

## API Endpoints

### 1. `/api/leafai/search` (Non-Streaming)

**Method:** POST  
**Content-Type:** application/json

#### Request Body

```typescript
interface SearchRequest {
  query: string;              // User's query
  projectId?: string;         // Optional: Space/project ID
  projectName?: string;       // Optional: Space name for context
  mode?: 'fast' | 'research'; // Search mode (default: 'fast')
  notesContext?: Array<{      // Optional: User's notes for context
    title: string;
    content: string;
  }>;
}
```

#### Response

```typescript
interface SearchResponse {
  answer: string;             // Synthesized answer in Markdown
  citations: Citation[];      // Source citations (empty for CHAT/COMMAND)
  studySetCreated?: {         // If study set was generated
    id: string;
    title: string;
    itemCount: number;
  };
  _debug?: {                  // Debug information
    path: 'CHAT' | 'COMMAND' | 'RESEARCH';
    reason: string;
    searchQuery?: string;
    sourcesFound?: number;
  };
}
```

---

### 2. `/api/leafai/search-stream` (Streaming)

**Method:** POST  
**Content-Type:** application/json  
**Response:** text/event-stream (SSE)

#### Request Body

```typescript
interface StreamSearchRequest {
  query: string;
  projectId?: string;
  projectName?: string;
  searchMode?: 'fast' | 'research';
  files?: Array<{
    name: string;
    content: string;
    type: string;
  }>;
}
```

#### SSE Events

| Event | Data | Description |
|-------|------|-------------|
| `status` | `{ step, message }` | Progress updates |
| `sources` | `{ sources: [] }` | Search sources found |
| `citations` | `{ citations: [] }` | Formatted citations |
| `text` | `{ content: string }` | Streamed answer chunks |
| `studySetCreated` | `{ id, title, itemCount }` | Study set created |
| `modeDowngraded` | `{ message, originalMode, newMode }` | Mode was downgraded |
| `done` | `{ success, _debug }` | Stream complete |
| `error` | `{ message }` | Error occurred |

#### Status Steps by Path

**CHAT Path:**
1. `understanding` → `done` (instant)

**COMMAND Path:**
1. `understanding` - Classifying request
2. `creating_study_set` - Generating materials (if applicable)
3. `done`

**RESEARCH Path:**
1. `understanding` - Classifying request
2. `optimizing` - Rephrasing query
3. `searching` - Web search
4. `analyzing` - Gap analysis (Pro only)
5. `deepening` - Second search (if gaps)
6. `generating` - Synthesizing answer
7. `creating_study_set` - If study set requested
8. `done`

---

## Search Flow

### RESEARCH Path Pipeline

```
1. QUERY OPTIMIZATION
   └── Rephrase user query for better search results
       Input:  "I want to learn about how plants make food"
       Output: "photosynthesis plant food production process"

2. WEB SEARCH (Tavily API)
   ├── Primary search with optimized query
   └── Fallback search with original query if no results

3. GAP ANALYSIS (Pro Mode Only)
   ├── Analyze if search results fully answer the question
   ├── Calculate confidence score (0-100)
   └── If confidence < 70, generate follow-up query

4. SECOND SEARCH (If gaps detected)
   └── Search with follow-up query, merge results

5. ANSWER SYNTHESIS
   └── Stream answer using search results as context
       (Uses citations [1], [2], etc.)

6. STUDY SET GENERATION (If requested)
   ├── Generate flashcards from search results
   ├── Generate quiz questions
   └── Save to database
```

---

## Study Set Generation

### Generation Sources

| Source | Trigger | Web Search? |
|--------|---------|-------------|
| Notes | "Create flashcards from my notes" | No |
| Topic (Web) | "Create a study set about cats" | Yes |
| Search Results | After any RESEARCH query | Yes |

### Generation Flow

```typescript
async function generateStudySet(
  title: string,
  searchResults: TavilyResult[],  // Empty if from notes
  notesContext?: NoteContext[]    // Provided if from notes
): Promise<StudyMaterials>
```

### Output Format

```typescript
interface StudyMaterials {
  flashcards: Array<{
    term: string;
    definition: string;
  }>;
  quizzes: Array<{
    question: string;
    correct_answer: string;
    wrong_answers: string[];  // 3 wrong options
  }>;
}
```

### Global Search Study Sets

When creating a study set from global search (no project):
1. Check if "Global Searches" project exists for user
2. If not, create it automatically
3. Save study set to this project

---

## Subscription & Rate Limiting

### Subscription Tiers

| Feature | Free | Pro ($6.99/mo) |
|---------|------|----------------|
| Search Mode | Fast only | Fast + Research |
| AI Model | llama-3.1-8b-instant | llama-3.3-70b-versatile |
| Rate Limit | 5 searches/minute | Unlimited |
| Spaces | 3 max | Unlimited |
| Study Sets | ✓ | ✓ |
| Gap Analysis | ✗ | ✓ (Agentic) |

### Rate Limiting

```typescript
const FREE_TIER_RATE_LIMIT = 5  // requests per minute
const WINDOW_MS = 60 * 1000     // 60 seconds

// Note: CHAT path doesn't count toward rate limit
// Only RESEARCH path consumes rate limit quota
```

---

## Database Schema

### Tables Used

#### `study_sets`

```sql
CREATE TABLE study_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_type VARCHAR(50),  -- 'ai_generated', 'notes', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `study_items`

```sql
CREATE TABLE study_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_set_id UUID REFERENCES study_sets(id),
  item_type VARCHAR(20) NOT NULL,  -- 'flashcard' or 'quiz'
  content JSONB,  -- Flexible content storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `notes` (Used for Context)

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Configuration

### Environment Variables

```env
# Groq API (LLM)
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# Tavily API (Web Search)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

### Model Configuration

```typescript
const MODELS = {
  fast: 'llama-3.1-8b-instant',       // Router Brain + Free tier
  research: 'llama-3.3-70b-versatile' // Pro tier deep research
} as const
```

---

## Error Handling

### Stream Close Safety

The streaming API uses a `closeStream()` helper to prevent double-close errors:

```typescript
let streamClosed = false
const closeStream = async () => {
  if (!streamClosed) {
    streamClosed = true
    await writer.close()
  }
}

// All early returns use closeStream()
// finally block also uses closeStream()
```

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Query is required` | Empty query | Provide a query string |
| `Research mode requires Pro` | Free user + research mode | Upgrade or use fast mode |
| `Rate limit exceeded` | Too many requests | Wait for rate limit reset |
| `WritableStream is closed` | Double close attempt | Fixed in v3.0 |

---

## Changelog

### Version 3.0 (December 30, 2025)
- **Breaking:** Replaced linear pipeline with Multi-Purpose Router
- **New:** Three-path system (CHAT, COMMAND, RESEARCH)
- **New:** Context-aware study set creation from notes
- **New:** `generateChatResponse()` for conversational responses
- **Fixed:** "How are you?" no longer triggers web search
- **Fixed:** "Create study set from my notes" uses actual notes
- **Fixed:** WritableStream double-close error in streaming API
- **Improved:** Notes fetched from database for context awareness

### Version 2.0 (December 30, 2025)
- Replaced keyword-based intent detection with AI-driven detection
- Added greeting detection (fast path)
- Added "Global Searches" project

### Version 1.0 (Initial Release)
- Basic web search functionality
- Keyword-based study set detection
- Streaming and non-streaming APIs

---

## Quick Reference

### When Does Web Search Happen?

| Query | Path | Web Search? |
|-------|------|-------------|
| "Hi" | CHAT | ❌ |
| "How are you?" | CHAT | ❌ |
| "Thanks!" | CHAT | ❌ |
| "Create flashcards from my notes" | COMMAND | ❌ |
| "Summarize my notes" | COMMAND | ❌ |
| "Create a study set about cats" | RESEARCH | ✅ |
| "What is photosynthesis?" | RESEARCH | ✅ |
| "Explain quantum computing" | RESEARCH | ✅ |

---

## Support

For issues or feature requests, contact the LeafLearning development team.
