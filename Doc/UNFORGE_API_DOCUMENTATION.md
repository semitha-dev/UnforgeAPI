# UnforgeAPI Documentation

**Version:** 1.1  
**Last Updated:** January 3, 2026  
**Base URL:** `https://api.unforge.ai` (or your deployment URL)

---

## Overview

UnforgeAPI is a **Hybrid RAG Engine** that intelligently routes queries to minimize costs while maximizing quality. Instead of always hitting expensive web search APIs, our Router Brain classifies each query and picks the optimal execution path.

### The Three Paths

| Intent | Description | Cost | Latency |
|--------|-------------|------|---------|
| **CHAT** | Greetings, thanks, casual conversation | FREE | ~200ms |
| **CONTEXT** | Answer exists in your provided context | FREE | ~300ms |
| **RESEARCH** | Needs external web search | ~$0.01 | ~2-3s |

**Result:** 60-80% of queries skip expensive web search.

---

## Quick Start

### 1. Get Your API Key

Sign up at [your-dashboard-url] and create an API key.

### 2. Make Your First Request

```bash
curl -X POST https://api.unforge.ai/api/v1/chat \
  -H "Authorization: Bearer uf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the refund policy?",
    "context": "Our refund policy: Full refunds within 30 days of purchase. After 30 days, we offer store credit only. Contact support@example.com for refund requests."
  }'
```

### 3. Response

```json
{
  "answer": "Based on the provided information, the refund policy allows full refunds within 30 days of purchase. After 30 days, only store credit is available. You can contact support@example.com to request a refund.",
  "meta": {
    "intent": "CONTEXT",
    "routed_to": "CONTEXT",
    "cost_saving": true,
    "latency_ms": 287
  }
}
```

---

## API Reference

### POST /api/v1/chat

The main endpoint for all queries.

#### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | ✅ Yes | `Bearer uf_your_api_key` |
| `Content-Type` | ✅ Yes | `application/json` |
| `x-groq-key` | ❌ Optional | Your own Groq API key (BYOK) |
| `x-tavily-key` | ❌ Optional | Your own Tavily API key (BYOK) |

#### Request Body

```json
{
  "query": "string (required)",
  "context": "string (optional)",
  "history": "array (optional)",
  "system_prompt": "string (optional)",
  "force_intent": "string (optional)",
  "temperature": "number (optional)",
  "max_tokens": "number (optional)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ Yes | The user's question or message (max 10,000 chars) |
| `context` | string | ❌ No | Your business data/documents to search within |
| `history` | array | ❌ No | Conversation history for multi-turn chats |
| `system_prompt` | string | ❌ No | Custom system prompt to control AI persona/behavior |
| `force_intent` | string | ❌ No | Override intent classification: `"CHAT"`, `"CONTEXT"`, or `"RESEARCH"` |
| `temperature` | number | ❌ No | LLM creativity (0.0-1.0). Default: 0.3. Lower = more factual |
| `max_tokens` | number | ❌ No | Max response length (50-2000). Default: 600 |

#### History Format

```json
{
  "history": [
    { "role": "user", "content": "What's your return policy?" },
    { "role": "assistant", "content": "We offer 30-day returns..." },
    { "role": "user", "content": "What about international orders?" }
  ]
}
```

#### Response

```json
{
  "answer": "string",
  "meta": {
    "intent": "CHAT | CONTEXT | RESEARCH",
    "routed_to": "CHAT | CONTEXT | RESEARCH",
    "cost_saving": true,
    "latency_ms": 287,
    "intent_forced": false,
    "temperature_used": 0.3,
    "max_tokens_used": 600,
    "sources": [
      { "title": "string", "url": "string" }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `answer` | The AI-generated response |
| `meta.intent` | The original classified intent |
| `meta.routed_to` | The actual execution path used |
| `meta.cost_saving` | `true` if web search was skipped |
| `meta.latency_ms` | Response time in milliseconds |
| `meta.intent_forced` | `true` if `force_intent` was used |
| `meta.temperature_used` | Actual temperature value used |
| `meta.max_tokens_used` | Actual max_tokens value used |
| `meta.sources` | Array of sources (only for RESEARCH path) |

---

## Advanced Parameters

### system_prompt - Custom AI Persona

Control exactly how the AI behaves, its personality, and constraints.

**Use Case:** Customer support bot with specific identity

```json
{
  "query": "Who are you?",
  "context": "TechCorp sells enterprise software solutions.",
  "system_prompt": "You are Aria, a friendly customer support agent for TechCorp. Be helpful, concise, and professional. Never make up information that isn't in the context."
}
```

**Response:**
```json
{
  "answer": "Hi! I'm Aria, TechCorp's customer support assistant. I'm here to help you with any questions about our enterprise software solutions. How can I assist you today?",
  "meta": { "intent": "CONTEXT", "routed_to": "CONTEXT" }
}
```

### force_intent - Override Router Classification

Bypass the automatic intent classifier when you know exactly which path to use.

**Valid Values:** `"CHAT"`, `"CONTEXT"`, `"RESEARCH"`

**Use Case:** Always use your context, even for conversational queries

```json
{
  "query": "Tell me about yourself",
  "context": "Company: TechCorp. Founded: 2020. Mission: Making enterprise software simple.",
  "force_intent": "CONTEXT"
}
```

**Without force_intent:** Might classify as `CHAT` and ignore context  
**With force_intent:** Guaranteed to use `CONTEXT` path and your data

### temperature - Control Creativity

Lower values = more factual and consistent  
Higher values = more creative and varied

| Value | Use Case |
|-------|----------|
| 0.1 - 0.3 | Customer support, FAQ bots (factual, consistent) |
| 0.4 - 0.6 | General assistants (balanced) |
| 0.7 - 1.0 | Creative writing, brainstorming |

```json
{
  "query": "Explain our pricing",
  "context": "Plans: Starter $10/mo, Pro $50/mo, Enterprise custom.",
  "temperature": 0.2
}
```

### max_tokens - Control Response Length

Limit how long responses can be (50-2000 tokens).

| Value | ~Words | Use Case |
|-------|--------|----------|
| 100 | ~75 | Quick answers, chatbots |
| 300 | ~225 | Standard responses |
| 600 | ~450 | Detailed explanations (default) |
| 1000+ | ~750+ | Long-form content |

```json
{
  "query": "Write a product description",
  "context": "Product: CloudSync - Real-time file synchronization.",
  "max_tokens": 150
}
```

### Full Example with All Parameters

```bash
curl -X POST https://api.unforge.ai/api/v1/chat \
  -H "Authorization: Bearer uf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What can you help me with?",
    "context": "TechCorp offers: Cloud hosting, API services, and 24/7 support. Contact: support@techcorp.com",
    "history": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! Welcome to TechCorp support."}
    ],
    "system_prompt": "You are Alex, TechCorp helpful assistant. Be friendly and concise.",
    "force_intent": "CONTEXT",
    "temperature": 0.3,
    "max_tokens": 200
  }'
```

---

## Intent Classification (Router Brain)

### How It Works

```
User Query → Speed Gate (Regex) → Router Brain (LLM) → Execution Path
```

**Step 1: Speed Gate (Regex)**
- Catches obvious greetings instantly: `hi`, `hey`, `hello`, `thanks`, `thank you`
- No API call needed → Returns `CHAT` immediately

**Step 2: Router Brain (LLM)**
- If not a greeting, sends query + context to Groq's `llama-3.1-8b-instant`
- LLM decides: Is the answer in the context? → `CONTEXT` or `RESEARCH`

### Classification Examples

| Query | Context | Intent | Reason |
|-------|---------|--------|--------|
| `"Hi there!"` | - | CHAT | Greeting detected |
| `"Thanks!"` | - | CHAT | Gratitude detected |
| `"What's your refund policy?"` | Contains refund info | CONTEXT | Answer in context |
| `"What's the weather in NYC?"` | No weather data | RESEARCH | External data needed |
| `"Compare React vs Vue"` | - | RESEARCH | Factual comparison needed |

---

## Execution Paths

### 1. CHAT Path (FREE)

For greetings and casual conversation.

**Example:**
```json
// Request
{ "query": "Hello!" }

// Response
{
  "answer": "Hello! How can I help you today?",
  "meta": { "intent": "CHAT", "cost_saving": true, "latency_ms": 156 }
}
```

### 2. CONTEXT Path (FREE)

Answer is synthesized from your provided context. **No web search.**

**Example:**
```json
// Request
{
  "query": "What are the business hours?",
  "context": "Store Information:\n- Hours: Mon-Fri 9am-6pm, Sat 10am-4pm\n- Location: 123 Main St\n- Phone: 555-1234"
}

// Response
{
  "answer": "The business hours are Monday through Friday from 9am to 6pm, and Saturday from 10am to 4pm.",
  "meta": { "intent": "CONTEXT", "cost_saving": true, "latency_ms": 312 }
}
```

### 3. RESEARCH Path ($$)

Query requires external web search via Tavily API.

**Example:**
```json
// Request
{ "query": "What is the current stock price of Apple?" }

// Response
{
  "answer": "As of January 3, 2026, Apple (AAPL) is trading at $198.45...",
  "meta": {
    "intent": "RESEARCH",
    "cost_saving": false,
    "latency_ms": 2847,
    "sources": [
      { "title": "Yahoo Finance - AAPL", "url": "https://finance.yahoo.com/quote/AAPL" }
    ]
  }
}
```

---

## BYOK (Bring Your Own Keys)

You can provide your own API keys to:
- Use your own Groq/Tavily credits
- Required for BYOK tier plans

### Headers

```bash
curl -X POST https://api.unforge.ai/api/v1/chat \
  -H "Authorization: Bearer uf_your_api_key" \
  -H "x-groq-key: gsk_your_groq_key" \
  -H "x-tavily-key: tvly-your_tavily_key" \
  -H "Content-Type: application/json" \
  -d '{"query": "..."}'
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing required field (query) |
| 401 | `MISSING_API_KEY` | No Authorization header |
| 401 | `INVALID_API_KEY` | API key not valid |
| 402 | `BYOK_MISSING_KEY` | BYOK tier requires x-tavily-key for RESEARCH |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `NO_SEARCH_API` | Research unavailable |

### Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

---

## Rate Limits

Rate limits are managed by Unkey and vary by plan:

| Plan | Requests/min | RESEARCH/day |
|------|--------------|--------------|
| Free | 10 | 50 |
| Pro | 100 | 500 |
| Enterprise | Custom | Custom |

---

## Best Practices

### 1. Always Provide Context

The more context you provide, the more queries route to the FREE `CONTEXT` path.

```json
// ❌ Bad - Will likely trigger RESEARCH
{ "query": "What's our return policy?" }

// ✅ Good - Routes to CONTEXT (FREE)
{
  "query": "What's our return policy?",
  "context": "Return Policy: 30-day returns for unused items. Refunds processed within 5-7 business days."
}
```

### 2. Pre-process Your Context

- Include relevant documents, FAQs, knowledge base articles
- Keep context under 2000 characters for optimal performance
- Structure context with clear sections

### 3. Handle Different Intents in Your UI

```javascript
const response = await fetch('/api/v1/chat', { ... })
const data = await response.json()

if (data.meta.intent === 'RESEARCH') {
  // Show sources
  displaySources(data.meta.sources)
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const response = await fetch('https://api.unforge.ai/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: userMessage,
    context: businessContext
  })
})

const { answer, meta } = await response.json()
console.log(`Intent: ${meta.intent}, Answer: ${answer}`)
```

### Python

```python
import requests

response = requests.post(
    'https://api.unforge.ai/api/v1/chat',
    headers={
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    },
    json={
        'query': user_message,
        'context': business_context
    }
)

data = response.json()
print(f"Intent: {data['meta']['intent']}")
print(f"Answer: {data['answer']}")
```

### cURL

```bash
curl -X POST https://api.unforge.ai/api/v1/chat \
  -H "Authorization: Bearer uf_xxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello!", "context": ""}'
```

---

## Health Check

### GET /api/v1/chat

Returns API status.

```bash
curl https://api.unforge.ai/api/v1/chat
```

```json
{
  "status": "ok",
  "service": "UnforgeAPI",
  "version": "1.0.0",
  "endpoints": {
    "chat": "POST /api/v1/chat"
  }
}
```

---

## Support

- **Documentation:** [your-docs-url]
- **Dashboard:** [your-dashboard-url]
- **Email:** support@unforge.ai
- **Discord:** [your-discord-invite]

---

## Changelog

### v1.1.0 (January 3, 2026)
- **NEW:** `system_prompt` parameter for custom AI persona control
- **NEW:** `force_intent` parameter to override intent classification
- **NEW:** `temperature` parameter (0.0-1.0) for creativity control
- **NEW:** `max_tokens` parameter (50-2000) for response length control
- **NEW:** `history` parameter for multi-turn conversation support
- **NEW:** Response meta now includes `intent_forced`, `temperature_used`, `max_tokens_used`
- **IMPROVED:** Anti-hallucination measures in context generation
- **IMPROVED:** Smart routing - context provided now always uses CONTEXT path

### v1.0.0 (January 3, 2026)
- Initial release
- Hybrid Brain routing (CHAT | CONTEXT | RESEARCH)
- BYOK support for Groq and Tavily
- Unkey authentication
