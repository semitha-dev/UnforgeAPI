package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/unforgeapi/server/internal/client"
	"github.com/unforgeapi/server/internal/config"
	"github.com/unforgeapi/server/internal/middleware"
)

// AnalyticsHandler handles GET /api/analytics.
type AnalyticsHandler struct {
	cfg *config.Config
	db  *client.SupabaseClient
}

func NewAnalyticsHandler(cfg *config.Config, db *client.SupabaseClient) *AnalyticsHandler {
	return &AnalyticsHandler{cfg: cfg, db: db}
}

func (h *AnalyticsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		JSONError(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		JSONError(w, http.StatusUnauthorized, "Unauthorized", "UNAUTHORIZED")
		return
	}

	// Get user's workspace
	profData, err := h.db.SelectOne(r.Context(), "profiles", "select=workspace_id&id=eq."+userID, "")
	if err != nil {
		JSONError(w, http.StatusInternalServerError, "Failed to fetch profile", "INTERNAL_ERROR")
		return
	}

	var prof struct {
		WorkspaceID *string `json:"workspace_id"`
	}
	json.Unmarshal(profData, &prof)

	if prof.WorkspaceID == nil || *prof.WorkspaceID == "" {
		JSON(w, http.StatusOK, map[string]interface{}{
			"total_requests":  0,
			"usage_by_intent": map[string]int{},
			"daily_usage":     []interface{}{},
		})
		return
	}

	// Fetch usage data
	usageData, err := h.db.SelectMany(r.Context(), "api_usage",
		"select=intent,created_at,latency_ms&workspace_id=eq."+*prof.WorkspaceID+"&order=created_at.desc&limit=1000", "")
	if err != nil {
		log.Printf("[Analytics] Error fetching usage: %v", err)
		JSONError(w, http.StatusInternalServerError, "Failed to fetch analytics", "INTERNAL_ERROR")
		return
	}

	var usageRows []struct {
		Intent    string `json:"intent"`
		CreatedAt string `json:"created_at"`
		LatencyMs int    `json:"latency_ms"`
	}
	json.Unmarshal(usageData, &usageRows)

	// Aggregate
	intentCounts := map[string]int{}
	totalLatency := 0
	for _, row := range usageRows {
		intentCounts[row.Intent]++
		totalLatency += row.LatencyMs
	}

	avgLatency := 0
	if len(usageRows) > 0 {
		avgLatency = totalLatency / len(usageRows)
	}

	JSON(w, http.StatusOK, map[string]interface{}{
		"total_requests":     len(usageRows),
		"usage_by_intent":   intentCounts,
		"average_latency_ms": avgLatency,
	})
}
