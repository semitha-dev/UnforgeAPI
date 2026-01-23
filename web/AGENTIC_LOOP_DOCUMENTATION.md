# Agentic Loop Feature - Deep Research API

## Overview

The Agentic Loop feature enhances the Deep Research API by implementing an iterative reasoning layer that eliminates outdated data and hallucinations. When `agentic_loop: true` is set, the system evaluates search results and refines queries when necessary, instead of performing a single-shot search.

## Problem Statement

The original Deep Research API performed a single keyword search and summarized the results. This approach had a critical flaw:

**Date-Mismatch Hallucinations**: A query about "2026 trends" might return 2021-2023 articles predicting 2026, which the AI then presents as current facts.

### Example Scenario
```
User Query: "What are the 2026 AI trends?"
Old Behavior:
1. Search: "2026 AI trends"
2. Results: 2021 articles predicting 2026 trends
3. Summary: "According to 2021 sources, 2026 will feature..." ❌ WRONG
```

## Solution: Agentic Loop

The Agentic Loop implements a reasoning layer that:

1. **Initial Search**: Execute the first web search using the user's query
2. **Evaluator Step**: Use an LLM to analyze metadata (titles, snippets, publication dates)
3. **Validation Checks**:
   - Does the information actually answer the user's query with current data?
   - Are the dates relevant to the intent?
4. **Reasoning Decision**:
   - **If Valid**: Proceed to final summary
   - **If Invalid/Outdated**: Generate a refined search query
5. **Re-Search (Max 3 iterations)**: Run the refined search and merge findings
6. **Final Synthesis**: Summarize multi-turn research into the final JSON response

## Technical Implementation

### New Parameter

```typescript
interface RequestBody {
  // ... existing parameters
  agentic_loop?: boolean  // Default: false
}
```

### Configuration

```typescript
const MAX_AGENTIC_ITERATIONS = 3
```

### Evaluator Prompt

The evaluator uses a specialized prompt that instructs the LLM to:

- Extract publication dates from titles, snippets, and content
- Identify if the query asks about CURRENT or FUTURE information
- Check if search results contain:
  - Actual current data (not predictions about the future)
  - Recent publications (within last 6-12 months for current topics)
  - Factual information that directly answers the query

### Date-Mismatch Detection Patterns

The evaluator is trained to detect:

- Query asks about "2026 trends" but results are from 2021-2023 making predictions
- Query asks for "current price" but results are from years ago
- Query asks about "latest version" but results discuss old versions
- Query asks for "recent news" but results are outdated
- Query asks for "actual data" but results contain only predictions/speculation

### Refined Query Generation

When results are invalid, the LLM generates refined queries with:

- Temporal filters: "after:2025", "2026 actual data", "current 2026"
- Distinguish actuals from forecasts: "vs predictions"
- Add temporal keywords: "latest", "recent", "updated"
- Specific timeframes: "January 2026", "Q1 2026"
- Focus on confirmed information: "official data", "actual results", "confirmed information"

## API Usage

### Basic Request (No Agentic Loop)

```bash
curl -X POST https://api.unforge.ai/api/v1/deep-research \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "2026 AI trends",
    "mode": "report",
    "preset": "tech"
  }'
```

### With Agentic Loop Enabled

```bash
curl -X POST https://api.unforge.ai/api/v1/deep-research \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "2026 AI trends",
    "mode": "report",
    "preset": "tech",
    "agentic_loop": true
  }'
```

## Timeout Management

Since the agentic loop can take 2-3 minutes, the implementation includes:

1. **Vercel Timeout**: `export const maxDuration = 300` (5 minutes)
2. **Auto-Cut Timer**: Stops processing at 4m10s to leave room for emergency finalization
3. **Emergency Finalization**: Generates a report from whatever data is collected before timeout
4. **Streaming Support**: When `stream: true` is enabled, users see real-time progress

### Streaming Status Updates

When `agentic_loop: true` and `stream: true`, the API provides status updates:

```
Iteration 1: "Searching for relevant sources..."
Iteration 1: "Evaluating source relevance and recency..."
Iteration 2: "Refining search (iteration 2/3)..."
Iteration 2: "Refining search query: '2026 AI trends after:2025 current actual data'..."
Iteration 2: "Evaluating source relevance and recency..."
```

## Credit System & Rate Limits

### Unified Credit Pool

Deep Research uses a **shared credit system** where both Standard and Agentic requests consume **1 credit** from the same `DEEP_RESEARCH` pool.

| Tier | Limit | Period | Notes |
|------|-------|--------|-------|
| Sandbox | 3 | daily | Standard + Agentic share pool |
| Managed Pro | 50 | monthly | Standard + Agentic share pool |
| Managed Expert | 200 | monthly | Standard + Agentic share pool |
| BYOK Starter | 10 | daily | Standard + Agentic share pool |
| BYOK Pro | ∞ standard | monthly | **100 agentic hard cap** |

### BYOK Pro Agentic Cap

**Important**: BYOK Pro users get **unlimited standard requests** but are limited to **100 agentic requests per month**. This hard cap protects Vercel execution time on the $5/month plan.

```json
// BYOK Pro limit exceeded response
{
  "error": "BYOK Pro agentic limit exceeded (100/month). Use agentic_loop: false for unlimited standard requests.",
  "code": "BYOK_PRO_AGENTIC_LIMIT_EXCEEDED",
  "limit": 100,
  "period": "monthly",
  "hint": "Set agentic_loop: false for unlimited standard deep research requests."
}
```

## Cost Control

- **Credit Consumption**: 1 credit per request (standard or agentic)
- **Maximum Iterations**: 3 search iterations for agentic
- **Timeout Protection**: 5-minute total limit with auto-cut at 4m10s
- **Fallback Behavior**: If agentic loop fails, falls back to regular single search
- **Emergency Mode**: Always available to return partial results if timeout occurs

## Reasoning Layer (Contradiction Detection)

The Cerebras extraction step includes a built-in reasoning layer that detects contradictions between sources and picks the most likely truth. This adds zero extra cost (same 1 Cerebras call) and minimal latency.

### What It Does

1. **Detects Contradictions**: When Source A says X but Source B says Y, logs both claims
2. **Resolves Conflicts**: Picks the most likely truth based on:
   - Recency (newer data > older data)
   - Source authority (official sources > blogs)
   - Specificity (concrete numbers > vague claims)
   - Corroboration (3 sources agree > 1 disagrees)
3. **Reports Confidence**: Returns a 0-1 score indicating reliability

### Response Metadata

```json
{
  "meta": {
    "reasoning": {
      "consensus": "medium",
      "confidence": 0.85,
      "conflicts_found": 2
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `consensus` | "high" (all agree), "medium" (minor conflicts), "low" (major contradictions) |
| `confidence` | 0.0-1.0 reliability score |
| `conflicts_found` | Number of contradictions detected between sources |

### Facts Schema

The `facts` object now includes `source_agreement`:

```json
{
  "source_agreement": {
    "consensus": "medium",
    "conflicting_claims": [
      {
        "claim_a": "Tesla market cap is $850B",
        "source_a": "Bloomberg",
        "claim_b": "Tesla market cap is $820B",
        "source_b": "Yahoo Finance",
        "resolution": "Bloomberg data is more recent (Jan 2026 vs Dec 2025)"
      }
    ],
    "confidence_score": 0.85
  }
}
```

## Provider Configuration

The agentic loop uses:

- **Search**: Tavily API
- **Reasoning**: Groq (llama-3.1-8b-instant) for evaluation
- **Extraction + Fact-Checking**: Cerebras (gpt-oss-120b) with reasoning layer
- **Writing**: Groq (llama-3.1-8b-instant) for final reports

## Response Format

### Standard Response (No Agentic Loop)

```json
{
  "mode": "report",
  "query": "2026 AI trends",
  "report": "# Research Report...",
  "meta": {
    "source": "generated",
    "latency_ms": 12345,
    "sources_count": 12,
    "request_id": "dr-12345",
    "preset": "tech"
  }
}
```

### With Agentic Loop

```json
{
  "mode": "report",
  "query": "2026 AI trends",
  "report": "# Research Report...",
  "meta": {
    "source": "generated",
    "latency_ms": 23456,
    "sources_count": 15,
    "request_id": "dr-12345",
    "preset": "tech",
    "agentic": true,
    "quota": {
      "limit": 50,
      "remaining": 45,
      "period": "monthly"
    }
  }
}
```

## Example Scenarios

### Scenario 1: Current Information Query

**Query**: "What is the current price of Bitcoin?"

**Without Agentic Loop**:
- Returns 2021 articles predicting Bitcoin prices
- Presents outdated information as current

**With Agentic Loop**:
1. Initial search returns 2021 predictions
2. Evaluator detects date mismatch
3. Refines query to "Bitcoin price December 2025 current actual"
4. Second search returns actual current prices
5. Evaluator validates results
6. Returns accurate current pricing

### Scenario 2: Future Trends Query

**Query**: "2026 technology trends"

**Without Agentic Loop**:
- Returns 2022-2023 articles predicting 2026
- Presents predictions as facts

**With Agentic Loop**:
1. Initial search returns 2022-2023 predictions
2. Evaluator detects temporal mismatch
3. Refines query to "2026 technology trends actual data vs predictions"
4. Second search returns 2024-2025 actual data
5. Evaluator validates temporal relevance
6. Returns distinction between predictions and actuals

### Scenario 3: Historical Query

**Query**: "What were the major events of 2020?"

**Without Agentic Loop**:
- Returns 2024-2025 articles mentioning 2020
- May mix retrospective with current events

**With Agentic Loop**:
1. Initial search returns 2024-2025 articles
2. Evaluator detects temporal intent is historical
3. Validates results contain historical information
4. Returns accurate historical summary

## Benefits

### 1. Eliminates Hallucinations
- Prevents AI from presenting predictions as facts
- Distinguishes between "predicted" and "actual" data
- Validates temporal relevance of sources

### 2. Improves Accuracy
- Iterative refinement improves query precision
- Multiple search rounds increase source diversity
- Evaluation layer filters outdated sources

### 3. Better User Experience
- Streaming status updates keep users informed
- Transparent iteration process
- Fallback ensures reliability

### 4. Cost-Effective
- Maximum 3 iterations limit costs
- Smart refinement reduces unnecessary searches
- Cache still works to avoid repeated processing

## Limitations

### Agentic Loop Not Available For:
- **Compare Mode**: Multiple queries are already compared
- **Extract Mode**: Specific field extraction doesn't need iterative refinement
- **Schema Mode**: Structured output doesn't require validation

### When Agentic Loop Fails:
- Falls back to regular single search
- Logs error for debugging
- Continues with available data

## Performance Considerations

### Latency Impact
- **Without Agentic Loop**: ~10-15 seconds (single search + extraction)
- **With Agentic Loop**: ~45-120 seconds (up to 3 iterations)
- **Streaming**: Reduces perceived latency with status updates

### API Credit Usage
- **Standard mode** (agentic_loop: false): 1 credit, 1 Tavily search
- **Agentic mode** (agentic_loop: true): 1 credit, up to 3 Tavily searches
- Evaluation uses Groq tokens (minimal cost)

## Debugging

### Debug Logs

The implementation includes comprehensive debug logging:

```typescript
debug('agentic:enabled', { query: query.substring(0, 50) }, ctx)
debug('agentic:status', { status, iteration }, ctx)
debug('agentic:complete', { iterations, finalStatus, totalResults }, ctx)
debug('agentic:error', error, ctx)
```

### Monitoring

Monitor these metrics:
- Agentic loop success rate
- Average iterations per request
- Timeout occurrences
- Fallback frequency

## Migration Guide

### For Existing Users

1. **No Changes Required**: Existing API calls continue to work
2. **Opt-In**: Add `"agentic_loop": true` to enable
3. **Test**: Try with queries about current/future information
4. **Monitor**: Check logs for agentic loop activity

### For New Users

1. **Default Behavior**: Use `agentic_loop: false` for faster results
2. **Enable When Needed**: Use `agentic_loop: true` for current/future queries
3. **Combine with Streaming**: Use both `agentic_loop: true` and `stream: true` for best UX

## Future Enhancements

### Potential Improvements
1. **Smart Detection**: Auto-detect temporal intent without manual flag
2. **Confidence Thresholds**: Allow users to adjust validation sensitivity
3. **Iteration Limits**: Make max iterations configurable
4. **Result Ranking**: Prioritize sources by recency score
5. **Parallel Searches**: Run multiple refined queries in parallel

### Integration Points
1. **Webhook Support**: Send agentic loop context to webhooks
2. **Caching**: Cache agentic loop results separately
3. **Analytics**: Track agentic loop usage patterns
4. **A/B Testing**: Compare agentic vs non-agentic results

## Conclusion

The Agentic Loop feature transforms Deep Research from a simple search-and-summarize tool into an intelligent research assistant that validates temporal relevance and eliminates hallucinations. By iteratively evaluating and refining search results, the system ensures users receive accurate, current information rather than outdated predictions.

**Key Features**:
- **Optional Parameter**: `agentic_loop: false` (default) for fast single-shot search, `true` for iterative reasoning
- **Shared Credit Pool**: Both modes consume 1 credit from the same pool
- **BYOK Pro Protection**: 100 agentic/month cap to protect Vercel execution time
- **Hallucination Prevention**: Eliminates date-mismatch errors through iterative validation
