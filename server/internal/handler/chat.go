package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/model"
	"github.com/unforgeapi/server/internal/service"
)

// ChatHandler handles POST /api/v1/chat.
type ChatHandler struct {
	cfg    *config.Config
	unkey  *client.UnkeyClient
	redis  *client.RedisClient
	router *service.RouterService
	logger *service.ActivityLogger
	db     *client.SupabaseClient
}

// NewChatHandler creates a new chat handler.
func NewChatHandler(cfg *config.Config, unkey *client.UnkeyClient, redis *client.RedisClient, router *service.RouterService, logger *service.ActivityLogger, db *client.SupabaseClient) *ChatHandler {
	return &ChatHandler{cfg: cfg, unkey: unkey, redis: redis, router: router, logger: logger, db: db}
}

func (h *ChatHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	start := time.Now()

	// 1. Header authentication (API key)
	token := ""
	if auth := r.Header.Get("Authorization"); auth != "" {
		if len(auth) > 7 && auth[:7] == "Bearer " {
			token = auth[7:]
		}
	}
	if token == "" {
		JSONError(w, http.StatusUnauthorized, "Missing API Key", "MISSING_API_KEY")
		return
	}

	// 2. Unkey verification
	verifyResult, err := h.unkey.VerifyKey(r.Context(), token)
	if err != nil {
		log.Printf("[Chat] Unkey verify error: %v", err)
		JSONError(w, http.StatusInternalServerError, "Key verification failed", "VERIFY_ERROR")
		return
	}

	if !verifyResult.Valid {
		if verifyResult.Code == "RATE_LIMITED" {
			JSONError(w, http.StatusTooManyRequests, "Rate limit exceeded", "RATE_LIMITED")
			return
		}
		code := verifyResult.Code
		if code == "" {
			code = "INVALID_API_KEY"
		}
		JSONError(w, http.StatusUnauthorized, "Invalid API Key", code)
		return
	}

	// 3. Parse request body
	var body model.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid JSON body", "INVALID_JSON")
		return
	}

	if body.Query == "" {
		JSONError(w, http.StatusBadRequest, "Missing required field: query", "INVALID_REQUEST")
		return
	}
	if len(body.Query) > 10000 {
		JSONError(w, http.StatusBadRequest, "Query too long (max 10000 characters)", "QUERY_TOO_LONG")
		return
	}

	// Validate force_intent
	if body.ForceIntent != nil {
		switch *body.ForceIntent {
		case model.IntentChat, model.IntentContext, model.IntentResearch:
			// valid
		default:
			JSONError(w, http.StatusBadRequest, "Invalid force_intent. Must be one of: CHAT, CONTEXT, RESEARCH", "INVALID_FORCE_INTENT")
			return
		}
	}

	// Validate and clamp temperature
	var validTemp *float64
	if body.Temperature != nil {
		t := math.Max(0, math.Min(1, *body.Temperature))
		validTemp = &t
	}

	// Validate and clamp max_tokens
	var validMaxTokens *int
	if body.MaxTokens != nil {
		mt := *body.MaxTokens
		if mt < 50 {
			mt = 50
		}
		if mt > 2000 {
			mt = 2000
		}
		validMaxTokens = &mt
	}

	// System API keys
	groqKey := h.cfg.GroqAPIKey
	tavilyKey := h.cfg.TavilyAPIKey

	if groqKey == "" {
		JSONError(w, http.StatusInternalServerError, "No Groq API key available", "MISSING_LLM_KEY")
		return
	}

	// Get plan from Unkey metadata
	plan := model.ApiPlan("sandbox")
	if verifyResult.Meta != nil {
		if p, ok := verifyResult.Meta["plan"].(string); ok && p != "" {
			plan = model.ApiPlan(p)
		} else if p, ok := verifyResult.Meta["tier"].(string); ok && p != "" {
			plan = model.ApiPlan(p)
		}
	}

	searchEnabled := true
	if verifyResult.Meta != nil {
		if se, ok := verifyResult.Meta["searchEnabled"].(bool); ok {
			searchEnabled = se
		}
	}
	isPriority := model.IsPriorityPlan(plan)

	// Priority queue throttle for free users
	if !isPriority && h.redis != nil {
		loadKey := "system:free_user_load"
		val, _ := h.redis.Get(r.Context(), loadKey)
		currentLoad := 0
		if val != "" {
			currentLoad, _ = strconv.Atoi(val)
		}
		// Increment (simplified - in production use Redis INCR)
		h.redis.Set(r.Context(), loadKey, strconv.Itoa(currentLoad+1), 60*time.Second)

		if currentLoad > 100 {
			JSON(w, http.StatusServiceUnavailable, map[string]interface{}{
				"error":       "System is currently busy. Paid users are prioritized during high traffic.",
				"code":        "SYSTEM_BUSY",
				"hint":        "Please try again in a few seconds, or upgrade to a paid plan for priority access.",
				"retry_after": 5,
				"upgrade_url": "https://www.unforgeapi.com/pricing",
			})
			return
		}
	}

	// 4. Smart routing decision
	var intent model.Intent
	var classification *model.ClassificationResult

	if body.ForceIntent != nil {
		intent = *body.ForceIntent
		classification = &model.ClassificationResult{
			Intent:     *body.ForceIntent,
			Confidence: 1.0,
			Reason:     "User forced intent via force_intent parameter",
		}
	} else if body.Context != "" {
		classification, err = h.router.ClassifyIntent(r.Context(), body.Query, body.Context, groqKey)
		if err != nil {
			log.Printf("[Chat] Classification error: %v", err)
			classification = &model.ClassificationResult{Intent: model.IntentContext, Confidence: 0.6, Reason: "Fallback"}
		}
		// Override: If CHAT but context provided, use CONTEXT
		if classification.Intent == model.IntentChat {
			intent = model.IntentContext
		} else {
			intent = classification.Intent
		}
	} else {
		classification, err = h.router.ClassifyIntent(r.Context(), body.Query, "", groqKey)
		if err != nil {
			log.Printf("[Chat] Classification error: %v", err)
			classification = &model.ClassificationResult{Intent: model.IntentResearch, Confidence: 0.5, Reason: "Fallback"}
		}
		intent = classification.Intent
	}

	// 5. Execution paths
	var answer string
	var sources []model.Source
	var metaConfidence *float64
	var metaGrounded *bool
	var metaCitations []string
	var metaRefusal *model.Refusal
	var rateLimitInfo *model.RatelimitInfo

	switch intent {
	case model.IntentChat:
		answer, _ = h.router.GenerateChat(r.Context(), body.Query, groqKey, body.Context)

	case model.IntentContext:
		if body.Context == "" {
			answer = "No context was provided to answer your question."
		} else {
			opts := &service.GenerationOptions{
				SystemPrompt: body.SystemPrompt,
				Temperature:  validTemp,
				MaxTokens:    validMaxTokens,
				StrictMode:   body.StrictMode,
				GroundedOnly: body.GroundedOnly,
				CitationMode: body.CitationMode,
			}
			if body.History != nil {
				opts.History = body.History
			}

			result, _ := h.router.GenerateFromContext(r.Context(), body.Query, body.Context, groqKey, opts)
			answer = result.Answer
			metaConfidence = &result.ConfidenceScore
			metaGrounded = &result.Grounded
			metaCitations = result.Citations
			metaRefusal = result.Refusal

			// Guardrail: check character break
			if body.SystemPrompt == "" && metaRefusal == nil && service.DidBreakCharacter(answer) {
				retryQuery := fmt.Sprintf("IMPORTANT: The user is interacting with YOUR company's AI assistant. DO NOT say you are \"just an AI\" or a \"language model\". You represent the organization in the context. Now answer naturally as their representative: %s", body.Query)
				retryResult, _ := h.router.GenerateFromContext(r.Context(), retryQuery, body.Context, groqKey, opts)
				answer = retryResult.Answer
				metaConfidence = &retryResult.ConfidenceScore
				metaGrounded = &retryResult.Grounded
				metaCitations = retryResult.Citations
			}
		}

	case model.IntentResearch:
		if !searchEnabled {
			JSONError(w, http.StatusPaymentRequired, "Search has been disabled for this API key.", "SEARCH_DISABLED")
			return
		}

		// Rate limit check for web search
		workspaceID := ""
		if verifyResult.Meta != nil {
			if wid, ok := verifyResult.Meta["workspaceId"].(string); ok {
				workspaceID = wid
			}
		}

		if !model.IsByokExempt(string(plan)) && workspaceID != "" {
			rlResult, _ := h.unkey.CheckFeatureRateLimit(r.Context(), workspaceID, "web_search", plan)
			if rlResult != nil {
				rateLimitInfo = &model.RatelimitInfo{
					Limit:     rlResult.Limit,
					Remaining: rlResult.Remaining,
					Reset:     rlResult.Reset,
				}
				if !rlResult.Success {
					JSON(w, http.StatusTooManyRequests, map[string]interface{}{
						"error":        "Monthly web search limit reached.",
						"code":         "RESEARCH_LIMIT_EXCEEDED",
						"limit":        rlResult.Limit,
						"remaining":    0,
						"reset_at":     rlResult.Reset,
						"upgrade_hint": "Upgrade your plan for more searches.",
					})
					return
				}
			}
		}

		if tavilyKey == "" {
			JSONError(w, http.StatusServiceUnavailable, "Research unavailable - no search API configured", "NO_SEARCH_API")
			return
		}

		searchSources, contents, searchErr := h.router.TavilySearch(r.Context(), body.Query, tavilyKey)
		if searchErr != nil {
			log.Printf("[Chat] Tavily search error: %v", searchErr)
			answer = "I encountered an error while searching for information. Please try again."
		} else {
			answer, _ = h.router.SynthesizeAnswer(r.Context(), body.Query, searchSources, contents, groqKey)
			sources = searchSources
		}

	default:
		answer = "Unable to process your request."
	}

	latencyMs := time.Since(start).Milliseconds()

	// 6. Build response
	defaultTemp := 0.3
	defaultMaxTokens := 600
	if validTemp == nil {
		validTemp = &defaultTemp
	}
	if validMaxTokens == nil {
		validMaxTokens = &defaultMaxTokens
	}

	meta := model.ResponseMeta{
		Intent:          classification.Intent,
		RoutedTo:        intent,
		CostSaving:      intent != model.IntentResearch,
		LatencyMs:       latencyMs,
		IntentForced:    body.ForceIntent != nil,
		TemperatureUsed: validTemp,
		MaxTokensUsed:   validMaxTokens,
	}

	if sources != nil {
		meta.Sources = sources
	}
	if metaConfidence != nil {
		meta.ConfidenceScore = metaConfidence
	}
	if metaGrounded != nil {
		meta.Grounded = metaGrounded
	}
	if len(metaCitations) > 0 {
		meta.Citations = metaCitations
	}
	if metaRefusal != nil {
		meta.Refusal = metaRefusal
	}

	// Log usage (fire-and-forget)
	if verifyResult.Meta != nil {
		wid, _ := verifyResult.Meta["workspaceId"].(string)
		if wid != "" && verifyResult.KeyID != "" {
			go h.logUsage(wid, verifyResult.KeyID, string(intent), latencyMs, body.Query)
		}
	}

	// Rate limit headers
	headers := map[string]string{}
	if rateLimitInfo != nil {
		headers["X-RateLimit-Limit"] = strconv.Itoa(rateLimitInfo.Limit)
		headers["X-RateLimit-Remaining"] = strconv.Itoa(rateLimitInfo.Remaining)
		headers["X-RateLimit-Reset"] = strconv.FormatInt(rateLimitInfo.Reset/1000, 10)
	} else if verifyResult.Ratelimit != nil {
		headers["X-RateLimit-Limit"] = strconv.Itoa(verifyResult.Ratelimit.Limit)
		headers["X-RateLimit-Remaining"] = strconv.Itoa(verifyResult.Ratelimit.Remaining)
		headers["X-RateLimit-Reset"] = strconv.FormatInt(verifyResult.Ratelimit.Reset/1000, 10)
	}

	resp := map[string]interface{}{
		"answer": answer,
		"meta":   meta,
	}

	JSONWithHeaders(w, http.StatusOK, resp, headers)
}

func (h *ChatHandler) logUsage(workspaceID, keyID, intent string, latencyMs int64, query string) {
	if h.db == nil {
		return
	}

	preview := query
	if len(preview) > 100 {
		preview = preview[:100]
	}

	payload := map[string]interface{}{
		"workspace_id":  workspaceID,
		"key_id":        keyID,
		"intent":        intent,
		"latency_ms":    latencyMs,
		"query_preview": preview,
	}
	ctx := context.Background()
	h.db.Insert(ctx, "api_usage", payload)

	// Update last_used_at
	h.db.Update(ctx, "api_keys", "unkey_id=eq."+keyID, map[string]interface{}{
		"last_used_at": time.Now().UTC().Format(time.RFC3339),
	})
}
