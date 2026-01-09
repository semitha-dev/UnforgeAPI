# UnforgeAPI - Product Overview Document

**Last Updated:** January 9, 2026  
**Purpose:** Internal clarity document for founder consultation

---

## 1. WHAT IS THIS PRODUCT?

### One-Line Description
UnforgeAPI is an **intelligent API router** that automatically decides how to answer user queries - routing them to simple chat, context-based answers, web search, or deep research based on what the question needs.

### Technical Category
- **Primary:** API Infrastructure / Developer Tools
- **Secondary:** AI Middleware / Intelligent Gateway
- **NOT:** An AI company (we don't build models, we route to them)

### The Core Idea
Instead of developers building logic to decide "does this need a web search or just a simple answer?", UnforgeAPI does it automatically:

```
User Question → [INTELLIGENT ROUTER] → Best Path → Answer
                      ↓
              "What does this need?"
                      ↓
         ┌───────────┼───────────┐
       CHAT      CONTEXT     RESEARCH
    (Simple)   (Has data)   (Needs web)
```

---

## 2. WHAT DOES IT ACTUALLY DO?

### API Endpoints

| Endpoint | Purpose | What It Does |
|----------|---------|--------------|
| `POST /api/v1/chat` | Intelligent Router | Classifies query → routes to correct path → returns answer |
| `POST /api/v1/deep-research` | Deep Research | Tavily search → Gemini compress → Groq write → structured report |

### The Chat Router Logic (from `router.ts`)

```
Step 1: SPEED GATE (Regex)
   ↓ Is it "hi", "hello", "thanks"?
   ↓ YES → CHAT (instant, no API call)
   ↓ NO → Continue to Step 2

Step 2: ROUTER BRAIN (Groq LLM)
   ↓ Send query + context to llama-3.1-8b-instant
   ↓ LLM decides: CHAT | CONTEXT | RESEARCH
   ↓
   └→ CHAT: Simple greeting, general knowledge
   └→ CONTEXT: User provided data, answer from that
   └→ RESEARCH: Needs fresh info, trigger Tavily search
```

### Deep Research Pipeline

```
Query → Tavily Search (5 sources with raw_content)
     → Gemini 2.5 Flash (compress to structured facts)
     → Groq llama-3.1-8b-instant (write English report)
     → Return JSON with report, facts, sources
```

**Measured Performance:** ~36 seconds average

---

## 3. PRICING & BUSINESS MODEL

### Current 4-Tier Structure

| Tier | Price | Who Pays for AI Keys? | Limits | Target User |
|------|-------|----------------------|--------|-------------|
| **Sandbox** | Free | UnforgeAPI | 50 req/day, No search | Testers |
| **Managed Pro** | $19.99/mo | UnforgeAPI | 50k req/mo, 1k search | Production apps |
| **BYOK Starter** | Free | User | 100 req/day | Hobbyists with keys |
| **BYOK Pro** | $4.99/mo | User | Unlimited (10 req/sec) | Cost-conscious devs |

### Revenue Model
1. **Subscription fees** ($4.99 - $19.99/mo)
2. **Deep Research usage** (built into tier limits)
3. **Future:** Token purchases for overages

### BYOK (Bring Your Own Keys) Explained
- User provides their own Groq, Tavily, Google API keys
- User pays those providers directly
- UnforgeAPI just routes + orchestrates
- Lower price point because we don't pay for inference

---

## 4. WHO IS THE CUSTOMER?

### Primary Target: Developers building AI features

| Customer Type | Why They'd Use UnforgeAPI | Alternative They'd Use Instead |
|--------------|---------------------------|-------------------------------|
| Solo developer | One API instead of managing Groq + Tavily + logic | Build it themselves |
| Small startup | Quick AI integration, don't want infra complexity | OpenRouter + custom code |
| AI agent builder | Need search + chat in one call | Tavily + Groq separately |
| Enterprise | BYOK for data control, audit trails | Custom internal solution |

### What Problem Do We Solve?

**Without UnforgeAPI:**
```python
# Developer has to build this themselves:
if needs_web_search(query):
    results = tavily.search(query)
    answer = groq.complete(query + results)
elif has_context:
    answer = groq.complete(query + context)
else:
    answer = groq.complete(query)
```

**With UnforgeAPI:**
```python
# One call, we figure it out:
answer = unforge.chat(query, context=optional_data)
```

---

## 5. COMPETITIVE LANDSCAPE

### Direct Competitors

| Competitor | What They Do | Difference from UnforgeAPI |
|------------|--------------|---------------------------|
| **OpenRouter** | Routes to cheapest LLM | No intent classification, no search |
| **Portkey** | LLM gateway + observability | Enterprise focus, no search integration |
| **Tavily** | Search API for AI | Search only, no routing logic |
| **Perplexity API** | Search + answer | No BYOK, no custom routing |
| **You.com API** | Search + answer | No intelligent routing |

### Where UnforgeAPI Fits

```
             ┌─────────────────────────────────────────┐
             │           LLM GATEWAYS                  │
             │    (OpenRouter, Portkey, LiteLLM)       │
             │    - Route to cheapest model            │
             │    - No search, no intelligence         │
             └───────────────────┬─────────────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
    ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐
    │  SEARCH APIs    │ │  UnforgeAPI    │ │ AI ASSISTANTS  │
    │  (Tavily, Exa)  │ │                │ │ (Perplexity)   │
    │  - Search only  │ │ - Routes       │ │ - Browser UI   │
    │  - No routing   │ │ - Searches     │ │ - No API focus │
    │  - No chat      │ │ - Answers      │ │ - No BYOK      │
    └─────────────────┘ │ - BYOK option  │ └────────────────┘
                        └────────────────┘
```

### Unique Value Proposition (Potential)

| Claim | True? | Competitors Who Match |
|-------|-------|----------------------|
| Intelligent intent routing | ✅ Yes | None do this well |
| Search + Chat unified | ✅ Yes | Perplexity, You.com |
| API-first | ✅ Yes | Tavily, Perplexity API |
| BYOK support | ✅ Yes | OpenRouter (partial) |
| Deep Research API | ✅ Yes | Perplexity (slower) |
| Structured JSON output | ✅ Yes | None do this well |

---

## 6. IDENTITY CRISIS - HONEST ASSESSMENT

### What The Website Currently Says
- "Intelligent AI Routing" 
- "Deep Research for Systems"
- "BYOK Support"

### The Confusion
We're trying to be:
1. An LLM router (like OpenRouter)
2. A search API (like Tavily)
3. A research tool (like Perplexity)
4. A developer platform (like Vercel AI)

**This is too many things.**

### Possible Focused Identities

#### Option A: "Intelligent AI Router"
> "One API that decides if your question needs chat, context, or search"

- **Pros:** Unique positioning, clear value
- **Cons:** Hard to explain, "routing" sounds boring

#### Option B: "Search-Augmented AI API"
> "AI answers with real-time web data when needed"

- **Pros:** Clear value, obvious use case
- **Cons:** Competes directly with Perplexity API, Tavily

#### Option C: "AI Middleware for Developers"
> "The plumbing between your app and AI providers"

- **Pros:** Developer-focused, infrastructure play
- **Cons:** Sounds commoditized, not exciting

#### Option D: "Research API for AI Agents"
> "Deep research in 36 seconds, structured for machines"

- **Pros:** Growing market (AI agents), unique angle
- **Cons:** Narrow niche, depends on agent ecosystem

---

## 7. WHAT COULD MAKE THIS BETTER?

### Features That Would Create Differentiation

| Feature | What It Does | Competitive Advantage |
|---------|--------------|----------------------|
| **Custom output schemas** | User defines JSON structure they want | No one does this |
| **Multi-query comparison** | One call, multiple searches, comparison table | Unique |
| **Webhook delivery** | Async research, notify when done | Enterprise feature |
| **Domain presets** | Optimized for crypto/stocks/tech/academic | Specialization |
| **Data extraction mode** | Return specific facts, not prose | Machine-friendly |
| **Streaming deep research** | Progressive results as it researches | Better UX |

### The Killer Feature Candidates

**#1: Custom Output Schemas**
```json
POST /api/v1/deep-research
{
  "query": "Compare Tesla vs Rivian",
  "schema": {
    "companies": [{ "name": "", "market_cap": "", "revenue": "" }],
    "recommendation": ""
  }
}
```
*No one else offers this. It's genuinely unique.*

**#2: Data Extraction Mode**
```json
POST /api/v1/extract
{
  "query": "iPhone 16 specs",
  "extract": ["price", "battery", "chip", "release_date"]
}
// Returns structured data, not a report
```

---

## 8. TECHNICAL ARCHITECTURE

### Current Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 16, React | Landing page, dashboard |
| Backend | Next.js API routes | Serverless functions |
| Database | Supabase (PostgreSQL) | Users, usage tracking |
| Auth | Supabase Auth | Authentication |
| API Key Management | Unkey | Rate limiting, key validation |
| Payments | Polar | Subscriptions |
| Cache | Upstash Redis | Response caching |
| LLM | Groq (Llama), Google (Gemini) | Text generation |
| Search | Tavily | Web search |
| Hosting | Vercel | Serverless deployment |

### API Flow

```
Request → Vercel Edge → Unkey (auth + rate limit)
       → Route Handler → Intent Classification (Groq)
       → Execute Path (Chat/Context/Research)
       → Response (JSON)
```

---

## 9. CURRENT METRICS (As of January 2026)

*Note: Fill in actual numbers*

| Metric | Value |
|--------|-------|
| Registered users | ? |
| Active API keys | ? |
| Daily API calls | ? |
| Paying customers | ? |
| MRR | ? |
| Deep Research avg time | ~36 seconds |
| Chat routing avg time | ~2-3 seconds |

---

## 10. QUESTIONS FOR CONSULTATION

### Strategic Questions
1. **Who is actually our customer?** Solo devs? Startups? Enterprises?
2. **What's the one thing we do better than anyone?** (Not "everything")
3. **Should we focus on routing or research?** Trying to do both dilutes both.
4. **Is BYOK a feature or a distraction?** It adds complexity.
5. **Do we need Deep Research?** It's slow and complex. Does anyone want it?

### Product Questions
1. Should we add custom schemas / data extraction?
2. Should we kill features to simplify?
3. What's the minimum viable product that's still valuable?

### Market Questions
1. Is "AI routing" a category anyone cares about?
2. Is the AI agent market big enough to target?
3. Can we compete with well-funded players (Perplexity, OpenRouter)?

---

## 11. SUMMARY

**What UnforgeAPI IS:**
- An API that routes AI queries to the right execution path
- A way to add search-augmented AI to apps
- A BYOK option for cost-conscious developers
- A deep research endpoint (36s, structured output)

**What UnforgeAPI IS NOT:**
- An AI company (we don't build models)
- A general-purpose AI assistant (Perplexity owns that)
- An enterprise platform (we're too small)

**The Core Question:**
> Is there a market for "intelligent AI routing" as a product category, or is this just a feature that bigger platforms will absorb?

---

*Document prepared for internal strategy consultation.*
