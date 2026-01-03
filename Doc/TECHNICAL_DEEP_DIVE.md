# UnforgeAPI Technical Deep Dive

**Version:** 2.0  
**Last Updated:** January 2, 2026  
**Product:** Hybrid RAG Engine for Business

---

## What Is UnforgeAPI?

**UnforgeAPI** is a **Hybrid RAG Engine** - a stateless API that lets businesses add intelligent search and research capabilities to their applications.

### The Problem We Solve
Most RAG systems either:
1. **Always search the web** → Expensive, slow, unnecessary for simple queries
2. **Only use local context** → Can't answer questions requiring external data

### Our Solution: Intelligent Routing
A **Router Brain** classifies every query and picks the cheapest path that still delivers quality answers:

| Intent | What Happens | Cost |
|--------|--------------|------|
| **CHAT** | Greetings, thanks → Direct LLM response | $0.00 |
| **CONTEXT** | Answer exists in provided context → Local RAG | $0.00 |
| **RESEARCH** | Needs external info → Web search + synthesis | ~$0.01 |

**Result:** 60-80% of queries skip expensive web search.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          UNFORGE PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DASHBOARD (Web UI)                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Overview │ │ API Keys │ │   Docs   │ │ Billing  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    UNFORGE API                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │              /api/v1/chat (STATELESS)                    │  │   │
│  │  │                                                          │  │   │
│  │  │   Authorization: Bearer uf_xxx...                        │  │   │
│  │  │   x-groq-key: gsk_xxx... (optional BYOK)                 │  │   │
│  │  │   x-tavily-key: tvly_xxx... (optional BYOK)              │  │   │
│  │  │                                                          │  │   │
│  │  │   { "query": "...", "context": "..." }                   │  │   │
│  │  │                      │                                   │  │   │
│  │  │                      ▼                                   │  │   │
│  │  │   ┌──────────────────────────────────────┐               │  │   │
│  │  │   │      🧠 ROUTER BRAIN                 │               │  │   │
│  │  │   │   (llama-3.1-8b-instant)             │               │  │   │
│  │  │   │                                      │               │  │   │
│  │  │   │   Classifies → CHAT | CONTEXT |      │               │  │   │
│  │  │   │                RESEARCH              │               │  │   │
│  │  │   └──────────────────────────────────────┘               │  │   │
│  │  │                      │                                   │  │   │
│  │  │      ┌───────────────┼───────────────┐                   │  │   │
│  │  │      ▼               ▼               ▼                   │  │   │
│  │  │   ┌──────┐      ┌─────────┐     ┌──────────┐            │  │   │
│  │  │   │ CHAT │      │ CONTEXT │     │ RESEARCH │            │  │   │
│  │  │   │ FREE │      │  FREE   │     │   $$$    │            │  │   │
│  │  │   │      │      │  (RAG)  │     │ (Search) │            │  │   │
│  │  │   └──────┘      └─────────┘     └──────────┘            │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                          EXTERNAL SERVICES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │   Supabase   │  │     Groq     │  │    Tavily    │  │   Unkey    │  │
│  │   Database   │  │   LLM API    │  │  Web Search  │  │  API Auth  │  │
│  │              │  │   (FREE!)    │  │   ($$$)      │  │  Rate Limit│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16.1 + React 19 | Dashboard UI |
| **Styling** | Tailwind v4 + Radix UI | Dark theme, accessible components |
| **Database** | Supabase (PostgreSQL) | Customer data, usage tracking |
| **LLM** | Groq (Llama-3.1/3.3) | FREE inference, <100ms latency |
| **Web Search** | Tavily API | Research path (costs money) |
| **API Auth** | Unkey | Key management, rate limiting |
| **Payments** | Stripe/Polar | Subscription billing |
| **Hosting** | Vercel | Edge deployment |

---

## The Router Brain (Core Innovation)

The **Router Brain** is what makes UnforgeAPI efficient. Instead of doing web search for every query (expensive), it classifies intent first:

### Intent Classification

```typescript
type Intent = 'CHAT' | 'CONTEXT' | 'RESEARCH'

// CHAT - Greetings, thanks, small talk
// → Uses cheap Llama-8b, no search, no database
// → Cost: $0.00

// CONTEXT - Answer from provided context
// → Local RAG, uses provided text only
// → Cost: $0.00

// RESEARCH - Needs external information  
// → Tavily search + Llama-70b synthesis
// → Cost: $0.01-0.05 per query
```

### Classification Logic

```
1. Fast Path (Regex)
   /^(hi|hey|hello|thanks).../  →  CHAT (skip LLM entirely)

2. LLM Classification
   Query + Context → Router Brain → { intent, confidence, reason }

3. Execution
   CHAT     → generateChat(query, groqKey)
   CONTEXT  → generateFromContext(query, context, groqKey)
   RESEARCH → tavilySearch() → synthesizeAnswer()
```

---

## API Reference

### Main Endpoint: `POST /api/v1/chat`

**Fully stateless** - No database connections, no session storage.

### Authentication

```bash
# API Key in Authorization header
Authorization: Bearer uf_xxxxxxxxxxxxxxxxxxxx
```

API keys are managed via Unkey:
- Created in dashboard or via `/api/keys` 
- Verified via Unkey's v2 API
- Metadata stores tier (sandbox, managed, byok)

### BYOK (Bring Your Own Key) Model

```bash
# Optional headers for BYOK tier
x-groq-key: gsk_xxxxxxxxxxxxxxxxxxxx
x-tavily-key: tvly_xxxxxxxxxxxxxxxxxxxx
```

**Why BYOK?**
- Protects our infrastructure costs - BYOK users use their own API credits
- Unlimited usage for enterprise customers
- Lower price point (they pay Groq/Tavily directly)

### Tier Enforcement

| Tier | Rate Limit | Groq Key | Tavily Key |
|------|------------|----------|------------|
| **sandbox** | 50/day | System | System (blocked for RESEARCH) |
| **managed** | 1000/month | System | System |
| **byok** | Unlimited | Required | Required for RESEARCH |

### Request Format

```typescript
POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer uf_xxxxxxxxxxxxxxxxxxxx

{
  "query": "What is quantum computing?",
  "context": "Optional RAG context - your documents, knowledge base, etc."
}
```

### Response Format

```typescript
{
  "answer": "Quantum computing is a type of computation that...",
  "meta": {
    "intent": "RESEARCH",
    "routed_to": "RESEARCH", 
    "cost_saving": false,
    "latency_ms": 1234,
    "sources": [
      { "title": "IBM Quantum", "url": "https://..." },
      { "title": "Nature Article", "url": "https://..." }
    ]
  }
}
```

### Error Responses

| Code | Error | Meaning |
|------|-------|---------|
| 401 | `MISSING_API_KEY` | No Authorization header |
| 401 | `INVALID_API_KEY` | Key not found or disabled |
| 402 | `BYOK_MISSING_KEY` | BYOK tier needs x-tavily-key for RESEARCH |
| 429 | `RATE_LIMITED` | Tier quota exceeded |
| 500 | `MISSING_LLM_KEY` | Server misconfiguration |
| 503 | `NO_SEARCH_API` | Tavily not configured |

---

## Use Cases

### 1. Customer Support Chatbot
```typescript
// Pass your knowledge base as context
const response = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer uf_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "How do I reset my password?",
    context: knowledgeBaseContent  // Your docs
  })
})
// Router classifies as CONTEXT → answers from your docs
// Cost: $0.00
```

### 2. Research Assistant
```typescript
// No context = needs web search
const response = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer uf_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "What are the latest developments in AI regulation?"
  })
})
// Router classifies as RESEARCH → Tavily search + synthesis
// Cost: ~$0.01
```

### 3. Conversational Interface
```typescript
// Simple greetings don't need anything expensive
const response = await fetch('/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer uf_xxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: "Hello! How are you?"
  })
})
// Router classifies as CHAT → instant LLM response
// Cost: $0.00
```

---

## Database Schema

### Core Tables

```sql
-- API keys (references Unkey externally)
api_keys (
  id TEXT PRIMARY KEY,      -- Unkey keyId
  workspace_id UUID,
  name TEXT,
  key_prefix TEXT,          -- First 10 chars for display
  tier TEXT,                -- 'sandbox', 'managed', 'byok'
  is_active BOOLEAN,
  created_at TIMESTAMP
)

-- Workspaces for customers
workspaces (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID,
  created_at TIMESTAMP
)

-- User profiles
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP
)
```

---

## LLM Models Used

| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| `llama-3.1-8b-instant` | Router classification, CHAT, CONTEXT | ~100ms | FREE |
| `llama-3.3-70b-versatile` | RESEARCH synthesis (quality matters) | ~2s | FREE |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Fallback model | ~500ms | FREE |

**Why Groq?**
- **FREE** tier with high rate limits (14,400 requests/day)
- Sub-100ms inference latency
- No token costs (unlike OpenAI/Anthropic)

---

## Cost Structure

### What Costs Money

1. **Tavily Web Search** - ~$0.01 per search
2. **Supabase** - Database hosting (minimal)
3. **Vercel** - Hosting (minimal with caching)

### What's Free

1. **Groq LLM** - All inference
2. **Unkey** - API key management

### Cost Optimization via Router Brain

```
Without Router Brain:
  Every query → Web Search → $0.01+

With Router Brain:
  "Hi there!" → CHAT → $0.00
  "What's in my docs?" → CONTEXT → $0.00  
  "What is photosynthesis?" → RESEARCH → $0.01

Result: 60-80% of queries avoid web search
```

---

## API Endpoints

### Public API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chat` | POST | Main RAG endpoint |
| `/api/v1/chat` | GET | Health check |

### Dashboard API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/keys` | POST | Create API key |
| `/api/keys` | GET | List API keys |
| `/api/keys` | DELETE | Revoke API key |

### Admin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/stats` | GET | Platform statistics |
| `/api/webhooks/*` | POST | Payment webhooks |

---

## Debug Logging

All API routes have structured debug logging (enabled in development):

```typescript
// Pattern: [Module:tag] { data }
[UnforgeAPI:POST:start] { requestId, timestamp }
[UnforgeAPI:auth:check] { hasAuth, tokenPrefix }
[UnforgeAPI:unkey:result] { valid, tier }
[UnforgeAPI:router:classified] { intent, confidence, reason }
[UnforgeAPI:path:research] { isByokTier, hasUserTavilyKey }
[UnforgeAPI:response:success] { intent, latencyMs, answerLength }

[Router:classifyIntent:start] { queryLength, hasContext }
[Router:classifyIntent:fastPath] { intent, pattern }
[Router:tavilySearch:complete] { resultCount }

[API/keys:POST:unkey:response] { ok, keyId }
```

---

## File Structure

```
web/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   └── chat/
│   │   │       └── route.ts        # Main API endpoint
│   │   ├── keys/
│   │   │   └── route.ts            # API key management
│   │   └── admin/
│   │       └── stats/route.ts      # Admin stats
│   ├── (pages)/
│   │   └── dashboard/              # Customer dashboard
│   │       ├── page.tsx            # Overview
│   │       ├── keys/page.tsx       # API key management
│   │       ├── docs/page.tsx       # Documentation
│   │       ├── billing/page.tsx    # Billing/pricing
│   │       └── settings/page.tsx   # Settings
│   └── layout.tsx
├── lib/
│   ├── router.ts                   # Router Brain logic
│   └── utils.ts
└── components/
```

---

## Pricing Tiers

| Tier | Price | Rate Limit | Features |
|------|-------|------------|----------|
| **Sandbox** | Free | 50 req/day | CHAT + CONTEXT only |
| **Managed** | $29/mo | 1,000 req/mo | Full access, we handle API keys |
| **BYOK** | $99/mo | Unlimited | Bring your own Groq/Tavily keys |
| **Enterprise** | Custom | Custom | SLA, dedicated support, SSO |

---

## Roadmap

### Short Term
- [ ] Complete dashboard (usage analytics, billing)
- [ ] Webhook for Unkey usage events
- [ ] Rate limit visualization

### Medium Term  
- [ ] SDK packages (npm, pip, go)
- [ ] Streaming support for /api/v1/chat
- [ ] Multi-region deployment

### Long Term
- [ ] Fine-tuned router model
- [ ] Custom knowledge base hosting
- [ ] Enterprise SSO (SAML, OIDC)
- [ ] On-premise deployment option

---

## Summary

**UnforgeAPI is a Hybrid RAG Engine for businesses.**

- **One endpoint** - `POST /api/v1/chat`
- **Stateless** - No sessions, no state to manage
- **Cost-optimized** - Router Brain skips expensive search when possible
- **BYOK-friendly** - Enterprise customers use their own API keys

**The magic is the Router Brain** - an LLM that classifies intent before expensive operations. This saves 60-80% on API costs while maintaining response quality.

**Tech stack is optimized for cost:**
- Groq = FREE LLM inference
- Unkey = FREE API management  
- Only Tavily costs money (and only on RESEARCH path)
