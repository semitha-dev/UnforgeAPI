# LeafSearch Technical Documentation

## Overview

LeafSearch is an AI-powered search engine built into LeafLearning that combines real-time web search with intelligent answer synthesis. It uses **Groq** for fast LLM inference and **Tavily** for web search, creating a Perplexity-like experience tailored for educational content.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Perplexity-style (empty) → ChatGPT-style (with messages)   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      /api/leafai/search                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │    Query     │→ │   Tavily     │→ │   Groq LLM Synthesis     │   │
│  │  Optimizer   │  │  Web Search  │  │   (llama-3.3-70b)        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│         │                                        │                   │
│         │          ┌──────────────┐              │                   │
│         └─────────→│ Study Set    │←─────────────┘                   │
│                    │ Generator    │                                  │
│                    └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ ai_search_   │  │  study_sets  │  │     study_items          │   │
│  │ history      │  │              │  │                          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Frontend - Project Overview Page

**File:** `app/(pages)/project/[id]/page.tsx`

#### State Management
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  studySetCreated?: {
    id: string
    title: string
    itemCount: number
  }
  timestamp: Date
}

// Key states
const [query, setQuery] = useState('')
const [isSearching, setIsSearching] = useState(false)
const [messages, setMessages] = useState<Message[]>([])
const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
```

#### UI Modes

| Mode | Condition | Layout |
|------|-----------|--------|
| **Perplexity-style** | `messages.length === 0` | Centered logo, search input in middle, quick actions, recent searches |
| **ChatGPT-style** | `messages.length > 0` | Scrollable message thread, fixed bottom input |

#### Features
- Auto-resizing textarea
- Quick action buttons (Explain concepts, Create study set, Latest research)
- Recent searches from `ai_search_history` table
- Study set creation popup
- Smooth animations with `animate-in` classes

---

### 2. Backend - Search API

**File:** `app/api/leafai/search/route.ts`

#### Request
```typescript
POST /api/leafai/search

Body:
{
  "query": string,      // User's question
  "projectId": string,  // Current project UUID
  "projectName": string // Project name for context
}
```

#### Response
```typescript
{
  "answer": string,           // Synthesized answer with [1], [2] citations
  "citations": Citation[],    // Array of source references
  "studySetCreated"?: {       // Only if study set was requested
    "id": string,
    "title": string,
    "itemCount": number
  },
  "_debug": {                 // Debug info (remove in production)
    "searchQuery": string,
    "sourcesFound": number,
    "tavilyConfigured": boolean
  }
}
```

#### Processing Pipeline

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Study Set Detection              │
│    - Pattern matching for:          │
│      "create study set about..."    │
│      "flashcards for..."            │
│      "quiz about..."                │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Query Optimization (Groq)        │
│    - Model: llama-3.3-70b-versatile │
│    - Temperature: 0.3               │
│    - Max tokens: 100                │
│    - Output: Optimized search query │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Web Search (Tavily)              │
│    - Endpoint: api.tavily.com/search│
│    - Search depth: advanced         │
│    - Max results: 8                 │
│    - Returns: title, url, content   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. Answer Synthesis (Groq)          │
│    - Model: llama-3.3-70b-versatile │
│    - Temperature: 0.3               │
│    - Max tokens: 1500               │
│    - ONLY uses provided sources     │
│    - Adds inline citations [1],[2]  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. Study Set Generation (Optional)  │
│    - If detected in step 1          │
│    - Generates 8-10 flashcards      │
│    - Generates 5-6 quiz questions   │
│    - Saves to study_sets table      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 6. Atlas Logging                    │
│    - Logs to ai_search_history      │
│    - For analytics & improvement    │
└─────────────────────────────────────┘
```

---

### 3. Database Schema

**File:** `supabase/migrations/20251229_ai_search_history.sql`

```sql
CREATE TABLE ai_search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Query data
  query TEXT NOT NULL,              -- Original user query
  search_query TEXT,                -- Optimized query sent to Tavily
  
  -- Response data
  answer TEXT,                      -- Generated answer
  citations JSONB DEFAULT '[]',     -- Array of citation objects
  sources_count INTEGER DEFAULT 0,  -- Number of web sources found
  
  -- Linked study set
  study_set_id UUID REFERENCES study_sets(id) ON DELETE SET NULL,
  
  -- Metadata
  model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
  search_engine TEXT DEFAULT 'tavily',
  response_time_ms INTEGER,
  
  -- User feedback (for Atlas improvement)
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_search_history_user_id ON ai_search_history(user_id);
CREATE INDEX idx_ai_search_history_project_id ON ai_search_history(project_id);
CREATE INDEX idx_ai_search_history_created_at ON ai_search_history(created_at DESC);
CREATE INDEX idx_ai_search_history_query_fts ON ai_search_history 
  USING gin(to_tsvector('english', query));
```

#### Row Level Security
```sql
-- Users can only access their own search history
CREATE POLICY "Users can view own search history"
  ON ai_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON ai_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Streaming API (v2 - Recommended)

**File:** `app/api/leafai/search-stream/route.ts`

### Why Streaming?

The streaming API provides a **Perplexity-like UX** where the answer appears token-by-token instead of waiting for the full response. This dramatically improves perceived performance.

### Agentic Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Query Optimization               │
│    Fast Groq call to optimize query │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Initial Web Search (Tavily)      │
│    Advanced depth, 8 results        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. AGENTIC: Gap Analysis (Groq)     │ ◄── "Confidence Check"
│    "Do we have enough info?"        │
│    Returns: hasGaps, suggestedQuery │
│    confidence score (0-100)         │
└─────────────────────────────────────┘
    │
    ▼ (if hasGaps && confidence < 70)
┌─────────────────────────────────────┐
│ 4. Second Search (Tavily)           │
│    Uses suggestedQuery from step 3  │
│    Merges with initial results      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. STREAMING Answer Synthesis       │
│    Uses Vercel AI SDK streamText()  │
│    Token-by-token to client via SSE │
└─────────────────────────────────────┘
```

### SSE Event Types

| Event | Data | Description |
|-------|------|-------------|
| `status` | `{step, message}` | Progress updates (optimizing, searching, analyzing, generating) |
| `citations` | `{citations[]}` | Source citations sent early so UI can display |
| `text` | `{content}` | Streaming text chunks |
| `done` | `{success, _debug}` | Completion signal with debug info |
| `error` | `{message}` | Error message |

### Client Implementation

```typescript
const response = await fetch('/api/leafai/search-stream', {
  method: 'POST',
  body: JSON.stringify({ query, projectId, projectName })
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  buffer += decoder.decode(value, { stream: true })
  
  // Process SSE events
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      
      if (data.content) {
        // Append streaming text to UI
        appendToAnswer(data.content)
      } else if (data.citations) {
        // Display citations immediately
        setCitations(data.citations)
      } else if (data.message) {
        // Update status indicator
        setStatus(data.message)
      }
    }
  }
}
```

### Dependencies

```bash
npm install ai @ai-sdk/groq
```

---

## External APIs

### Groq API

**Purpose:** Fast LLM inference for query optimization and answer synthesis

| Parameter | Value |
|-----------|-------|
| Model | `llama-3.3-70b-versatile` |
| API Endpoint | `api.groq.com` |
| Speed | ~500 tokens/second |
| Context Window | 128K tokens |

**Environment Variable:**
```
GROQ_API_KEY=gsk_xxxxx
```

### Tavily API

**Purpose:** Real-time web search with content extraction

| Parameter | Value |
|-----------|-------|
| Endpoint | `https://api.tavily.com/search` |
| Search Depth | `advanced` |
| Max Results | 8 |
| Response | Title, URL, Content snippet |

**Request Format:**
```json
{
  "api_key": "tvly-xxxxx",
  "query": "search query",
  "search_depth": "advanced",
  "include_answer": false,
  "include_raw_content": false,
  "max_results": 8
}
```

**Environment Variable:**
```
TAVILY_API_KEY=tvly-xxxxx
```

---

## Study Set Generation

### Detection Patterns
```typescript
const patterns = [
  /create\s+(?:a\s+)?study\s+set\s+(?:about|on|for)\s+(.+)/i,
  /make\s+(?:a\s+)?study\s+set\s+(?:about|on|for)\s+(.+)/i,
  /generate\s+(?:a\s+)?study\s+set\s+(?:about|on|for)\s+(.+)/i,
  /study\s+set\s+(?:about|on|for)\s+(.+)/i,
  /flashcards?\s+(?:about|on|for)\s+(.+)/i,
  /quiz\s+(?:about|on|for)\s+(.+)/i
]
```

### Generated Content Structure
```typescript
{
  "flashcards": [
    { "term": "Key Concept", "definition": "Clear explanation" }
  ],
  "quizzes": [
    {
      "question": "Question text?",
      "correct_answer": "Correct option",
      "wrong_answers": ["Wrong 1", "Wrong 2", "Wrong 3"]
    }
  ]
}
```

### Database Storage
- Flashcards stored in `study_items` with `item_type: 'flashcard'`
- Quizzes stored in `study_items` with `item_type: 'quiz'`
- Both linked to parent `study_sets` record

---

## UI/UX Flow

### Empty State (Perplexity-style)
```
┌─────────────────────────────────────────┐
│                                         │
│           leafsearch                    │
│    AI-powered search for [Project]      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Ask anything...                 │    │
│  │                                 │    │
│  │ [🔍] [🎓]          [🌐] [Send] │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Explain concepts] [Create study set]  │
│           [Latest research]             │
│                                         │
│  ─────────── RECENT ───────────         │
│  🕐 Previous search query 1    →        │
│  🕐 Previous search query 2    →        │
│                                         │
└─────────────────────────────────────────┘
```

### With Messages (ChatGPT-style)
```
┌─────────────────────────────────────────┐
│                        [New search]     │
│                                         │
│                    ┌──────────────────┐ │
│                    │ User question    │ │
│                    └──────────────────┘ │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✨ Answer with [1] citations    │    │
│  │                                 │    │
│  │ ─────── SOURCES ───────         │    │
│  │ [1] Source title        ↗      │    │
│  │ [2] Another source      ↗      │    │
│  └─────────────────────────────────┘    │
│                                         │
│                    ┌──────────────────┐ │
│                    │ Follow-up Q      │ │
│                    └──────────────────┘ │
│                                         │
│  ✨ ⏳ Searching the web...              │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ Ask a follow-up...              │    │
│  │ [🔍] [🎓]          [⚡] [Send] │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables
```env
# Required
GROQ_API_KEY=gsk_xxxxx              # Groq API key
TAVILY_API_KEY=tvly-xxxxx           # Tavily API key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### Model Configuration
```typescript
// Query optimization
{
  model: 'llama-3.3-70b-versatile',
  temperature: 0.3,
  max_tokens: 100
}

// Answer synthesis
{
  model: 'llama-3.3-70b-versatile',
  temperature: 0.3,
  max_tokens: 1500
}

// Study set generation
{
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  max_tokens: 3000
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Tavily API fails | Retry with original query, return error message if both fail |
| No search results | Return message: "I couldn't find any relevant web results..." |
| Groq rate limit | Return error, suggest retry |
| Invalid project | Return 400 error |
| No auth | Redirect to signin |

---

## Future Enhancements (Atlas Intelligence)

1. **Query Pattern Analysis** - Learn common user queries per project type
2. **Source Quality Scoring** - Rate sources based on user feedback
3. **Personalized Results** - Weight answers based on user's study patterns
4. **Cross-Project Insights** - Connect related concepts across projects
5. **Proactive Suggestions** - Suggest related topics based on search history

---

## File Structure

```
web/
├── app/
│   ├── (pages)/
│   │   └── project/
│   │       └── [id]/
│   │           └── page.tsx          # Main search UI
│   └── api/
│       └── leafai/
│           └── search/
│               └── route.ts          # Search API endpoint
└── supabase/
    └── migrations/
        └── 20251229_ai_search_history.sql  # Database schema
```

---

## Dependencies

```json
{
  "groq-sdk": "^0.37.0",   // Groq API client
  "lucide-react": "^0.544.0" // Icons
}
```

---

## API Rate Limits

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Groq | ~6000 req/min | Very generous |
| Tavily | 1000 searches/month | Get production key for more |

---

*Last Updated: December 29, 2025*
