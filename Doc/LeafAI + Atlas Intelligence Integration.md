# LeafAI + Atlas Intelligence

**Version:** 1.0  
**Last Updated:** December 30, 2025  
**Author:** LeafLearning Development Team

---

## Overview

LeafAI Search and Atlas Intelligence are complementary systems:
- **LeafAI Search** handles real-time routing, research, and study material generation.
- **Atlas Intelligence** analyzes usage, outcomes, and performance, turning raw events into insights that improve learning effectiveness and product decisions.

This document explains how they work together and provides individual overviews of each system.

---

## How They Work Together

### Joint Workflow (High-Level)

1. **User Request → Router Brain (LeafAI):**
   - Classifies every query into `CHAT`, `COMMAND`, or `RESEARCH`.
2. **Action Execution (LeafAI):**
   - `CHAT`: Direct LLM response, no web or DB calls.
   - `COMMAND`: Internal operations (notes, study sets).
   - `RESEARCH`: Tavily search + Groq synthesis; optional study set generation.
3. **Event Logging (LeafAI → Supabase):**
   - Writes to `ai_search_history` with query, rephrased search, citations, sources_count, and any `study_set_id`.
4. **Analytics + Insights (Atlas Intelligence):**
   - Processes `ai_search_history`, `study_sets`, `study_items`, usage data.
   - Produces cohort analytics, topic trends, conversion signals, and learning impact metrics.
5. **Feedback Loop:**
   - Insights inform product tuning (Router prompts, query rephrasing, study set templates).

### Key Integration Points

- **Search Logs:** `ai_search_history`
  - Fields include `query`, `search_query`, `answer`, `citations`, `sources_count`, `study_set_id`.
  - Primary source for Atlas Intelligence analyses.
- **Study Materials:** `study_sets` + `study_items`
  - Atlas tracks item counts, usage patterns, and effectiveness over time.
- **Endpoints:**
  - LeafAI Search: `/api/leafai/search`, `/api/leafai/search-stream`
  - Atlas/Insights: `/api/insights`, `/api/analytics` (aggregations, dashboards)
- **Scripts & SQL:**
  - `scripts/run-atlas-smoke-test.mjs` and `supabase/atlas_smoke_test.sql` for integration validation.

---

## LeafAI Search (Individual Report)

### Purpose
Real-time study assistant that classifies requests and performs the appropriate action with minimal latency and cost.

### Core Capabilities
- **Multi-Purpose Router:** `CHAT`, `COMMAND`, `RESEARCH` (llama-3.1-8b-instant)
- **Web Research:** Tavily search, gap analysis (Pro), LLM synthesis (llama-3.3-70b-versatile)
- **Study Set Generation:** Flashcards + quizzes from web results or notes
- **Context Awareness:** Fetches notes (space-level) and respects subscription tier
- **Streaming:** SSE for progressive updates in `/api/leafai/search-stream`

### Data Written
- **`ai_search_history`:** Every RESEARCH search and outcomes are logged
- **`study_sets` + `study_items`:** Materials generated via COMMAND/RESEARCH flows

### Reliability & Safety
- **Router Brain First:** Classifies intent before web search to save costs
- **CHAT Fast Path:** Regex + LLM response, avoids rate limits
- **COMMAND No-Notes Guard:** Friendly guidance when notes are absent
- **Stream Close Safety:** `closeStream()` prevents double-close errors

### Inputs/Outputs
- **Inputs:** Query, optional `projectId`, `projectName`, `notesContext`
- **Outputs:** Markdown answer, citations; optional `studySetCreated`

---

## Atlas Intelligence (Individual Report)

### Purpose
Analytics and intelligence layer that turns LeafAI events into actionable insights for learners and the product team.

### Core Capabilities
- **Search Analytics:** Volume, sources_count, topic breakdowns
- **Study Set Analytics:** Item counts, engagement proxies, creation funnels
- **Cohort & Subscription Analytics:** Free vs Pro usage distribution, conversion signals
- **Insights API:** `/api/insights`, `/api/analytics` expose aggregates to the UI
- **Smoke Tests:** `run-atlas-smoke-test.mjs` + `atlas_smoke_test.sql` validate pipeline health

### Data Read
- **`ai_search_history`:** Canonical event stream for LeafAI searches
- **`study_sets` + `study_items`:** Generated content and structure
- **Profiles/Projects (where relevant):** Cohort segmentation and space-level metrics

### Outputs
- **Aggregated Insights:** Topic trends, study material effectiveness, search confidence proxies
- **Dashboards/Reports:** UI surfaces for admins, product, and learning feedback loops

### Design Principles
- **Non-Intrusive:** Reads from existing tables; doesn’t block LeafAI operations
- **Composable:** SQL + API layers support incremental feature growth
- **Privacy-Respecting:** Works with minimal PII; focuses on aggregated behavior

---

## Shared Data Contracts

### `ai_search_history`
- `id`, `user_id`, `project_id`
- `query`, `search_query`
- `answer` (Markdown), `citations` (JSON)
- `sources_count` (int)
- `study_set_id` (optional)
- `created_at`

### `study_sets`
- `id`, `user_id`, `project_id`
- `title`, `description`, `source_type`
- `created_at`

### `study_items`
- `id`, `study_set_id`
- `item_type` (`flashcard` | `quiz`)
- `content` (JSON)
- `created_at`

---

## End-to-End Flow Examples

### A. RESEARCH → Study Set → Insights
1. User: "Create a study set about the French Revolution"
2. Router: `COMMAND` with topic → falls through to `RESEARCH`
3. LeafAI: Search + synthesis; generates study set; writes items
4. LeafAI: Logs to `ai_search_history` with `study_set_id`
5. Atlas: Aggregates usage, topic trends, and item counts

### B. COMMAND (Notes) → Study Set → Insights
1. User: "Create flashcards from my notes"
2. Router: `COMMAND` with `fromNotes: true`
3. LeafAI: Uses notes, generates materials (no web search)
4. LeafAI: Saves set/items; logs search history (optional)
5. Atlas: Tracks creation and engagement metrics

### C. CHAT → No Logging (Cost-Safe)
1. User: "Hey"
2. Router: `CHAT`
3. LeafAI: Friendly response; no search; no rate limit consumption
4. Atlas: No event; reduces noise in analytics

---

## Operational Considerations

- **Subscriptions:** Pro enables gap analysis + research mode depth
- **Rate Limits:** Free tier limits apply only to RESEARCH path
- **Observability:** Prefer centralized log sampling from `ai_search_history`
- **Backfills:** Use SQL scripts to recompute aggregates if schema evolves

---

## Future Enhancements

- **Confidence Scoring:** Store gap analysis scores for richer analytics
- **Outcome Tracking:** Link study set usage to retention/learning outcomes
- **Personalization:** Feed Atlas insights back into LeafAI Router prompts
- **Event Versioning:** Add `schema_version` to `ai_search_history` for durability

---

## Quick References

- LeafAI APIs: `/api/leafai/search`, `/api/leafai/search-stream`
- Atlas APIs: `/api/insights`, `/api/analytics`
- Validation Scripts: `scripts/run-atlas-smoke-test.mjs`, `supabase/atlas_smoke_test.sql`
