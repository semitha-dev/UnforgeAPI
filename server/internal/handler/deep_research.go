package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/model"
	"github.com/unforgeapi/server/internal/service"
)

// DeepResearchHandler handles POST /api/v1/deep-research.
type DeepResearchHandler struct {
	cfg    *config.Config
	unkey  *client.UnkeyClient
	groq   *client.GroqClient
	tavily *client.TavilyClient
	db     *client.SupabaseClient
	logger *service.ActivityLogger
}

func NewDeepResearchHandler(cfg *config.Config, unkey *client.UnkeyClient, groq *client.GroqClient, tavily *client.TavilyClient, db *client.SupabaseClient, logger *service.ActivityLogger) *DeepResearchHandler {
	return &DeepResearchHandler{cfg: cfg, unkey: unkey, groq: groq, tavily: tavily, db: db, logger: logger}
}

func (h *DeepResearchHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	start := time.Now()

	// 1. Auth via API key
	token := ""
	if auth := r.Header.Get("Authorization"); auth != "" && len(auth) > 7 {
		token = auth[7:]
	}
	if token == "" {
		JSONError(w, http.StatusUnauthorized, "Missing API Key", "MISSING_API_KEY")
		return
	}

	verifyResult, err := h.unkey.VerifyKey(r.Context(), token)
	if err != nil || !verifyResult.Valid {
		code := "INVALID_API_KEY"
		if verifyResult != nil && verifyResult.Code != "" {
			code = verifyResult.Code
		}
		JSONError(w, http.StatusUnauthorized, "Invalid API Key", code)
		return
	}

	// 2. Parse request
	var body model.DeepResearchRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	if body.Query == "" {
		JSONError(w, http.StatusBadRequest, "Missing required field: query", "INVALID_REQUEST")
		return
	}

	// 3. Get plan and check rate limits
	plan := model.ApiPlan("sandbox")
	workspaceID := ""
	if verifyResult.Meta != nil {
		if p, ok := verifyResult.Meta["plan"].(string); ok && p != "" {
			plan = model.ApiPlan(p)
		}
		if wid, ok := verifyResult.Meta["workspaceId"].(string); ok {
			workspaceID = wid
		}
	}

	if !model.IsByokExempt(string(plan)) && workspaceID != "" {
		rlResult, _ := h.unkey.CheckFeatureRateLimit(r.Context(), workspaceID, "deep_research", plan)
		if rlResult != nil && !rlResult.Success {
			JSON(w, http.StatusTooManyRequests, map[string]interface{}{
				"error":        fmt.Sprintf("Monthly deep research limit reached (%d). Resets at %d.", rlResult.Limit, rlResult.Reset),
				"code":         "DEEP_RESEARCH_LIMIT_EXCEEDED",
				"limit":        rlResult.Limit,
				"remaining":    0,
				"reset_at":     rlResult.Reset,
				"upgrade_hint": "Upgrade to Pro ($29/mo) for 100 deep research/month.",
			})
			return
		}
	}

	// 4. Execute 3-iteration agentic research loop
	groqKey := h.cfg.GroqAPIKey
	tavilyKey := h.cfg.TavilyAPIKey

	if groqKey == "" || tavilyKey == "" {
		JSONError(w, http.StatusServiceUnavailable, "Deep research unavailable - missing API keys", "MISSING_KEYS")
		return
	}

	log.Printf("[DeepResearch] Starting for query: %s (plan=%s)", body.Query[:min(100, len(body.Query))], plan)

	// Agentic loop: 3 iterations of search → analyze → refine
	maxIterations := 3
	var allSources []model.Source
	var allContent []string
	var refinedQuery string = body.Query

	for i := 0; i < maxIterations; i++ {
		log.Printf("[DeepResearch] Iteration %d/%d: searching for: %s", i+1, maxIterations, refinedQuery[:min(80, len(refinedQuery))])

		// Search
		searchResp, err := h.tavily.Search(r.Context(), client.SearchRequest{
			Query:             refinedQuery,
			SearchDepth:       "advanced",
			MaxResults:        12,
			IncludeRawContent: true,
		})
		if err != nil {
			log.Printf("[DeepResearch] Search error on iteration %d: %v", i+1, err)
			continue
		}

		for _, result := range searchResp.Results {
			allSources = append(allSources, model.Source{Title: result.Title, URL: result.URL})
			content := result.Content
			if result.RawContent != "" {
				content = result.RawContent
			}
			allContent = append(allContent, content)
		}

		// For iterations 1 and 2, refine the query using LLM
		if i < maxIterations-1 {
			refinedQuery = h.refineQuery(r.Context(), body.Query, refinedQuery, allContent, groqKey)
		}
	}

	// 5. Synthesize final report
	report, err := h.synthesizeReport(r.Context(), body.Query, allSources, allContent, groqKey)
	if err != nil {
		log.Printf("[DeepResearch] Synthesis error: %v", err)
		report = "Failed to synthesize research report."
	}

	// Extract facts
	facts := h.extractFacts(r.Context(), report, groqKey)

	latencyMs := time.Since(start).Milliseconds()
	log.Printf("[DeepResearch] Completed in %dms with %d sources", latencyMs, len(allSources))

	// Deduplicate sources
	seenURLs := map[string]bool{}
	var uniqueSources []model.Source
	for _, src := range allSources {
		if !seenURLs[src.URL] {
			seenURLs[src.URL] = true
			uniqueSources = append(uniqueSources, src)
		}
	}

	// Log usage
	if workspaceID != "" && verifyResult.KeyID != "" {
		go func() {
			ctx := context.Background()
			h.db.Insert(ctx, "api_usage", map[string]interface{}{
				"workspace_id":  workspaceID,
				"key_id":        verifyResult.KeyID,
				"intent":        "DEEP_RESEARCH",
				"latency_ms":    latencyMs,
				"query_preview": body.Query[:min(100, len(body.Query))],
			})
		}()
	}

	JSON(w, http.StatusOK, model.DeepResearchResponse{
		Report:  report,
		Facts:   facts,
		Sources: uniqueSources,
		Meta: map[string]interface{}{
			"latency_ms":  latencyMs,
			"iterations":  maxIterations,
			"source_count": len(uniqueSources),
			"plan":        string(plan),
		},
	})
}

func (h *DeepResearchHandler) refineQuery(ctx context.Context, originalQuery, currentQuery string, contents []string, groqKey string) string {
	// Build context summary
	contentSummary := ""
	for i, c := range contents {
		if i >= 5 {
			break
		}
		if len(c) > 500 {
			c = c[:500]
		}
		contentSummary += fmt.Sprintf("Source %d: %s\n", i+1, c)
	}

	prompt := fmt.Sprintf(`Given the original research query and what we've found so far, generate a refined search query to find additional information we're missing.

Original query: %s
Current search query: %s

What we've found so far:
%s

Generate a single refined search query that will help fill gaps in our research. Output ONLY the query, nothing else.`, originalQuery, currentQuery, contentSummary)

	resp, err := h.groq.ChatCompletion(ctx, client.ChatCompletionRequest{
		Model: "llama-3.1-8b-instant",
		Messages: []client.ChatMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.3,
		MaxTokens:   100,
	})
	if err != nil {
		return originalQuery
	}

	refined := strings.TrimSpace(resp.GetContent())
	if refined == "" {
		return originalQuery
	}
	return refined
}

func (h *DeepResearchHandler) synthesizeReport(ctx context.Context, query string, sources []model.Source, contents []string, groqKey string) (string, error) {
	var sb strings.Builder
	for i, src := range sources {
		if i < len(contents) {
			content := contents[i]
			if len(content) > 1000 {
				content = content[:1000]
			}
			sb.WriteString(fmt.Sprintf("[%d] %s (%s)\n%s\n\n", i+1, src.Title, src.URL, content))
		}
		if i >= 20 {
			break
		}
	}

	prompt := fmt.Sprintf(`You are a deep research analyst. Synthesize a comprehensive research report based on the sources below.

QUERY: %s

SOURCES:
%s

Write a detailed, well-structured report with:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Conclusion

Cite sources using [1], [2], etc. Be factual and comprehensive.`, query, sb.String())

	resp, err := h.groq.ChatCompletion(ctx, client.ChatCompletionRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []client.ChatMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.3,
		MaxTokens:   2000,
	})
	if err != nil {
		return "", err
	}

	return resp.GetContent(), nil
}

func (h *DeepResearchHandler) extractFacts(ctx context.Context, report, groqKey string) []string {
	prompt := fmt.Sprintf(`Extract 5-10 key facts from this research report. Output as a JSON array of strings.

Report:
%s

Output JSON array only, e.g.: ["fact 1", "fact 2", ...]`, report[:min(3000, len(report))])

	resp, err := h.groq.ChatCompletion(ctx, client.ChatCompletionRequest{
		Model: "llama-3.1-8b-instant",
		Messages: []client.ChatMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.1,
		MaxTokens:   500,
	})
	if err != nil {
		return nil
	}

	content := resp.GetContent()
	var facts []string
	if err := json.Unmarshal([]byte(content), &facts); err != nil {
		// Try to find JSON array in response
		start := strings.Index(content, "[")
		end := strings.LastIndex(content, "]")
		if start >= 0 && end > start {
			json.Unmarshal([]byte(content[start:end+1]), &facts)
		}
	}
	return facts
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
