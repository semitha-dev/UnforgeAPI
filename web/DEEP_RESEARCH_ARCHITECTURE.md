# Deep Research System Architecture

## Overview

**Version**: v4.2 "Cerebras-Groq Relay"  
**Endpoint**: `POST /api/v1/deep-research`  
**Max Duration**: 300 seconds (5 minutes)

The Deep Research API is a multi-stage pipeline that searches the web, extracts facts with contradiction detection, and generates professional reports—all optimized for machine consumption.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT REQUEST                                     │
│  { query, mode, preset, agentic_loop, stream, extract, schema, webhook }    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. AUTHENTICATION                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  Extract API    │───▶│  Unkey Verify   │───▶│  Get Plan &     │         │
│  │  Key from Auth  │    │  (with retry)   │    │  Metadata       │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         2. RATE LIMITING                                     │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Managed Users: checkFeatureRateLimit('deep_research')         │        │
│  │  BYOK Pro + Agentic: checkByokProRateLimit (100/month cap)     │        │
│  │  BYOK Starter: checkFeatureRateLimit('deep_research')          │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3. CACHE CHECK                                       │
│  ┌─────────────────┐    ┌─────────────────┐                                 │
│  │  Hash Query     │───▶│  Upstash Redis  │──▶ HIT? Return cached report   │
│  │  (SHA-256)      │    │  (24h TTL)      │                                 │
│  └─────────────────┘    └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ MISS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         4. AGENTIC SEARCH LOOP                               │
│                         (if agentic_loop: true)                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │  ITERATION 1-3:                                                   │       │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐             │       │
│  │  │   Tavily   │───▶│   Groq     │───▶│  Refine    │──┐          │       │
│  │  │   Search   │    │  Evaluator │    │  Query?    │  │          │       │
│  │  └────────────┘    └────────────┘    └────────────┘  │          │       │
│  │       ▲                                    │          │          │       │
│  │       └────────────────────────────────────┘          │          │       │
│  │                                                       │          │       │
│  │  Valid results OR max iterations ─────────────────────┘          │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         5. STANDARD SEARCH                                   │
│                         (if agentic_loop: false)                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Tavily Search API                                              │        │
│  │  - include_raw_content: true (100KB per source)                 │        │
│  │  - max_results: 12                                              │        │
│  │  - Domain presets: crypto, stocks, tech, academic, news         │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         6. EXTRACTION + REASONING LAYER                      │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  PRIMARY: Cerebras GPT-OSS-120B                                 │        │
│  │  - Handles ~100KB raw content                                   │        │
│  │  - Extracts: key_stats, dates, entities, summary_points         │        │
│  │  - REASONING: source_agreement (contradiction detection)        │        │
│  │    - consensus: high/medium/low                                 │        │
│  │    - conflicting_claims: [{claim_a, source_a, claim_b, ...}]   │        │
│  │    - confidence_score: 0.0-1.0                                  │        │
│  │                                                                 │        │
│  │  FALLBACK: Gemini 2.5 Flash (if Cerebras fails)                │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         7. REPORT GENERATION                                 │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  Groq llama-3.1-8b-instant                                      │        │
│  │  - Input: Small facts JSON (~2-5KB)                            │        │
│  │  - Output: Professional Markdown report                         │        │
│  │  - Streaming supported (stream: true)                          │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         8. CACHE & RETURN                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  Cache Report   │    │  Send Webhook   │    │  Return JSON    │         │
│  │  (Redis 24h)    │    │  (if configured)│    │  Response       │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Authentication Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Key Verification | Unkey | Validates `Bearer` token, returns plan metadata |
| Retry Logic | Custom | 2 retries with 150ms exponential backoff |
| Plan Detection | Metadata | Determines managed vs BYOK path |

### 2. Rate Limiting

| User Type | Limit | Period | Enforcement |
|-----------|-------|--------|-------------|
| Sandbox | 3 | daily | Unkey namespace |
| Managed Pro | 50 | monthly | Unkey namespace |
| Managed Expert | 200 | monthly | Unkey namespace |
| BYOK Starter | 10 | daily | Unkey namespace |
| BYOK Pro | ∞ standard | monthly | No limit |
| BYOK Pro (agentic) | 100 | monthly | Custom tracker |

### 3. Cache Layer

| Component | Technology | Configuration |
|-----------|------------|---------------|
| Cache Store | Upstash Redis | Global, serverless |
| Cache Key | SHA-256 hash | Query normalized to lowercase |
| TTL | 24 hours | 86400 seconds |

### 4. Search Layer

| Component | Technology | Configuration |
|-----------|------------|---------------|
| Search API | Tavily | Advanced depth, raw_content enabled |
| Max Results | 12 | Per search |
| Domain Presets | 6 | general, crypto, stocks, tech, academic, news |

### 5. Extraction Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Primary Model | Cerebras GPT-OSS-120B | Handles 100KB+ context |
| Fallback Model | Gemini 2.5 Flash | If Cerebras fails |
| Schema | Zod | Structured output validation |
| Reasoning Layer | Built-in prompt | Contradiction detection |

### 6. Report Generation Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| Writer Model | Groq llama-3.1-8b-instant | Ultra-fast text generation |
| Streaming | AI SDK streamText | Real-time output |
| Formatting | Markdown | Professional reports |

---

## Output Modes

| Mode | Input | Output | Use Case |
|------|-------|--------|----------|
| `report` | query | Markdown report + facts JSON | Human-readable research |
| `extract` | query + fields[] | Structured JSON | Machine data extraction |
| `schema` | query + JSON schema | Custom JSON | API integration |
| `compare` | queries[] | Comparison table | Side-by-side analysis |

---

## Timeout Management

```
0s ──────────────────────────────────────────────────── 300s (Vercel limit)
│                                                        │
│  TIME_LIMIT_MS = 250s                                 │
│  ├── Normal processing                                │
│  └── At 250s: Abort all operations                    │
│                                                        │
│                     EMERGENCY_BUFFER_MS = 50s         │
│                     ├── emergencyFinalize()           │
│                     └── Return partial report         │
```

---

## Potential Bugs & Edge Cases

### 🔴 Critical Issues

| Bug | Description | Impact | Mitigation |
|-----|-------------|--------|------------|
| **Cerebras API Timeout** | GPT-OSS-120B can take 30-60s on complex queries | Request timeout, no report | Fallback to Gemini Flash implemented |
| **Agentic Loop Infinite Retry** | Evaluator keeps saying "invalid" for all searches | Stuck for 3 iterations, wasted resources | Max 3 iterations hard limit |
| **Redis Connection Failure** | Upstash occasionally has cold start latency | Cache miss on first request per region | Fire-and-forget caching (non-blocking) |
| **Unkey Verification Race** | Network issues during API key verification | Auth fails on transient error | 2 retries with backoff implemented |

### 🟡 Medium Issues

| Bug | Description | Impact | Mitigation |
|-----|-------------|--------|------------|
| **Reasoning Layer JSON Parse** | GPT-OSS returns malformed JSON | facts.source_agreement undefined | Try-catch with fallback defaults |
| **Domain Preset Override** | Custom include_domains ignored when preset set | Wrong search results | Explicit override logic |
| **Streaming Abort** | User disconnects mid-stream | Orphaned Groq connection | AbortController signal propagated |
| **Compare Mode Limit** | >3 queries in compare mode | Slow response, high token usage | Validation: max 3 queries |
| **Empty Search Results** | Tavily returns 0 results for niche query | "Not found" in all fields | Graceful handling, explain failure |

### 🟢 Minor Issues

| Bug | Description | Impact | Mitigation |
|-----|-------------|--------|------------|
| **Cache Key Collision** | Two different queries hash to same key | Wrong cached response | SHA-256 collision probability ~0% |
| **Preset Typo** | Invalid preset string passed | Uses 'general' default | Validation error returned |
| **Webhook Timeout** | User's webhook endpoint slow | Our request hangs | Fire-and-forget, no await |
| **Extract Mode Empty Fields** | Requested field not in content | Returns "Not found" | Documented behavior |

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `MISSING_API_KEY` | 401 | No Authorization header |
| `INVALID_API_KEY` | 401 | Unkey verification failed |
| `DEEP_RESEARCH_LIMIT_EXCEEDED` | 429 | Rate limit hit |
| `BYOK_MISSING_TAVILY_KEY` | 400 | BYOK user missing x-tavily-key |
| `BYOK_PRO_AGENTIC_LIMIT_EXCEEDED` | 429 | 100/month agentic cap hit |
| `INVALID_REQUEST` | 400 | Missing required fields |
| `INVALID_PRESET` | 400 | Unknown preset value |
| `INVALID_WEBHOOK` | 400 | Malformed webhook URL |
| `QUERY_TOO_LONG` | 400 | Query >2000 characters |
| `TOO_MANY_COMPARE_QUERIES` | 400 | Compare mode >3 queries |
| `SEARCH_FAILED` | 500 | Tavily API error |
| `EXTRACTION_FAILED` | 500 | Cerebras + Gemini both failed |
| `WRITE_ERROR` | 500 | Groq report generation failed |

---

## API Response Structure

```json
{
  "mode": "report",
  "query": "What is Tesla's market cap?",
  "report": "# Research Report...",
  "facts": {
    "key_stats": ["Market cap: $850B [1]", "P/E ratio: 65 [2]"],
    "dates": ["January 2026"],
    "entities": ["Tesla", "Elon Musk"],
    "summary_points": ["Tesla remains largest EV maker..."],
    "sources": [{"title": "Bloomberg", "url": "..."}],
    "source_agreement": {
      "consensus": "medium",
      "conflicting_claims": [
        {
          "claim_a": "Market cap is $850B",
          "source_a": "Bloomberg",
          "claim_b": "Market cap is $820B",
          "source_b": "Yahoo Finance",
          "resolution": "Bloomberg data is more recent"
        }
      ],
      "confidence_score": 0.85
    }
  },
  "meta": {
    "source": "generated",
    "latency_ms": 12345,
    "sources_count": 12,
    "request_id": "dr-abc123",
    "preset": "stocks",
    "agentic": true,
    "reasoning": {
      "consensus": "medium",
      "confidence": 0.85,
      "conflicts_found": 1
    },
    "quota": {
      "limit": 50,
      "remaining": 45,
      "period": "monthly"
    }
  }
}
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@ai-sdk/google` | latest | Gemini Flash integration |
| `@ai-sdk/groq` | latest | Groq LLM integration |
| `ai` | latest | Vercel AI SDK (streamText, generateText, generateObject) |
| `zod` | ^3.x | Schema validation |
| `@upstash/redis` | latest | Serverless Redis |
| `crypto` | Node built-in | SHA-256 hashing |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UNKEY_ROOT_KEY` | Yes | Unkey API verification |
| `UPSTASH_REDIS_REST_URL` | Yes | Redis connection |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis auth |
| `TAVILY_API_KEY` | Managed only | System Tavily key |
| `CEREBRAS_API_KEY` | Managed only | System Cerebras key |
| `GROQ_API_KEY` | Managed only | System Groq key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Managed only | Gemini fallback |

---

## Performance Benchmarks

| Metric | Standard Mode | Agentic Mode |
|--------|---------------|--------------|
| **Latency (P50)** | 10-15s | 45-90s |
| **Latency (P99)** | 25s | 120s |
| **Tavily Calls** | 1 | 1-3 |
| **LLM Calls** | 2 (extract + write) | 4-8 (eval + extract + write) |
| **Cost per Request** | ~$0.002 | ~$0.005 |

---

## Monitoring Recommendations

1. **Latency Tracking**: Monitor P50/P99 latency by mode
2. **Error Rate**: Track error codes by type
3. **Cache Hit Rate**: Should be >30% for common queries
4. **Agentic Loop Iterations**: Average should be <2
5. **Fallback Rate**: Track Cerebras→Gemini fallback frequency
6. **Timeout Rate**: Track emergency finalization triggers
